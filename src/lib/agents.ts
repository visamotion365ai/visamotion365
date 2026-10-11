import type { DB, Applicant, AgentRun, BrowserSession, ApprovalRequest, Session } from "./schema";
import { getDb, mutate } from "./db";
import { randomId } from "./crypto";
import { logAudit } from "./audit";
import { hasPerm } from "./policy";
import { runCompliance, consistencyCheck, docsFor } from "./compliance";
import { parseMrz } from "./mrz";
import { maskPassport } from "./mrz";
import { COUNTRY_WORKFLOWS } from "./workflow";
export { isSimulated } from "./browser-use";
import { ago, dt } from "./format";

// ---------------- Per-agent "Base44" processing (dry-run safe) ----------------
// In production these call Base44 AI REST slots (BASE44_SLOT_01..10) server-side.
// Here each returns a deterministic, validated result — never irreversible actions.

function agentOutput(db: DB, agentId: string, app: Applicant | undefined, task: string): any {
  const name = app ? `${app.first_name} ${app.last_name}` : "N/A";
  switch (agentId) {
    case "ag_01": {
      const leads = db.leads.filter((l) => l.tenant_id === db.applicants.find((a) => a.id === app?.id)?.tenant_id || true);
      const tenantLeads = app ? db.leads.filter((l) => l.tenant_id === app.tenant_id) : [];
      const dedupe = new Set<string>();
      const unique = tenantLeads.filter((l) => {
        const k = (l.phone || l.email || l.name).toLowerCase();
        if (dedupe.has(k)) return false;
        dedupe.add(k);
        return true;
      });
      return {
        leads_processed: tenantLeads.length,
        duplicates_removed: tenantLeads.length - unique.length,
        active_leads: unique.filter((l) => l.status !== "CONVERTED").map((l) => ({ name: l.name, score: l.score, country: l.country, purpose: l.purpose, status: l.status })),
        followups_drafted: unique.filter((l) => l.status === "NEW").length,
        next_step: "Human reviews follow-up drafts before any outreach is sent.",
        dry_run: true
      };
    }
    case "ag_02": {
      if (!app?.passport_data) return { error: "No passport captured for this applicant.", dry_run: true };
      const p = app.passport_data;
      const parsed = parseMrz(p.mrz);
      return {
        engine: "MRZ parser (real) + demo image OCR",
        confidence: p.ocr_confidence,
        mrz_valid: parsed.ok,
        checksum_errors: parsed.errors,
        fields: {
          surname: p.surname, given: p.given,
          passport_number: maskPassport(p.passport_number),
          dob: p.dob, sex: p.sex, expiry: p.expiry
        },
        quality: { brightness: "ok", skew: "0.3°", corners_detected: 4 },
        expiry_ok: new Date(p.expiry) > new Date(Date.now() + 180 * 86400000),
        needs_confirmation: !p.verified,
        dry_run: true
      };
    }
    case "ag_03": {
      if (!app) return { error: "Applicant required.", dry_run: true };
      const report = runCompliance(db, app);
      const nextVersion = bumpVersion(app.dossier_version);
      return {
        compliance_score: report.score,
        matrix: report.rows.map((r) => ({ doc: r.requirement, required: r.required, status: r.status })),
        missing: report.missing,
        warnings: report.warnings,
        dossier_version: nextVersion,
        qr_vault: "authenticated vault link (15-min expiry) — generated on demand",
        next_step: report.missing.length ? "Collect missing documents, then request Master approval." : "Request Master dossier approval.",
        dry_run: true
      };
    }
    case "ag_04": {
      if (!app) return { error: "Applicant required.", dry_run: true };
      const c = consistencyCheck(db, app);
      return { checks: c.checks, consistency_score: c.score, note: "Review flags only — no financial authenticity is certified.", dry_run: true };
    }
    case "ag_05": {
      if (!app) return { error: "Applicant required.", dry_run: true };
      const country = app.target_country;
      const purpose = db.visa_programs.find((p) => p.id === app.visa_program_id)?.category || "VISA";
      const sop =
`STATEMENT OF PURPOSE (DRAFT — for factual review)
Applicant: ${name} (Passport ${app.passport_data ? maskPassport(app.passport_data.passport_number) : "—"})
Purpose: ${purpose} — ${country}
I, ${name}, am applying for a ${purpose.toLowerCase()} visa to ${country}. [Draft: state purpose of travel, duration, funding source, employment/study status and intent to return. All facts must be verified against uploaded documents before use.]`;
      return {
        sop_draft: sop,
        cover_letter_draft: `To the Visa Officer,\n\nI am writing in support of the ${purpose.toLowerCase()} visa application of ${name}. [Draft — verify employer/institution and dates before sending.]\n\n[AGENCY LETTERHEAD]`,
        itinerary: COUNTRY_WORKFLOWS[country]?.map((s, i) => `${i + 1}. ${s.title} (${s.actor}, ${s.eta})`).join("\n") || "Standard timeline applies.",
        contradictions: [],
        disclaimer: "Drafts only. No dummy reservations created. Human + applicant factual review is mandatory before use.",
        dry_run: true
      };
    }
    case "ag_06": {
      if (!app) return { error: "Applicant required.", dry_run: true };
      const program = db.visa_programs.find((p) => p.id === app.visa_program_id);
      const formName =
        program?.category === "STUDENT" ? "IMMI Online — Student Application (draft)" :
        program?.category === "WORK_PERMIT" || program?.category === "MANPOWER" ? "Work e-Visa Form (draft)" :
        program?.category === "EMPLOYMENT" ? "Employment Pass Application (draft)" :
        program?.category === "BUSINESS" ? "Business e-Visa Form (draft)" : "Visit e-Visa Form (draft)";
      const p = app.passport_data;
      const fields = [
        { field: "Full name", value: name, source: "passport OCR", status: "FILLED" },
        { field: "Passport number", value: p ? maskPassport(p.passport_number) : "—", source: "passport OCR", status: p ? "FILLED" : "MISSING" },
        { field: "Date of birth", value: app.date_of_birth || "—", source: "profile", status: app.date_of_birth ? "FILLED" : "MISSING" },
        { field: "Nationality", value: app.nationality, source: "profile", status: "FILLED" },
        { field: "Passport expiry", value: p?.expiry || app.passport_expiry || "—", source: "passport OCR", status: p || app.passport_expiry ? "FILLED" : "MISSING" },
        { field: "Purpose of travel", value: program?.name || "—", source: "visa program", status: "FILLED" },
        { field: "Address", value: "On file (address block)", source: "profile", status: "FILLED" },
        { field: "Funding source", value: "Bank statement on file", source: "documents", status: docsFor(db, app.id).some((d) => d.document_type === "BANK_STATEMENT") ? "FILLED" : "MISSING" },
        { field: "Employer / institution", value: "Per certificate on file", source: "documents", status: "DRAFT" },
        { field: "Emergency contact", value: "—", source: "—", status: "MISSING" }
      ];
      const missing = fields.filter((f) => f.status !== "FILLED").map((f) => f.field);
      return {
        form: formName,
        draft_only: true,
        fields,
        missing_fields: missing,
        screenshot: "form_draft_p1.png (simulated capture)",
        paused_at: "OTP / MFA / payment / legal declaration / final submission — STOPPING for human approval",
        approval_required: true,
        dry_run: true
      };
    }
    case "ag_07": {
      const slots = [7, 9, 12].map((d, i) => ({
        date: new Date(Date.now() + d * 86400000).toISOString().slice(0, 10),
        time: ["09:00", "10:30", "14:30"][i],
        status: "AVAILABLE (simulated scan)"
      }));
      return {
        portal: "Official appointment portal (approved allow-list only)",
        slots_found: slots,
        evidence: "date/time screenshot saved to private storage (simulated)",
        action: "No booking performed. Booking requires explicit human approval + CAPTCHA-safe handling.",
        dry_run: true
      };
    }
    case "ag_08": {
      const stage = app?.application_stage || "INTAKE_STARTED";
      const map: Record<string, { status: string; normalized: string }> = {
        LODGED: { status: "PROCESSING", normalized: "Application under processing (demo normalized status)" },
        UNDER_REVIEW: { status: "UNDER_REVIEW", normalized: "Embassy review (demo)" },
        VISA_ISSUED: { status: "APPROVED", normalized: "Visa issued (demo)" },
        DEFAULT: { status: "NOT_YET_LODGED", normalized: "No lodgement reference to track yet" }
      };
      const s = map[stage] || map.DEFAULT;
      return {
        reference: app ? `${app.id.toUpperCase()}-REF (demo)` : null,
        status: s.status,
        normalized: s.normalized,
        additional_document_request: false,
        delay_alert: false,
        next_check_in: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        note: "AI interpretation only — not an official decision. Verify externally before communicating with the applicant.",
        dry_run: true
      };
    }
    case "ag_09": {
      const purpose = db.visa_programs.find((p) => p.id === app?.visa_program_id)?.category || "TOURIST";
      const qs =
        purpose === "STUDENT" ? [
          { q_en: "Why did you choose this course and this institution?", q_bn: "আপনি এই কোর্স ও প্রতিষ্ঠানটি কেন বেছে নিয়েছেন?", tip: "Ground in CoE, fees, curriculum — no memorized answers." },
          { q_en: "How will you fund your studies and living costs?", q_bn: "পড়াশোনা ও খরচের ব্যবস্থা কীভাবে করবেন?", tip: "Match sponsor bank statement exactly." },
          { q_en: "What are your plans after graduation?", q_bn: "অধ্যয়ন শেষে কী পরিকল্পনা আছে?", tip: "Credible return/next-step plan." },
          { q_en: "Who in your family remains in Bangladesh?", q_bn: "পরিবারের কে কে বাংলাদেশে আছেন?", tip: "Consistent with profile." }
        ] : purpose === "WORK_PERMIT" || purpose === "EMPLOYMENT" || purpose === "MANPOWER" ? [
          { q_en: "Describe your role and the employer's business.", q_bn: "আপনার চাকরির দায়িত্ব ও নিয়োগকারীর ব্যবসা বর্ণনা করুন।", tip: "Match contract and employer profile." },
          { q_en: "What experience do you have for this position?", q_bn: "এই পদে আপনার কোন অভিজ্ঞতা আছে?", tip: "Cite certificates on file." },
          { q_en: "What are the salary and working conditions?", q_bn: "বেতন ও কর্মসংস্থানের শর্তাবলী কী?", tip: "Must match contract exactly." },
          { q_en: "How long is the visa validity and what happens after it ends?", q_bn: "ভিসার মেয়াদ কত দিন, শেষে কী হবে?", tip: "Know the return obligation." }
        ] : [
          { q_en: "What is the purpose of your visit and for how long?", q_bn: "যাত্রার উদ্দেশ্য ও মেয়াদ কত?", tip: "Match itinerary and bookings." },
          { q_en: "How will you fund this trip?", q_bn: "যাত্রার খরচের ব্যবস্থা কীভাবে?", tip: "Cite bank statement balance and income source." },
          { q_en: "What ties do you have to return to Bangladesh?", q_bn: "বাংলাদেশে ফিরে আসার কোন দায়িত্ব আছে?", tip: "Job, family, property — consistent with documents." },
          { q_en: "Have you ever been refused a visa before?", q_bn: "আগে কখনো ভিসা প্রত্যাখ্যাত হয়েছে কি?", tip: "Answer exactly as declared in the form." }
        ];
      return { questions: qs, contradictions_detected: 0, practice_mode: "Bengali + English", warning: "Practice only — never coach a fabricated answer.", dry_run: true };
    }
    case "ag_10": {
      const tenantId = app?.tenant_id || db.tenants[0]?.id;
      const invs = db.invoices.filter((i) => i.tenant_id === tenantId);
      const pays = db.payments.filter((p) => p.tenant_id === tenantId);
      const dup = findsDuplicatePayments(pays);
      const jobs = db.job_orders.filter((j) => j.tenant_id === tenantId);
      const comm = jobs.reduce((a, j) => ({ expected: a.expected + j.fee_per_worker * j.count * (j.commission_rate / 100) }), { expected: 0 });
      return {
        invoices_total: invs.length,
        revenue_collected: pays.filter((p) => p.status === "PAID").reduce((a, p) => a + p.amount, 0),
        outstanding: invs.filter((i) => i.status === "SENT").reduce((a, i) => a + i.total - (pays.filter((p) => p.invoice_id === i.id && p.status === "PAID").reduce((x, p) => x + p.amount, 0)), 0),
        duplicate_payments: dup,
        commission_expected_usd: Math.round(comm.expected),
        marketing_roi: db.campaigns.filter((c) => c.tenant_id === tenantId).map((c) => ({ campaign: c.name, spend: c.spend, leads: c.leads, cpl: c.leads ? Math.round(c.spend / c.leads) : null })),
        note: "Draft/reconciliation only. No transfer, refund or final payment initiated.",
        dry_run: true
      };
    }
    default:
      return { note: "No handler for agent", dry_run: true };
  }
}

function findsDuplicatePayments(pays: { amount: number; invoice_id: string; created_at: string; id: string }[]): string[] {
  const seen = new Map<string, string>();
  const dups: string[] = [];
  for (const p of pays) {
    const k = `${p.invoice_id}:${p.amount}`;
    const prev = seen.get(k);
    if (prev && Math.abs(new Date(p.created_at).getTime() - new Date(prev).getTime()) < 2 * 3600000) dups.push(p.id);
    else seen.set(k, p.created_at);
  }
  return dups;
}

function bumpVersion(v?: string): string {
  if (!v) return "v1.0.0";
  const m = v.match(/^v(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return "v1.0.0";
  return `v${m[1]}.${m[2]}.${Number(m[3]) + 1}`;
}

// ---------------- Orchestrator ----------------
export interface RunResult { runId: string; approvalId?: string; error?: string }

export function startAgentRun(
  s: Session,
  args: { agentCode: string; tenantId: string; applicantId?: string; taskType?: string; input?: any }
): RunResult {
  let result: RunResult = { runId: "", error: "" };
  mutate((db) => {
    const agent = db.ai_agents.find((a) => a.agent_code === args.agentCode);
    if (!agent) throw new Error("Unknown agent code");
    if (!hasPerm(s, "run.execute")) throw new Error("Forbidden: run.execute permission required");
    if (s.role !== "SUPER_ADMIN" && s.tenant_id !== args.tenantId) throw new Error("Forbidden: tenant scope mismatch");
    if (db.settings.hard_pause && agent.requires_human_approval) throw new Error("System hard-pause is ON — approval-required agents are suspended.");

    const today = new Date().toISOString().slice(0, 10);
    const todayCount = db.agent_runs.filter((r) => r.agent_id === agent.id && r.created_at.slice(0, 10) === today).length;
    if (todayCount >= agent.daily_limit) throw new Error(`Daily limit reached for ${agent.name} (${agent.daily_limit}).`);

    const production = db.settings.production_agents[agent.id] === true;
    if (!db.settings.dry_run && !production) throw new Error(`Agent ${agent.name} is not enabled for production. Enable it in Agent Control Center.`);

    const app = args.applicantId ? db.applicants.find((a) => a.id === args.applicantId && a.tenant_id === args.tenantId) : undefined;
    if (args.applicantId && !app) throw new Error("Applicant not found in tenant scope.");

    const output = agentOutput(db, agent.id, app, args.taskType || "MANUAL");
    const needsApproval =
      agent.requires_human_approval &&
      ["ag_06", "ag_07", "ag_10", "ag_03"].includes(agent.id) &&
      (agent.id !== "ag_03" || output?.missing?.length === 0);

    const runId = randomId("run");
    const now = new Date().toISOString();
    const approvalId = needsApproval ? randomId("ap") : undefined;
    if (approvalId) {
      const approval: ApprovalRequest = {
        id: approvalId, tenant_id: args.tenantId, applicant_id: app?.id,
        agent_run_id: runId, agent_code: agent.agent_code,
        action_type: agent.id === "ag_06" ? "FINAL_SUBMIT" : agent.id === "ag_07" ? "APPOINTMENT_BOOKING" : agent.id === "ag_10" ? "BILLING_ACTION" : "DOSSIER_APPROVE",
        action_payload: { ...output, requested_via: "orchestrator", risks: output?.approval_required ? ["Irreversible or high-impact action"] : ["Review before proceeding"], confidence: output?.confidence ?? 0.85 },
        requested_by: s.uid, status: "PENDING",
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), created_at: now
      };
      db.approval_requests.unshift(approval);
    }
    const run: AgentRun = {
      id: runId, agent_id: agent.id, slot_id: db.agent_slots.find((sl) => sl.agent_id === agent.id && sl.provider === "BASE44")?.id,
      tenant_id: args.tenantId, applicant_id: app?.id, task_type: args.taskType || "MANUAL",
      input_payload: args.input || {}, output_payload: output,
      status: needsApproval ? "WAITING_FOR_APPROVAL" : "COMPLETED",
      retry_count: 0, needs_approval: needsApproval, approval_id: approvalId,
      started_at: now, completed_at: needsApproval ? undefined : now, created_at: now
    };
    db.agent_runs.unshift(run);
    if (["ag_06", "ag_07"].includes(agent.id)) {
      const bs: BrowserSession = {
        id: randomId("bs"), agent_run_id: runId, tenant_id: args.tenantId,
        external_session_id: "bsc_" + randomId("").slice(3), status: needsApproval ? "WAITING_FOR_APPROVAL" : "COMPLETED",
        simulated: !process.env.BROWSER_USE_API_KEY, minutes: 2, started_at: now, stopped_at: needsApproval ? undefined : now
      };
      db.browser_sessions.unshift(bs);
    }
    if (agent.id === "ag_03" && app && output) {
      app.dossier_version = output.dossier_version;
    }
    logAudit(db, { actor_user_id: s.uid, actor_type: "USER", tenant_id: args.tenantId, action: "AGENT.RUN", resource_type: "agent_run", resource_id: runId, metadata: { agent: agent.agent_code, task: run.task_type, approval: needsApproval, dry_run: db.settings.dry_run } });
    if (needsApproval) {
      db.notifications.unshift({ id: randomId("n"), tenant_id: null, user_id: "u_super", applicant_id: app?.id, type: "APPROVAL_NEEDED", title: `Approval needed: ${approvalId}`, body: `${agent.name} — ${args.taskType || "task"} requires human approval before proceeding.`, read: false, created_at: now });
    }
    result = { runId, approvalId };
  });
  return result;
}

/** Advance time-based states (called on read; deterministic). */
export function advanceDb(db: DB): boolean {
  let dirty = false;
  const now = Date.now();
  for (const run of db.agent_runs) {
    const age = now - new Date(run.created_at).getTime();
    if (run.status === "QUEUED" && age > 3000) { run.status = "RUNNING"; run.started_at = new Date().toISOString(); dirty = true; }
    if (run.status === "RUNNING" && age > 8000) {
      run.status = "COMPLETED"; run.completed_at = new Date().toISOString(); dirty = true;
      const bs = db.browser_sessions.find((b) => b.agent_run_id === run.id && !["STOPPED", "COMPLETED"].includes(b.status));
      if (bs) { bs.status = "COMPLETED"; bs.stopped_at = new Date().toISOString(); bs.minutes += 1; dirty = true; }
    }
  }
  for (const bs of db.browser_sessions) {
    if (bs.status === "CREATED" && now - new Date(bs.started_at).getTime() > 2000) { bs.status = "RUNNING"; dirty = true; }
  }
  for (const ap of db.approval_requests) {
    if (ap.status === "PENDING" && new Date(ap.expires_at).getTime() < now) {
      ap.status = "EXPIRED";
      const run = db.agent_runs.find((r) => r.id === ap.agent_run_id);
      if (run && run.status === "WAITING_FOR_APPROVAL") { run.status = "CANCELLED"; run.completed_at = new Date().toISOString(); run.error_message = "Approval window expired (fail closed)."; }
      const bs = run ? db.browser_sessions.find((b) => b.agent_run_id === run.id && !["STOPPED", "COMPLETED"].includes(b.status)) : undefined;
      if (bs) { bs.status = "STOPPED"; bs.stopped_at = new Date().toISOString(); }
      dirty = true;
    }
  }
  if (dirty) { /* caller persists via getDb cache write */ }
  return dirty;
}

export function liveDb(): DB {
  const db = getDb();
  if (advanceDb(db)) mutate(() => {}); // persist transitions
  return db;
}

export function usageSummary(db: DB) {
  const perAgent = db.ai_agents.map((a) => {
    const runs = db.agent_runs.filter((r) => r.agent_id === a.id);
    const today = runs.filter((r) => r.created_at.slice(0, 10) === new Date().toISOString().slice(0, 10)).length;
    return { agent: a, today, total: runs.length, completed: runs.filter((r) => r.status === "COMPLETED").length, failed: runs.filter((r) => r.status === "FAILED").length };
  });
  const minutes = db.browser_sessions.reduce((a, b) => a + b.minutes, 0);
  const costEstimate = Math.round(minutes * 10) / 100; // demo rate ≈ $0.10/min
  return { perAgent, minutes, costEstimate, budget: db.settings.monthly_budget_usd, hardPause: db.settings.hard_pause };
}

export function agentById(db: DB, id: string) {
  return db.ai_agents.find((a) => a.id === id || a.agent_code === id);
}
