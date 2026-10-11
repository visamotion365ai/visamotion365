import React from "react";
import Link from "next/link";
import type { Session } from "@/lib/schema";
import { getDb } from "@/lib/db";
import { runCompliance as compliance } from "@/lib/compliance";
import { maskPassport, parseMrz } from "@/lib/mrz";
import { STAGE_LABEL, STAGES, type Applicant } from "@/lib/schema";
import { STAGE_TONE } from "@/lib/workflow";
import { Card, CardHead, Badge, statusTone, KV, Empty, Btn, Progress, JsonView, LinkBtn, Field, Select, Textarea, Input } from "@/components/ui";
import { ActionForm, PassportCaptureForm, DocUploadForm } from "@/components/forms";
import {
  verifyPassportAction, confirmPassportAction, addDocumentAction, setDocumentStatusAction,
  createDispatchAction, createDossierLinkAction, capturePassportAction
} from "@/app/actions/main";
import { dt, dtt, timeAgo } from "@/lib/format";
import { Fingerprint, FileText, ShieldCheck, AlertTriangle, CheckCircle2, XCircle, Clock, Download, QrCode, MessageSquare, Workflow } from "lucide-react";

const DOC_TYPES = ["NATIONAL_ID", "PHOTOGRAPH", "BANK_STATEMENT", "TAX_DOCUMENT", "EMPLOYMENT_CERTIFICATE", "EDUCATIONAL_CERTIFICATE", "POLICE_CLEARANCE", "MEDICAL_CERTIFICATE", "INSURANCE", "INVITATION", "EMPLOYMENT_CONTRACT", "TRAVEL_INSURANCE", "FLIGHT_BOOKING", "HOTEL_BOOKING", "SOP", "BUSINESS_LICENSE", "QUALIFICATION_CERT", "EMPLOYER_LICENSE", "EXPERIENCE_CERTIFICATE"];

export function ApplicantDetail({ s, applicantId, mode }: { s: Session; applicantId: string; mode: "super" | "agency" }) {
  const db = getDb();
  const app = db.applicants.find((a) => a.id === applicantId);
  if (!app) return <Empty title="Applicant not found" sub="It may be outside your tenant scope." />;
  const tenant = db.tenants.find((t) => t.id === app.tenant_id)!;
  const country = db.countries.find((c) => app.target_country === c.name);
  const program = db.visa_programs.find((p) => p.id === app.visa_program_id);
  const docs = db.client_documents.filter((d) => d.applicant_id === app.id);
  const report = compliance(db, app);
  const runs = db.agent_runs.filter((r) => r.applicant_id === app.id).slice(0, 8);
  const dispatches = db.master_dispatch_requests.filter((d) => d.applicant_id === app.id);
  const timeline = db.audit_logs.filter((l) => l.resource_id === app.id || l.metadata?.runId).slice(0, 14);
  const stageIdx = STAGES.indexOf(app.application_stage as any);
  const canVerify = mode === "super" || s.role === "TENANT_OWNER" || s.role === "AGENCY_ADMIN" || s.role === "VISA_OFFICER" || s.role === "DOCUMENT_OFFICER";

  return (
    <div className="space-y-4 fade-up">
      {/* Header */}
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-lg font-black flex items-center justify-center">
              {app.first_name[0]}{app.last_name[0]}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-slate-900">{app.first_name} {app.last_name}</h2>
                <Badge tone={STAGE_TONE[app.application_stage] || "slate"} dot>{STAGE_LABEL[app.application_stage]}</Badge>
                <Badge tone="slate">{country?.flag} {app.target_country}</Badge>
              </div>
              <p className="text-xs text-slate-500 mt-1">{program?.name || "No program"} • {tenant.name} • Ref {app.id.toUpperCase()}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Compliance</p>
              <p className={`text-xl font-black ${report.score >= 80 ? "text-emerald-600" : report.score >= 60 ? "text-amber-600" : "text-red-500"}`}>{report.score}<span className="text-xs text-slate-400 font-semibold">/100</span></p>
            </div>
            <Progress value={report.score} tone={report.score >= 80 ? "emerald" : report.score >= 60 ? "amber" : "red"} className="w-24" />
          </div>
        </div>
        {app.feedback_note && (
          <div className="mt-4 rounded-xl bg-indigo-50 border border-indigo-100 px-4 py-2.5 text-xs text-indigo-900 flex items-start gap-2">
            <MessageSquare size={13} className="mt-0.5 shrink-0" />
            <span><b>Master feedback:</b> {app.feedback_note}</span>
          </div>
        )}
        <div className="mt-4"><Progress value={((stageIdx + 1) / STAGES.length) * 100} /></div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Passport */}
        <Card>
          <CardHead title={<span className="flex items-center gap-2"><Fingerprint size={15} className="text-indigo-500" /> Passport & OCR</span>}
            sub={app.passport_data ? `Captured ${dtt(app.passport_data.captured_at)} • ${app.passport_data.ocr_engine}` : "No passport captured yet"}
            right={app.passport_data?.verified ? <Badge tone="emerald" dot>Verified</Badge> : app.passport_data ? <Badge tone="amber" dot>{app.passport_data.confirmed_by_applicant ? "Pending review" : "Draft"}</Badge> : undefined} />
          <div className="px-5 pb-5">
            {app.passport_data ? (
              <div>
                <KV k="Name" v={`${app.passport_data.given} ${app.passport_data.surname}`} />
                <KV k="Passport no." v={<span className="font-mono">{maskPassport(app.passport_data.passport_number)} <span className="text-[10px] text-slate-400">(AES-256-GCM encrypted at rest)</span></span>} mono />
                <KV k="Date of birth" v={app.passport_data.dob} />
                <KV k="Sex / Nationality" v={`${app.passport_data.sex} / ${app.passport_data.nationality}`} />
                <KV k="Expiry" v={<span className={new Date(app.passport_data.expiry) > new Date(Date.now() + 180 * 86400000) ? "" : "text-red-500 font-bold"}>{app.passport_data.expiry}</span>} />
                <KV k="MRZ checksums" v={(() => { const p = parseMrz(app.passport_data!.mrz); return p.ok ? <span className="text-emerald-600 font-semibold">L1 ✓ L2 ✓ L3 ✓ (valid)</span> : <span className="text-red-500">{p.errors.join(", ")}</span>; })()} />
                <div className="mt-3 rounded-xl bg-slate-900 p-3 space-y-0.5">
                  {app.passport_data.mrz.map((l, i) => <p key={i} className="font-mono text-[11px] text-emerald-300/90 tracking-wide">{l}</p>)}
                </div>
                <div className="mt-4 space-y-2">
                  <PassportCaptureForm applicantId={app.id} action={capturePassportAction} />
                  {canVerify && !app.passport_data.verified && (
                    <ActionForm action={verifyPassportAction} submit="Verify passport (officer)" variant="success" className="flex items-center gap-2 flex-wrap">
                      <input type="hidden" name="applicant_id" value={app.id} />
                    </ActionForm>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <p className="text-xs text-slate-500 mb-3">Capture the passport to start intake. OCR runs on the server; you review & confirm the fields.</p>
                <PassportCaptureForm applicantId={app.id} action={capturePassportAction} />
              </div>
            )}
          </div>
        </Card>

        {/* Profile */}
        <Card>
          <CardHead title="Profile" sub={`${tenant.name} • ${tenant.subdomain}.vm365.app (demo)`} />
          <div className="px-5 pb-5">
            <KV k="Full name" v={`${app.first_name} ${app.last_name}`} />
            <KV k="Date of birth" v={app.date_of_birth || "—"} />
            <KV k="Nationality" v={app.nationality} />
            <KV k="Gender" v={app.gender || "—"} />
            <KV k="Target country" v={`${country?.flag} ${app.target_country}`} />
            <KV k="Visa program" v={program?.name || "—"} />
            <KV k="Created" v={dt(app.created_at)} />
            <KV k="Last updated" v={dtt(app.updated_at)} />
            {app.dossier_version && <KV k="Dossier version" v={app.dossier_version} mono />}
            <div className="mt-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Stage timeline</p>
              <div className="flex flex-wrap gap-1.5">
                {STAGES.map((st, i) => (
                  <span key={st} className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${i <= stageIdx ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-400"}`}>{STAGE_LABEL[st]}</span>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Documents */}
      <Card>
        <CardHead title={<span className="flex items-center gap-2"><FileText size={15} className="text-indigo-500" /> Documents ({docs.length})</span>}
          sub="Upload, verify or request correction. Statuses: requested → uploaded → review → verified." />
        <div className="px-5 pb-5 space-y-4">
          {docs.length === 0 ? (
            <Empty icon={<FileText size={20} />} title="No documents yet" sub="Upload the first document below." />
          ) : (
            <div className="space-y-2">
              {docs.map((d) => (
                <div key={d.id} className="rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-slate-800">{d.document_type.replace(/_/g, " ")}</p>
                      <Badge tone={statusTone(d.verification_status)} dot>{d.verification_status.replace(/_/g, " ")}</Badge>
                      <span className="text-[10px] text-slate-400">v{d.version} • {dtt(d.uploaded_at)}</span>
                    </div>
                    {d.audit_notes && <p className="text-[11px] text-slate-500 mt-1">Note: {d.audit_notes}</p>}
                    {d.extracted_data && Object.keys(d.extracted_data).length > 0 && (
                      <p className="text-[10px] text-slate-400 mt-0.5 font-mono">{JSON.stringify(d.extracted_data).slice(0, 90)}{JSON.stringify(d.extracted_data).length > 90 ? "…" : ""}</p>
                    )}
                  </div>
                  {canVerify && (
                    <div className="flex gap-1.5">
                      {d.verification_status !== "VERIFIED" && (
                        <ActionForm action={setDocumentStatusAction} submit="✓" variant="success" hideSubmit className="flex">
                          <input type="hidden" name="doc_id" value={d.id} />
                          <input type="hidden" name="status" value="VERIFIED" />
                          <button type="submit" title="Verify" className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100"><CheckCircle2 size={15} /></button>
                        </ActionForm>
                      )}
                      {d.verification_status !== "CORRECTION_REQUIRED" && (
                        <ActionForm action={setDocumentStatusAction} submit="!" hideSubmit className="flex">
                          <input type="hidden" name="doc_id" value={d.id} />
                          <input type="hidden" name="status" value="CORRECTION_REQUIRED" />
                          <button type="submit" title="Request correction" className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center hover:bg-amber-100"><AlertTriangle size={15} /></button>
                        </ActionForm>
                      )}
                      {d.verification_status === "VERIFIED" && (
                        <ActionForm action={setDocumentStatusAction} hideSubmit className="flex">
                          <input type="hidden" name="doc_id" value={d.id} />
                          <input type="hidden" name="status" value="PENDING_REVIEW" />
                          <button type="submit" title="Re-open review" className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200"><Clock size={15} /></button>
                        </ActionForm>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Upload new document</p>
            <DocUploadForm applicantId={app.id} action={addDocumentAction} defaultType="PHOTOGRAPH" types={DOC_TYPES} />
          </div>
        </div>
      </Card>

      {/* Compliance */}
      <Card>
        <CardHead title={<span className="flex items-center gap-2"><ShieldCheck size={15} className="text-emerald-600" /> Compliance matrix — {program?.name || "—"}</span>}
          sub="Agent 03/04 engine: missing docs, expiry, name & bank-statement consistency."
          right={<LinkBtn href="#run-compliance" className="ml-auto">Run check ↻</LinkBtn>} />
        <div className="px-5 pb-5">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <table className="w-full">
                <thead><tr className="text-left"><th className="text-[10px] font-bold uppercase text-slate-400 pb-2">Requirement</th><th className="text-[10px] font-bold uppercase text-slate-400 pb-2 text-right">Status</th></tr></thead>
                <tbody>
                  {report.rows.map((r) => (
                    <tr key={r.requirement} className="border-t border-slate-100">
                      <td className="py-2 text-xs font-semibold text-slate-700">{r.requirement.replace(/_/g, " ")} {!r.required && <span className="text-slate-300 font-normal">(opt)</span>}</td>
                      <td className="py-2 text-right">
                        <Badge tone={r.status === "VERIFIED" ? "emerald" : ["PENDING_REVIEW", "UPLOADED"].includes(r.status) ? "amber" : r.status === "EXPIRED" ? "red" : "red"} dot>{r.status.replace(/_/g, " ")}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-2">
              {report.missing.length > 0 && (
                <div className="rounded-xl bg-red-50 border border-red-100 p-3.5">
                  <p className="text-[11px] font-bold text-red-700 uppercase tracking-wide mb-1.5">Missing ({report.missing.length})</p>
                  <div className="flex flex-wrap gap-1.5">{report.missing.map((m) => <span key={m} className="rounded-full bg-white border border-red-200 text-red-600 text-[11px] font-semibold px-2.5 py-1">{m.replace(/_/g, " ")}</span>)}</div>
                </div>
              )}
              {report.warnings.length > 0 && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5">
                  <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wide mb-1.5">Consistency flags</p>
                  <ul className="space-y-1">{report.warnings.map((w, i) => <li key={i} className="text-[11px] text-amber-800 flex gap-1.5"><AlertTriangle size={12} className="mt-0.5 shrink-0" />{w}</li>)}</ul>
                </div>
              )}
              {report.missing.length === 0 && report.warnings.length === 0 && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 text-[11px] font-bold text-emerald-700">✓ All required documents verified — ready for dispatch.</div>
              )}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Dossier */}
        <Card>
          <CardHead title={<span className="flex items-center gap-2"><QrCode size={15} className="text-violet-600" /> A4 Dossier & Vault</span>}
            sub={`Vector PDF • compliance matrix • MRZ block • QR vault link (15-min, authenticated)`} />
          <div className="px-5 pb-5 space-y-3">
            <KV k="Version" v={app.dossier_version || "not generated"} mono />
            <KV k="Generated" v={app.dossier_version ? "on demand" : "—"} />
            <ActionForm action={createDossierLinkAction} submit="Generate dossier + vault link" variant="brand" className="flex items-center gap-3 flex-wrap">
              <input type="hidden" name="applicant_id" value={app.id} />
            </ActionForm>
            <p className="text-[10px] text-slate-400">The link opens the vault page and the PDF embeds a fresh QR token. No public URLs are ever embedded in the dossier.</p>
          </div>
        </Card>

        {/* Agent runs */}
        <Card>
          <CardHead title={<span className="flex items-center gap-2"><Workflow size={15} className="text-indigo-500" /> Agent activity</span>} sub="Runs scoped to this applicant (dry-run outputs shown)" />
          <div className="px-5 pb-5 space-y-2">
            {runs.length === 0 && <Empty title="No agent runs yet" sub="Assign an agent from the dispatch queue or Agent Control Center." />}
            {runs.map((r) => {
              const agent = db.ai_agents.find((a) => a.id === r.agent_id);
              return (
                <div key={r.id} className="rounded-xl border border-slate-100 px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-slate-800">{agent?.name} <span className="text-slate-400 font-medium">• {r.task_type.replace(/_/g, " ")}</span></p>
                    <Badge tone={statusTone(r.status)} dot>{r.status.replace(/_/g, " ")}</Badge>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">{dtt(r.created_at)} • {r.needs_approval ? "requires human approval" : "no approval needed"}</p>
                  {r.output_payload && <details className="mt-1.5"><summary className="text-[11px] font-semibold text-indigo-600 cursor-pointer">Output payload</summary><div className="mt-1.5"><JsonView data={r.output_payload} /></div></details>}
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Dispatch */}
      <Card>
        <CardHead title="Dispatch to Master" sub={mode === "agency" ? "Submit your case for Super Admin review — correction, approval or agent assignment." : "History of dispatch requests for this applicant."} />
        <div className="px-5 pb-5 space-y-3">
          {dispatches.map((d) => (
            <div key={d.id} className="rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold text-slate-800">{d.request_type.replace(/_/g, " ")}</p>
                  <Badge tone={statusTone(d.status)} dot>{d.status.replace(/_/g, " ")}</Badge>
                  {d.priority !== "NORMAL" && <Badge tone="amber">{d.priority}</Badge>}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">{d.agency_note}</p>
                {d.master_note && <p className="text-[11px] text-indigo-700 mt-1 font-medium">Master: {d.master_note}</p>}
              </div>
              <span className="text-[10px] text-slate-400">{dtt(d.submitted_at)}</span>
            </div>
          ))}
          {mode === "agency" && (
            <ActionForm action={createDispatchAction} submit="Submit to Master Console" variant="brand">
              <input type="hidden" name="applicant_id" value={app.id} />
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Request type">
                  <Select name="request_type" defaultValue="DOSSIER_REVIEW">
                    <option value="DOSSIER_REVIEW">Dossier review</option>
                    <option value="FINAL_SUBMISSION">Final submission</option>
                    <option value="APPOINTMENT">Appointment booking</option>
                    <option value="OTHER">Other</option>
                  </Select>
                </Field>
                <Field label="Priority">
                  <Select name="priority" defaultValue="NORMAL"><option>NORMAL</option><option>HIGH</option><option>URGENT</option></Select>
                </Field>
              </div>
              <div className="mt-3"><Field label="Agency note"><Textarea name="agency_note" rows={2} placeholder="Context for the Master reviewer…" /></Field></div>
            </ActionForm>
          )}
        </div>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHead title="Audit timeline" sub="Every sensitive action on this applicant is logged (fail-closed RBAC + tenant scope)." />
        <div className="px-5 pb-5">
          {timeline.length === 0 ? <Empty title="No events yet" /> : (
            <ol className="relative border-l border-slate-200 ml-2 space-y-4">
              {timeline.map((l) => (
                <li key={l.id} className="ml-4">
                  <span className={`absolute -left-[5px] w-2.5 h-2.5 rounded-full ${l.action.startsWith("APPROVAL") ? "bg-emerald-500" : l.action.startsWith("DISPATCH") ? "bg-indigo-500" : "bg-slate-300"}`} />
                  <p className="text-xs font-bold text-slate-800">{l.action}</p>
                  <p className="text-[11px] text-slate-400">{l.actor_type} • {l.actor_user_id === "system" ? "system" : (db.profiles.find((p) => p.id === l.actor_user_id)?.full_name || l.actor_user_id || "auto")} • {timeAgo(l.created_at)}</p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </Card>
    </div>
  );
}

