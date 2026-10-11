import type { DB, Session, Applicant, Role } from "./schema";
import { getDb, mutate } from "./db";
import { randomId, encryptText, decryptText, sha256, signToken, verifyToken, approvalSecret, otp6 } from "./crypto";
import { logAudit } from "./audit";
import { hasPerm, canAccessTenant, canAccessApplicant } from "./policy";
import { startAgentRun } from "./agents";
import { runCompliance } from "./compliance";
import { autoReply } from "./inbox";
import { invoiceBalance, invoicePaid } from "./billing";
import { createVaultToken } from "./vault";
import { buildTd3, parseMrz, maskPassport } from "./mrz";

export { startAgentRun as startAgentRunSafe } from "./agents";

class AppError extends Error {
  code: string;
  constructor(code: string, message: string) { super(message); this.code = code; }
}

function loadApplicant(s: Session, id: string): Applicant {
  const db = getDb();
  const app = db.applicants.find((a) => a.id === id);
  if (!app) throw new AppError("NOT_FOUND", "Applicant not found.");
  if (!canAccessApplicant(s, app)) throw new AppError("FORBIDDEN", "Tenant isolation: you do not have access to this applicant.");
  return app;
}

// ---------------- Applicants ----------------
export function listApplicants(s: Session, tenantFilter?: string): Applicant[] {
  const db = getDb();
  if (s.role === "SUPER_ADMIN") {
    return db.applicants.filter((a) => !tenantFilter || a.tenant_id === tenantFilter);
  }
  if (!hasPerm(s, "applicant.read")) throw new AppError("FORBIDDEN", "Permission denied: applicant.read");
  return db.applicants.filter((a) => a.tenant_id === s.tenant_id);
}

export function createApplicant(s: Session, f: { first_name: string; last_name: string; nationality: string; date_of_birth?: string; gender?: string; target_country: string; visa_program_id: string }): string {
  if (!hasPerm(s, "applicant.create")) throw new AppError("FORBIDDEN", "Permission denied: applicant.create");
  return mutate((db) => {
    const tenantId = s.role === "SUPER_ADMIN" ? f.visa_program_id ? db.visa_programs.find((p) => p.id === f.visa_program_id)?.tenant_id || db.tenants[0].id : db.tenants[0].id : s.tenant_id!;
    const program = db.visa_programs.find((p) => p.id === f.visa_program_id);
    if (!program) throw new AppError("NOT_FOUND", "Visa program not found");
    if (!canAccessTenant(s, program.tenant_id!)) throw new AppError("FORBIDDEN", "Tenant isolation: program belongs to another tenant");
    const id = randomId("app");
    const now = new Date().toISOString();
    db.applicants.unshift({
      id, tenant_id: program.tenant_id!, first_name: f.first_name.trim(), last_name: f.last_name.trim(),
      nationality: f.nationality || "Bangladesh", date_of_birth: f.date_of_birth, gender: f.gender,
      target_country: program.country_id ? db.countries.find((c) => c.id === program.country_id)?.name || f.target_country : f.target_country,
      visa_program_id: program.id, application_stage: "INTAKE_STARTED", status: "ACTIVE",
      created_at: now, updated_at: now
    });
    logAudit(db, { actor_user_id: s.uid, actor_type: "USER", tenant_id: program.tenant_id, action: "APPLICANT.CREATED", resource_type: "applicant", resource_id: id, metadata: { name: `${f.first_name} ${f.last_name}`, country: program.country_id } });
    return id;
  });
}

export function updateStage(s: Session, applicantId: string, stage: Applicant["application_stage"], note?: string) {
  if (!hasPerm(s, "application.update")) throw new AppError("FORBIDDEN", "Permission denied: application.update");
  mutate((db) => {
    const app = db.applicants.find((a) => a.id === applicantId);
    if (!app || !canAccessTenant(s, app.tenant_id)) throw new AppError("FORBIDDEN", "Tenant isolation");
    app.application_stage = stage;
    if (note) app.feedback_note = note;
    app.updated_at = new Date().toISOString();
    logAudit(db, { actor_user_id: s.uid, actor_type: "USER", tenant_id: app.tenant_id, action: "STAGE.CHANGED", resource_type: "applicant", resource_id: app.id, metadata: { stage } });
  });
}

// ---------------- Passport / OCR ----------------
export interface OcrResult {
  surname: string; given: string; passport_number: string; nationality: string;
  dob: string; sex: string; expiry: string; mrz: string[]; confidence: number;
  checksums_ok: boolean; errors: string[];
}

export function runPassportOcr(input: { fileHash?: string; demo?: boolean }): OcrResult {
  // Demo OCR engine: deterministic synthetic extraction.
  // Production path: Tesseract.js image OCR -> MRZ parser (parseMrz, real checksums).
  const seed = input.fileHash || "demo-passport-001";
  const h = parseInt(sha256(seed).slice(0, 6), 16);
  const templates = [
    { surname: "HOSSAIN", given: "KARIM", number8: "BD482913", dob: "880612", sex: "M", expiry: "301104", personal: "880612M99BD1" },
    { surname: "AKTER", given: "FARHANA", number8: "BD771209", dob: "000223", sex: "F", expiry: "280519", personal: "000223F99BD2" },
    { surname: "UDDIN", given: "JASHIM", number8: "BD335617", dob: "950930", sex: "M", expiry: "271201", personal: "950930M99BD3" },
    { surname: "MIA", given: "SUMON", number8: "BD902145", dob: "970108", sex: "M", expiry: "290322", personal: "970108M99BD4" }
  ];
  const f = templates[h % templates.length];
  const mrz = buildTd3(f);
  const parsed = parseMrz([mrz.line1, mrz.line2, mrz.line3]);
  return {
    surname: f.surname, given: f.given,
    passport_number: mrz.line2.slice(0, 9),
    nationality: "Bangladesh",
    dob: `20${f.dob.slice(0, 2)}-${f.dob.slice(2, 4)}-${f.dob.slice(4, 6)}`,
    sex: f.sex,
    expiry: `20${f.expiry.slice(0, 2)}-${f.expiry.slice(2, 4)}-${f.expiry.slice(4, 6)}`,
    mrz: [mrz.line1, mrz.line2, mrz.line3],
    confidence: 0.88 + (h % 90) / 1000,
    checksums_ok: parsed.ok,
    errors: parsed.errors
  };
}
export function capturePassport(s: Session, applicantId: string, ocr: OcrResult, filePath?: string, fileName?: string) {
  const db = getDb();
  const app = loadApplicant(s, applicantId);
  if (s.role === "APPLICANT" && s.applicant_id !== app.id) throw new AppError("FORBIDDEN", "Not your applicant record");
  if (s.role !== "APPLICANT" && !hasPerm(s, "document.upload")) throw new AppError("FORBIDDEN", "Permission denied: document.upload");
  mutate((d) => {
    const now = new Date().toISOString();
    app.passport_data = {
      ...ocr,
      ocr_engine: "demo-ocr-v1 + real MRZ parser",
      verified: false, confirmed_by_applicant: false, captured_at: now
    };
    app.passport_number_encrypted = encryptText(ocr.passport_number);
    app.passport_number_hash = sha256(ocr.passport_number);
    app.passport_expiry = ocr.expiry;
    if (!app.date_of_birth) app.date_of_birth = ocr.dob;
    if (!app.gender) app.gender = ocr.sex;
    app.application_stage = app.application_stage === "INTAKE_STARTED" ? "PASSPORT_CAPTURED" : app.application_stage;
    app.updated_at = now;
    const existing = d.client_documents.find((x) => x.applicant_id === app.id && x.document_type === "PASSPORT");
    if (existing) {
      existing.verification_status = "OCR_PROCESSING";
      existing.storage_path = filePath || existing.storage_path;
      existing.file_name = fileName || existing.file_name;
      existing.version += 1;
      existing.uploaded_at = now;
    } else {
      d.client_documents.unshift({
        id: randomId("doc"), tenant_id: app.tenant_id, applicant_id: app.id, document_type: "PASSPORT",
        storage_path: filePath, file_name: fileName, verification_status: "OCR_PROCESSING",
        extracted_data: { name: `${ocr.surname} ${ocr.given}`, number: ocr.passport_number, dob: ocr.dob, expiry: ocr.expiry },
        version: 1, uploaded_by: s.uid, uploaded_at: now
      });
    }
    d.notifications.unshift({ id: randomId("n"), tenant_id: app.tenant_id, user_id: null, applicant_id: app.id, type: "OCR_READY", title: "Passport OCR ready", body: `${app.first_name} ${app.last_name}: extracted data ready for review. Please confirm the fields.`, read: false, created_at: now });
    logAudit(d, { actor_user_id: s.uid, actor_type: "USER", tenant_id: app.tenant_id, action: "PASSPORT.CAPTURED", resource_type: "applicant", resource_id: app.id, metadata: { number_masked: maskPassport(ocr.passport_number), checksums_ok: ocr.checksums_ok } });
  });
}

export function confirmPassportData(s: Session, applicantId: string, fields: { surname: string; given: string; passport_number: string; dob: string; sex: string; expiry: string }) {
  const db = getDb();
  const app = loadApplicant(s, applicantId);
  if (s.role === "APPLICANT" && s.applicant_id !== app.id) throw new AppError("FORBIDDEN", "Not your applicant record");
  if (s.role !== "APPLICANT" && !hasPerm(s, "document.verify")) throw new AppError("FORBIDDEN", "Permission denied: document.verify");
  mutate((d) => {
    const pd = app.passport_data;
    if (!pd) throw new AppError("NOT_FOUND", "No passport data to confirm");
    Object.assign(pd, fields);
    pd.confirmed_by_applicant = s.role === "APPLICANT" ? true : pd.confirmed_by_applicant;
    app.passport_number_encrypted = encryptText(fields.passport_number);
    app.passport_number_hash = sha256(fields.passport_number);
    app.passport_expiry = fields.expiry;
    app.first_name = fields.given.split(" ")[0] || app.first_name;
    app.last_name = fields.surname || app.last_name;
    app.date_of_birth = fields.dob || app.date_of_birth;
    app.updated_at = new Date().toISOString();
    const doc = d.client_documents.find((x) => x.applicant_id === app.id && x.document_type === "PASSPORT");
    if (doc) { doc.verification_status = "PENDING_REVIEW"; doc.extracted_data = { name: `${fields.given} ${fields.surname}`, number: fields.passport_number, dob: fields.dob, expiry: fields.expiry }; }
    logAudit(d, { actor_user_id: s.uid, actor_type: "USER", tenant_id: app.tenant_id, action: "PASSPORT.CONFIRMED", resource_type: "applicant", resource_id: app.id, metadata: { by: s.role } });
  });
}

export function verifyPassport(s: Session, applicantId: string) {
  if (!hasPerm(s, "document.verify")) throw new AppError("FORBIDDEN", "Permission denied: document.verify");
  mutate((d) => {
    const app = d.applicants.find((a) => a.id === applicantId);
    if (!app || !canAccessTenant(s, app.tenant_id)) throw new AppError("FORBIDDEN", "Tenant isolation");
    if (!app.passport_data) throw new AppError("NOT_FOUND", "No passport data");
    app.passport_data.verified = true;
    app.updated_at = new Date().toISOString();
    const doc = d.client_documents.find((x) => x.applicant_id === app.id && x.document_type === "PASSPORT");
    if (doc) doc.verification_status = "VERIFIED";
    d.notifications.unshift({ id: randomId("n"), tenant_id: app.tenant_id, user_id: null, applicant_id: app.id, type: "DOC_VERIFIED", title: "Passport verified", body: `Passport for ${app.first_name} ${app.last_name} is now verified.`, read: false, created_at: new Date().toISOString() });
    logAudit(d, { actor_user_id: s.uid, actor_type: "USER", tenant_id: app.tenant_id, action: "PASSPORT.VERIFIED", resource_type: "applicant", resource_id: app.id });
  });
}

export function getPassportDecrypted(applicantId: string, s: Session): string | null {
  const app = loadApplicant(s, applicantId);
  return app.passport_number_encrypted ? decryptText(app.passport_number_encrypted) : app.passport_data?.passport_number || null;
}

// ---------------- Documents ----------------
export function listDocuments(s: Session, opts?: { tenantId?: string; applicantId?: string }) {
  const db = getDb();
  if (s.role === "SUPER_ADMIN") return db.client_documents.filter((d) => (!opts?.tenantId || d.tenant_id === opts.tenantId) && (!opts?.applicantId || d.applicant_id === opts.applicantId));
  if (!hasPerm(s, "document.read")) throw new AppError("FORBIDDEN", "Permission denied: document.read");
  return db.client_documents.filter((d) => d.tenant_id === s.tenant_id && (!opts?.applicantId || d.applicant_id === opts.applicantId));
}

export function addDocument(s: Session, applicantId: string, f: { document_type: string; storage_path?: string; file_name?: string; mime_type?: string; file_size?: number }) {
  const db = getDb();
  const app = loadApplicant(s, applicantId);
  if (s.role === "APPLICANT" && s.applicant_id !== app.id) throw new AppError("FORBIDDEN", "Not your applicant record");
  if (s.role !== "APPLICANT" && !hasPerm(s, "document.upload")) throw new AppError("FORBIDDEN", "Permission denied: document.upload");
  mutate((d) => {
    const now = new Date().toISOString();
    const existing = d.client_documents.find((x) => x.applicant_id === app.id && x.document_type === f.document_type);
    if (existing) {
      existing.storage_path = f.storage_path || existing.storage_path;
      existing.file_name = f.file_name || existing.file_name;
      existing.mime_type = f.mime_type || existing.mime_type;
      existing.file_size = f.file_size || existing.file_size;
      existing.verification_status = "PENDING_REVIEW";
      existing.version += 1;
      existing.uploaded_at = now;
      existing.uploaded_by = s.uid;
    } else {
      d.client_documents.unshift({
        id: randomId("doc"), tenant_id: app.tenant_id, applicant_id: app.id, document_type: f.document_type,
        storage_path: f.storage_path, file_name: f.file_name, mime_type: f.mime_type, file_size: f.file_size,
        verification_status: "PENDING_REVIEW", version: 1, uploaded_by: s.uid, uploaded_at: now
      });
    }
    if (["DOCUMENTS_UPLOADED", "CHECKLIST_COMPLETE"].includes(app.application_stage) || app.application_stage === "PASSPORT_CAPTURED") {
      if (app.application_stage === "PASSPORT_CAPTURED") app.application_stage = "DOCUMENTS_UPLOADED";
    }
    app.updated_at = now;
    logAudit(d, { actor_user_id: s.uid, actor_type: "USER", tenant_id: app.tenant_id, action: "DOCUMENT.UPLOADED", resource_type: "client_document", resource_id: app.id, metadata: { type: f.document_type } });
  });
}

export function setDocumentStatus(s: Session, docId: string, status: string, note?: string) {
  if (!hasPerm(s, "document.verify")) throw new AppError("FORBIDDEN", "Permission denied: document.verify");
  mutate((d) => {
    const doc = d.client_documents.find((x) => x.id === docId);
    if (!doc || !canAccessTenant(s, doc.tenant_id)) throw new AppError("FORBIDDEN", "Tenant isolation");
    doc.verification_status = status;
    if (note) doc.audit_notes = note;
    const app = d.applicants.find((a) => a.id === doc.applicant_id);
    if (app) app.updated_at = new Date().toISOString();
    logAudit(d, { actor_user_id: s.uid, actor_type: "USER", tenant_id: doc.tenant_id, action: `DOCUMENT.${status}`, resource_type: "client_document", resource_id: docId, metadata: { note } });
  });
}

// ---------------- Dispatch ----------------
export function createDispatch(s: Session, applicantId: string, f: { request_type: string; agency_note: string; priority?: string }) {
  if (!hasPerm(s, "dispatch.create")) throw new AppError("FORBIDDEN", "Permission denied: dispatch.create");
  mutate((d) => {
    const app = d.applicants.find((a) => a.id === applicantId);
    if (!app || !canAccessTenant(s, app.tenant_id)) throw new AppError("FORBIDDEN", "Tenant isolation");
    const id = randomId("dr");
    d.master_dispatch_requests.unshift({
      id, tenant_id: app.tenant_id, applicant_id: app.id, request_type: f.request_type,
      submitted_by: s.uid, priority: f.priority || "NORMAL", status: "PENDING_MASTER_REVIEW",
      agency_note: f.agency_note, submitted_at: new Date().toISOString()
    });
    if (app.application_stage !== "LODGED" && app.application_stage !== "VISA_ISSUED") app.application_stage = "DISPATCH_REQUESTED";
    app.updated_at = new Date().toISOString();
    d.notifications.unshift({ id: randomId("n"), tenant_id: null, user_id: "u_super", applicant_id: app.id, type: "DISPATCH_SUBMITTED", title: "Master dispatch request", body: `${app.first_name} ${app.last_name} (${app.target_country}) — ${f.request_type}. Priority: ${f.priority || "NORMAL"}.`, read: false, created_at: new Date().toISOString() });
    logAudit(d, { actor_user_id: s.uid, actor_type: "USER", tenant_id: app.tenant_id, action: "DISPATCH.CREATED", resource_type: "master_dispatch_request", resource_id: id });
  });
}

export function listDispatch(s: Session, tenantFilter?: string) {
  const db = getDb();
  if (s.role === "SUPER_ADMIN") return db.master_dispatch_requests.filter((x) => !tenantFilter || x.tenant_id === tenantFilter);
  if (!hasPerm(s, "dispatch.create")) throw new AppError("FORBIDDEN", "Permission denied");
  return db.master_dispatch_requests.filter((x) => x.tenant_id === s.tenant_id);
}

export function decideDispatch(s: Session, id: string, f: { decision: "CORRECTION" | "APPROVE_DOSSIER" | "ASSIGN_AGENT" | "REJECT"; master_note?: string; agentId?: string }) {
  if (s.role !== "SUPER_ADMIN") throw new AppError("FORBIDDEN", "Only Super Admin decides dispatch requests.");
  const runInfo: { runId?: string; approvalId?: string } = {};
  mutate((d) => {
    const dr = d.master_dispatch_requests.find((x) => x.id === id);
    if (!dr) throw new AppError("NOT_FOUND", "Dispatch request not found");
    dr.master_note = f.master_note;
    dr.reviewed_at = new Date().toISOString();
    const app = d.applicants.find((a) => a.id === dr.applicant_id)!;
    if (f.decision === "CORRECTION") {
      dr.status = "CORRECTION_REQUESTED"; dr.decision = "CORRECTION";
      app.application_stage = "CHECKLIST_COMPLETE";
      app.feedback_note = f.master_note || "Correction requested by Master review.";
      d.notifications.unshift({ id: randomId("n"), tenant_id: app.tenant_id, user_id: null, applicant_id: app.id, type: "CORRECTION_REQUEST", title: "Correction requested", body: f.master_note || "Please review the correction request in your dashboard.", read: false, created_at: new Date().toISOString() });
    } else if (f.decision === "APPROVE_DOSSIER") {
      dr.status = "DECIDED"; dr.decision = "APPROVE_DOSSIER";
      app.application_stage = "DOSSIER_APPROVED";
      app.feedback_note = f.master_note || "Dossier approved by Master Console.";
      d.notifications.unshift({ id: randomId("n"), tenant_id: app.tenant_id, user_id: null, applicant_id: app.id, type: "CASE_CHANGED", title: "Dossier approved", body: "Your dossier is approved. Next: official form & appointment.", read: false, created_at: new Date().toISOString() });
    } else if (f.decision === "REJECT") {
      dr.status = "DECIDED"; dr.decision = "REJECT";
      app.status = "CLOSED"; app.application_stage = "CLOSED";
      d.notifications.unshift({ id: randomId("n"), tenant_id: app.tenant_id, user_id: null, applicant_id: app.id, type: "CASE_CHANGED", title: "Case closed", body: f.master_note || "Dispatch request rejected.", read: false, created_at: new Date().toISOString() });
    } else if (f.decision === "ASSIGN_AGENT") {
      if (!f.agentId) throw new AppError("NOT_FOUND", "Agent required");
      dr.status = "DECIDED"; dr.decision = "ASSIGN_AGENT";
      const r = startAgentRun(s, { agentCode: d.ai_agents.find((a) => a.id === f.agentId)?.agent_code || "AGENT_03", tenantId: app.tenant_id, applicantId: app.id, task_type: dr.request_type, input: { via: "dispatch" } });
      runInfo.runId = r.runId; runInfo.approvalId = r.approvalId;
    }
    logAudit(d, { actor_user_id: s.uid, actor_type: "USER", tenant_id: app.tenant_id, action: "DISPATCH.DECIDED", resource_type: "master_dispatch_request", resource_id: id, metadata: { decision: f.decision, runId: runInfo.runId } });
  });
  return runInfo;
}

// ---------------- Approvals ----------------
export function decideApproval(s: Session, id: string, approve: boolean, note?: string) {
  if (s.role !== "SUPER_ADMIN") throw new AppError("FORBIDDEN", "Only Super Admin can approve high-impact actions.");
  const res: { ok: boolean; error?: string; actionType?: string } = { ok: false };
  mutate((d) => {
    const ap = d.approval_requests.find((x) => x.id === id);
    if (!ap) throw new AppError("NOT_FOUND", "Approval not found");
    if (ap.status !== "PENDING") throw new AppError("INVALID", `Approval is ${ap.status.toLowerCase()} — cannot decide (fail closed).`);
    if (new Date(ap.expires_at).getTime() < Date.now()) { ap.status = "EXPIRED"; throw new AppError("EXPIRED", "Approval window expired — create a new request."); }
    ap.approved_by = s.uid;
    ap.approved_at = new Date().toISOString();
    ap.note = note;
    const run = d.agent_runs.find((r) => r.id === ap.agent_run_id);
    const app = ap.applicant_id ? d.applicants.find((a) => a.id === ap.applicant_id) : undefined;
    if (approve) {
      ap.status = "APPROVED";
      const token = signToken({ approval: ap.id, action: ap.action_type, exp: Date.now() + 15 * 60 * 1000 }, approvalSecret());
      if (run) {
        run.status = "COMPLETED";
        run.completed_at = new Date().toISOString();
        if (run.output_payload) run.output_payload = { ...run.output_payload, approved: true, approval_token_issued: true, token_hint: token.slice(0, 12) + "…" };
      }
      const bs = run ? d.browser_sessions.find((b) => b.agent_run_id === run.id && !["STOPPED", "COMPLETED"].includes(b.status)) : undefined;
      if (bs) { bs.status = "COMPLETED"; bs.stopped_at = new Date().toISOString(); }
      if (app) {
        if (ap.action_type === "FINAL_SUBMIT") {
          app.application_stage = "LODGED";
          app.updated_at = new Date().toISOString();
          d.notifications.unshift({ id: randomId("n"), tenant_id: app.tenant_id, user_id: null, applicant_id: app.id, type: "CASE_CHANGED", title: "Application lodged", body: `${ap.action_payload?.target_system || "Official portal"} submission completed after human approval.`, read: false, created_at: new Date().toISOString() });
        } else if (ap.action_type === "APPOINTMENT_BOOKING") {
          d.appointments.unshift({ id: randomId("appt"), tenant_id: app.tenant_id, applicant_id: app.id, country: app.target_country, purpose: "Appointment booked (human-approved)", date: ap.action_payload?.slot?.date || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10), time: ap.action_payload?.slot?.time || "10:00", location: ap.action_payload?.slot?.center || "VFS Global, Dhaka", status: "CONFIRMED", created_at: new Date().toISOString() });
          d.notifications.unshift({ id: randomId("n"), tenant_id: app.tenant_id, user_id: null, applicant_id: app.id, type: "APPOINTMENT", title: "Appointment booked", body: "Appointment confirmed after human approval.", read: false, created_at: new Date().toISOString() });
        }
      }
      res.actionType = ap.action_type;
    } else {
      ap.status = "REJECTED";
      if (run) { run.status = "CANCELLED"; run.completed_at = new Date().toISOString(); run.error_message = "Rejected by human approver"; }
      const bs = run ? d.browser_sessions.find((b) => b.agent_run_id === run.id && !["STOPPED", "COMPLETED"].includes(b.status)) : undefined;
      if (bs) { bs.status = "STOPPED"; bs.stopped_at = new Date().toISOString(); }
      if (app) d.notifications.unshift({ id: randomId("n"), tenant_id: app.tenant_id, user_id: null, applicant_id: app.id, type: "APPROVAL_REJECTED", title: "Action rejected", body: `${ap.action_type} was rejected by the approver. No external action was taken.`, read: false, created_at: new Date().toISOString() });
    }
    logAudit(d, { actor_user_id: s.uid, actor_type: "USER", tenant_id: ap.tenant_id, action: approve ? "APPROVAL.APPROVED" : "APPROVAL.REJECTED", resource_type: "approval_request", resource_id: ap.id, metadata: { action_type: ap.action_type, note } });
    res.ok = true;
  });
  return res;
}

// ---------------- Browser sessions ----------------
export function stopBrowserSession(s: Session, id: string) {
  if (s.role !== "SUPER_ADMIN" && !hasPerm(s, "browser.stop")) throw new AppError("FORBIDDEN", "Permission denied: browser.stop");
  mutate((d) => {
    const bs = d.browser_sessions.find((x) => x.id === id);
    if (!bs || !canAccessTenant(s, bs.tenant_id)) throw new AppError("FORBIDDEN", "Tenant isolation");
    bs.status = "STOPPED";
    bs.stopped_at = new Date().toISOString();
    logAudit(d, { actor_user_id: s.uid, actor_type: "USER", tenant_id: bs.tenant_id, action: "BROWSER.STOPPED", resource_type: "browser_session", resource_id: id });
  });
}

// ---------------- Messages ----------------
export function listConversations(s: Session) {
  const db = getDb();
  if (s.role === "SUPER_ADMIN") return db.conversations;
  if (s.role === "APPLICANT") return db.conversations.filter((c) => c.applicant_id === s.applicant_id);
  if (!hasPerm(s, "message.read")) throw new AppError("FORBIDDEN", "Permission denied: message.read");
  return db.conversations.filter((c) => c.tenant_id === s.tenant_id);
}

export function listMessages(s: Session, conversationId: string) {
  const cvs = listConversations(s);
  if (!cvs.find((c) => c.id === conversationId)) throw new AppError("FORBIDDEN", "Conversation not accessible");
  return getDb().messages.filter((m) => m.conversation_id === conversationId);
}

export function sendMessage(s: Session, f: { conversationId?: string; applicantId?: string; body: string }) {
  const body = f.body.trim();
  if (!body) throw new AppError("INVALID", "Message is empty");
  mutate((d) => {
    let cv: (typeof d.conversations)[number];
    if (s.role === "APPLICANT") {
      cv = d.conversations.find((c) => c.applicant_id === s.applicant_id);
      if (!cv) {
        const app = d.applicants.find((a) => a.id === s.applicant_id)!;
        cv = { id: randomId("cv"), tenant_id: app.tenant_id, applicant_id: app.id, channel: "WHATSAPP", auto_responder: true, created_at: new Date().toISOString() };
        d.conversations.unshift(cv);
      }
    } else {
      if (!hasPerm(s, "message.write")) throw new AppError("FORBIDDEN", "Permission denied: message.write");
      const applicantId = f.conversationId
        ? d.conversations.find((c) => c.id === f.conversationId)?.applicant_id
        : f.applicantId;
      if (!applicantId) throw new AppError("NOT_FOUND", "Applicant required");
      cv = d.conversations.find((c) => c.applicant_id === applicantId);
      if (!cv) {
        const app = d.applicants.find((a) => a.id === applicantId);
        if (!app || !canAccessTenant(s, app.tenant_id)) throw new AppError("FORBIDDEN", "Tenant isolation");
        cv = { id: randomId("cv"), tenant_id: app.tenant_id, applicant_id: app.id, channel: "WHATSAPP", auto_responder: true, created_at: new Date().toISOString() };
        d.conversations.unshift(cv);
      } else if (!canAccessTenant(s, cv.tenant_id)) throw new AppError("FORBIDDEN", "Tenant isolation");
    }
    const now = new Date().toISOString();
    d.messages.push({ id: randomId("msg"), conversation_id: cv.id, sender: s.role === "APPLICANT" ? "APPLICANT" : "STAFF", sender_name: s.role === "APPLICANT" ? `${getApplicantName(d, cv.applicant_id)}` : `${s.name} (${getTenantShort(d, cv.tenant_id)})`, body, created_at: now });
    logAudit(d, { actor_user_id: s.uid, actor_type: "USER", tenant_id: cv.tenant_id, action: "MESSAGE.SENT", resource_type: "conversation", resource_id: cv.id });
    if (s.role === "APPLICANT" && cv.auto_responder) {
      const app = d.applicants.find((a) => a.id === cv.applicant_id)!;
      const reply = autoReply(d, app, body);
      d.messages.push({ id: randomId("msg"), conversation_id: cv.id, sender: "AUTO", sender_name: "VisaMotion Auto-Responder", body: reply, created_at: new Date().toISOString() });
      logAudit(d, { actor_user_id: "auto_responder", actor_type: "AGENT", tenant_id: cv.tenant_id, action: "MESSAGE.AUTO_REPLY", resource_type: "conversation", resource_id: cv.id });
    }
  });
}
function getApplicantName(d: DB, id: string) { const a = d.applicants.find((x) => x.id === id); return a ? `${a.first_name} ${a.last_name}` : "Applicant"; }
function getTenantShort(d: DB, id: string) { const t = d.tenants.find((x) => x.id === id); return t ? t.name.split(" ")[0] : "Agency"; }

// ---------------- Notifications ----------------
export function listNotifications(s: Session) {
  const db = getDb();
  if (s.role === "SUPER_ADMIN") return db.notifications.filter((n) => !n.tenant_id || !n.user_id || n.user_id === s.uid);
  if (s.role === "APPLICANT") return db.notifications.filter((n) => n.applicant_id === s.applicant_id);
  return db.notifications.filter((n) => n.tenant_id === s.tenant_id && !n.user_id);
}
export function markNotificationsRead(s: Session) {
  mutate((d) => {
    for (const n of listNotifications(s)) n.read = true;
  });
}

// ---------------- Billing ----------------
export function payInvoice(s: Session, invoiceId: string, method: string) {
  const db = getDb();
  const inv = db.invoices.find((i) => i.id === invoiceId);
  if (!inv) throw new AppError("NOT_FOUND", "Invoice not found");
  if (s.role === "APPLICANT" && s.applicant_id !== inv.applicant_id) throw new AppError("FORBIDDEN", "Not your invoice");
  if (s.role !== "APPLICANT" && !hasPerm(s, "payment.create")) throw new AppError("FORBIDDEN", "Permission denied: payment.create");
  if (!canAccessTenant(s, inv.tenant_id)) throw new AppError("FORBIDDEN", "Tenant isolation");
  mutate((d) => {
    const balance = invoiceBalance(d, inv);
    if (balance <= 0) throw new AppError("INVALID", "Invoice already fully paid");
    d.payments.unshift({ id: randomId("pay"), tenant_id: inv.tenant_id, applicant_id: inv.applicant_id, invoice_id: inv.id, amount: balance, currency: inv.currency, method: method + " (demo gateway)", status: "PAID", reference: "DEMO-" + randomId("").slice(3, 9).toUpperCase(), paid_at: new Date().toISOString(), created_at: new Date().toISOString() });
    inv.status = "PAID";
    d.notifications.unshift({ id: randomId("n"), tenant_id: inv.tenant_id, user_id: null, applicant_id: inv.applicant_id, type: "PAYMENT_RECEIVED", title: "Payment received", body: `Invoice ${inv.number} fully paid. Receipt reference saved.`, read: false, created_at: new Date().toISOString() });
    logAudit(d, { actor_user_id: s.uid, actor_type: "USER", tenant_id: inv.tenant_id, action: "PAYMENT.RECORDED", resource_type: "invoice", resource_id: inv.id, metadata: { amount: balance, currency: inv.currency, demo: true } });
  });
}

// ---------------- Tenants ----------------
export function listTenants(s: Session) {
  const db = getDb();
  if (s.role === "SUPER_ADMIN") return db.tenants;
  return db.tenants.filter((t) => t.id === s.tenant_id);
}
export function updateTenant(s: Session, tenantId: string, patch: { name?: string; logo_url?: string; primary?: string }) {
  if (s.role === "SUPER_ADMIN") { /* ok */ }
  else if (s.tenant_id !== tenantId || !hasPerm(s, "tenant.update")) throw new AppError("FORBIDDEN", "Permission denied: tenant.update");
  mutate((d) => {
    const t = d.tenants.find((x) => x.id === tenantId);
    if (!t) throw new AppError("NOT_FOUND", "Tenant not found");
    if (patch.name) t.name = patch.name;
    if (patch.logo_url !== undefined) t.logo_url = patch.logo_url;
    if (patch.primary) t.theme_config.primary = patch.primary;
    logAudit(d, { actor_user_id: s.uid, actor_type: "USER", tenant_id: tenantId, action: "TENANT.UPDATED", resource_type: "tenant", resource_id: tenantId });
  });
}
export function addMember(s: Session, tenantId: string, f: { email: string; full_name: string; role: Role }) {
  if (s.role === "SUPER_ADMIN" || (s.tenant_id === tenantId && hasPerm(s, "tenant.update"))) { /* ok */ }
  else throw new AppError("FORBIDDEN", "Permission denied: tenant.update");
  mutate((d) => {
    if (!d.tenants.find((t) => t.id === tenantId)) throw new AppError("NOT_FOUND", "Tenant not found");
    let p = d.profiles.find((x) => x.email.toLowerCase() === f.email.toLowerCase());
    if (!p) {
      p = { id: randomId("u"), full_name: f.full_name, email: f.email, password_hash: null as any, status: "INVITED", created_at: new Date().toISOString() };
      d.profiles.push(p);
    }
    const existing = d.organization_members.find((m) => m.tenant_id === tenantId && m.user_id === p!.id);
    if (existing) { existing.role = f.role; existing.is_active = true; }
    else d.organization_members.push({ id: randomId("m"), tenant_id: tenantId, user_id: p.id, role: f.role, is_active: true, created_at: new Date().toISOString() });
    logAudit(d, { actor_user_id: s.uid, actor_type: "USER", tenant_id: tenantId, action: "MEMBER.ADDED", resource_type: "membership", metadata: { email: f.email, role: f.role } });
  });
}

// ---------------- Settings / vault ----------------
export function updateSettings(s: Session, patch: Partial<DB["settings"]>) {
  if (s.role !== "SUPER_ADMIN") throw new AppError("FORBIDDEN", "Only Super Admin can change system settings.");
  mutate((d) => {
    d.settings = { ...d.settings, ...patch };
    logAudit(d, { actor_user_id: s.uid, actor_type: "USER", action: "SETTINGS.UPDATED", metadata: { keys: Object.keys(patch) } });
  });
}
export function setAgentProduction(s: Session, agentId: string, enabled: boolean) {
  if (s.role !== "SUPER_ADMIN") throw new AppError("FORBIDDEN", "Only Super Admin can enable production agents.");
  mutate((d) => {
    d.settings.production_agents[agentId] = enabled;
    logAudit(d, { actor_user_id: s.uid, actor_type: "USER", action: enabled ? "AGENT.PRODUCTION_ON" : "AGENT.PRODUCTION_OFF", resource_type: "ai_agent", resource_id: agentId });
  });
}
export function rotateCredential(s: Session, id: string) {
  if (s.role !== "SUPER_ADMIN") throw new AppError("FORBIDDEN", "Only Super Admin can manage credentials.");
  mutate((d) => {
    const c = d.credential_vault.find((x) => x.id === id);
    if (!c) throw new AppError("NOT_FOUND", "Credential not found");
    c.last_rotated_at = new Date().toISOString();
    c.secret_ref = c.secret_ref.replace(/(-r\d+)?$/, "") + "-r" + (Math.floor(Math.random() * 90) + 10);
    logAudit(d, { actor_user_id: s.uid, actor_type: "USER", action: "CREDENTIAL.ROTATED", resource_type: "credential", resource_id: id, metadata: { ref: c.secret_ref } });
  });
}

// ---------------- Dossier / vault links ----------------
export function createDossierLink(s: Session, applicantId: string): { url: string; token: string; expires_in_min: number } {
  const app = loadApplicant(s, applicantId);
  if (!hasPerm(s, "document.read")) throw new AppError("FORBIDDEN", "Permission denied");
  const token = createVaultToken(app.id, app.tenant_id);
  return { url: `/vault/${token}`, token, expires_in_min: 15 };
}

// ---------------- Stats ----------------
export function tenantStats(db: DB, tenantId?: string) {
  const apps = db.applicants.filter((a) => !tenantId || a.tenant_id === tenantId);
  const stageCount = (st: string) => apps.filter((a) => a.application_stage === st).length;
  return {
    applicants: apps.length,
    active: apps.filter((a) => a.status === "ACTIVE").length,
    dispatched: db.master_dispatch_requests.filter((x) => (!tenantId || x.tenant_id === tenantId) && x.status === "PENDING_MASTER_REVIEW").length,
    pendingApprovals: db.approval_requests.filter((x) => (!tenantId || x.tenant_id === tenantId) && x.status === "PENDING").length,
    lodged: stageCount("LODGED") + stageCount("UNDER_REVIEW") + stageCount("VISA_ISSUED"),
    revenueCollected: db.payments.filter((p) => p.status === "PAID" && (!tenantId || p.tenant_id === tenantId)).reduce((a, p) => a + p.amount, 0),
    outstanding: db.invoices.filter((i) => i.status === "SENT" && (!tenantId || i.tenant_id === tenantId)).reduce((a, i) => a + invoiceBalance(db, i), 0)
  };
}
