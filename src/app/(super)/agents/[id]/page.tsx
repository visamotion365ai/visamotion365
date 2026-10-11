import { notFound } from "next/navigation";
import { needSuper } from "@/lib/session";
import { liveDb } from "@/lib/agents";
import { PageHeader, Card, CardHead, Badge, statusTone, KV, JsonView, Field, Select, Tabs, Empty } from "@/components/ui";
import { ActionForm } from "@/components/forms";
import { runAgentAction } from "@/app/actions/main";
import { Bot, Play, ShieldCheck, KeyRound, Cpu, Ban } from "lucide-react";
import { dtt, timeAgo } from "@/lib/format";

export default async function AgentDetail({ params }: { params: Promise<{ id: string }> }) {
  const s = await needSuper();
  const { id } = await params;
  const db = liveDb();
  const a = db.ai_agents.find((x) => x.id === id || x.agent_code === id);
  if (!a) notFound();
  const slots = db.agent_slots.filter((sl) => sl.agent_id === a.id);
  const runs = db.agent_runs.filter((r) => r.agent_id === a.id);
  const production = db.settings.production_agents[a.id] === true;
  const scopeApps = db.applicants; // super admin can scope any tenant

  return (
    <div className="fade-up">
      <PageHeader crumb="Agents" title={`${a.agent_code} — ${a.name}`} sub={a.description}
        right={<><Badge tone={statusTone(a.status)} dot>{a.status}</Badge>{a.requires_human_approval && <Badge tone="amber" dot><ShieldCheck size={10} /> human approval</Badge>}</>} />
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="space-y-4">
          <Card>
            <CardHead title="System prompt" sub="Bounded, per-agent — agents never share tools" />
            <div className="px-5 pb-5">
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 border border-slate-100 rounded-xl p-3.5 font-mono">{a.system_prompt}</p>
            </div>
          </Card>
          <Card>
            <CardHead title="Tool policy" />
            <div className="px-5 pb-5 space-y-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 mb-1.5 flex items-center gap-1"><Play size={11} /> Allowed</p>
                <div className="flex flex-wrap gap-1.5">{a.allowed_tools.map((t) => <span key={t} className="rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-mono font-semibold px-2.5 py-1">{t}</span>)}</div>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-red-500 mb-1.5 flex items-center gap-1"><Ban size={11} /> Blocked</p>
                <div className="flex flex-wrap gap-1.5">{a.blocked_actions.map((t) => <span key={t} className="rounded-full bg-red-50 border border-red-200 text-red-600 text-[10px] font-mono font-semibold px-2.5 py-1">{t}</span>)}</div>
              </div>
              <KV k="Daily limit" v={a.daily_limit} />
              <KV k="Max retries" v={a.max_retries} />
              <KV k="Human approval" v={a.requires_human_approval ? "REQUIRED before high-impact" : "not required"} />
              <KV k="Production gate" v={production ? <span className="text-emerald-600 font-bold">ENABLED</span> : "dry-run only"} />
            </div>
          </Card>
          <Card>
            <CardHead title="Slots" sub="Base44 + Browser Use credential refs (env-bound, never stored in DB)" />
            <div className="px-5 pb-5 space-y-2">
              {slots.map((sl) => (
                <div key={sl.id} className="rounded-xl border border-slate-100 px-3.5 py-2.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5"><KeyRound size={12} className="text-slate-400" /> {sl.slot_code}</p>
                    <Badge tone="slate">{sl.provider}</Badge>
                  </div>
                  <p className="text-[10px] font-mono text-slate-400 mt-1">{sl.credential_ref} • concurrency {sl.concurrency_limit}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHead title="Run this agent (dry-run safe)" sub="Pick tenant + applicant. Orchestrator validates role, tenant scope, daily limits, then executes and (if needed) creates an approval request." />
            <div className="px-5 pb-5">
              <ActionForm action={runAgentAction} submit={<span className="flex items-center gap-2"><Cpu size={14} /> Execute task</span>} variant="brand">
                <div className="grid sm:grid-cols-3 gap-3">
                  <Field label="Tenant">
                    <Select name="tenant_id" defaultValue="t_wvc">
                      {db.tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </Select>
                  </Field>
                  <Field label="Applicant (optional)">
                    <Select name="applicant_id">
                      <option value="">— none (tenant-level task) —</option>
                      {scopeApps.map((ap) => <option key={ap.id} value={ap.id}>{ap.first_name} {ap.last_name} ({ap.target_country})</option>)}
                    </Select>
                  </Field>
                  <Field label="Task type">
                    <Select name="task_type" defaultValue="MANUAL">
                      <option value="MANUAL">MANUAL</option>
                      <option value="PASSPORT_OCR">PASSPORT_OCR</option>
                      <option value="DOSSIER_CHECKLIST">DOSSIER_CHECKLIST</option>
                      <option value="CONSISTENCY_CHECK">CONSISTENCY_CHECK</option>
                      <option value="SOP_DRAFT">SOP_DRAFT</option>
                      <option value="OFFICIAL_FORM_DRAFT">OFFICIAL_FORM_DRAFT</option>
                      <option value="APPOINTMENT_SCAN">APPOINTMENT_SCAN</option>
                      <option value="STATUS_TRACK">STATUS_TRACK</option>
                      <option value="INTERVIEW_PREP">INTERVIEW_PREP</option>
                      <option value="BILLING_RECON">BILLING_RECON</option>
                      <option value="LEAD_SWEEP">LEAD_SWEEP</option>
                    </Select>
                  </Field>
                </div>
              </ActionForm>
            </div>
          </Card>
          <Card>
            <CardHead title={`Run history (${runs.length})`} />
            <div className="px-5 pb-5 space-y-2">
              {runs.length === 0 && <Empty title="No runs yet" />}
              {runs.slice(0, 8).map((r) => (
                <div key={r.id} className="rounded-xl border border-slate-100 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-800">{r.task_type.replace(/_/g, " ")} <span className="text-slate-400 font-medium">• {r.tenant_id} {r.applicant_id ? `• ${db.applicants.find((x) => x.id === r.applicant_id)?.first_name}` : ""}</span></p>
                    <Badge tone={statusTone(r.status)} dot>{r.status.replace(/_/g, " ")}</Badge>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">{dtt(r.created_at)} {r.needs_approval && "• approval " + (db.approval_requests.find((x) => x.id === r.approval_id)?.status || "").toLowerCase()}</p>
                  <details className="mt-1.5"><summary className="text-[11px] font-bold text-indigo-600 cursor-pointer">Output</summary>
                    <div className="mt-2"><JsonView data={r.output_payload || r.input_payload} /></div>
                  </details>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
