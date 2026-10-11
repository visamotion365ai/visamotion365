import Link from "next/link";
import { needSuper } from "@/lib/session";
import { liveDb } from "@/lib/agents";
import { PageHeader, Card, CardHead, Badge, statusTone, Field, Textarea, Callout, Empty, JsonView, KV } from "@/components/ui";
import { ActionForm } from "@/components/forms";
import { decideApprovalAction } from "@/app/actions/main";
import { ShieldCheck, AlertTriangle, CheckCircle2, XCircle, Clock, Image as ImageIcon } from "lucide-react";
import { dtt, timeAgo } from "@/lib/format";

export default async function ApprovalsPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const s = await needSuper();
  const db = liveDb();
  const sp = await searchParams;
  const all = db.approval_requests;
  const open = all.find((a) => a.id === sp.id) || all.find((a) => a.status === "PENDING") || all[0];

  return (
    <div className="fade-up">
      <PageHeader crumb="AI Operations" title="Human Approval Queue"
        sub="Every high-impact action (final submit, payment, booking, publish) pauses here. Approvals are task-bound, short-lived, and fail closed." />
      <div className="grid lg:grid-cols-[380px_1fr] gap-4">
        <Card>
          <CardHead title="Requests" sub={`${all.filter((a) => a.status === "PENDING").length} pending`} />
          <div className="px-4 pb-4 space-y-2 max-h-[600px] overflow-y-auto">
            {all.map((a) => {
              const app = db.applicants.find((x) => x.id === a.applicant_id);
              const t = db.tenants.find((x) => x.id === a.tenant_id);
              const expired = a.status === "PENDING" && new Date(a.expires_at).getTime() < Date.now();
              return (
                <Link key={a.id} href={`/approvals?id=${a.id}`}
                  className={`block rounded-xl border px-4 py-3 transition ${open?.id === a.id ? "border-indigo-300 bg-indigo-50/50" : "border-slate-100 hover:border-slate-300"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5"><ShieldCheck size={12} className="text-indigo-500" /> {a.action_type.replace(/_/g, " ")}</p>
                    <Badge tone={statusTone(expired ? "EXPIRED" : a.status)} dot>{expired ? "EXPIRED" : a.status}</Badge>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">{app ? `${app.first_name} ${app.last_name}` : "tenant-level"} • {t?.name.split(" ")[0]} • {a.agent_code}</p>
                  {a.status === "PENDING" && <p className="text-[10px] text-amber-600 font-semibold mt-1 flex items-center gap-1"><Clock size={10} /> expires {timeAgo(a.expires_at).replace(" ago", "")} from now</p>}
                </Link>
              );
            })}
          </div>
        </Card>

        {open ? (() => {
          const app = db.applicants.find((x) => x.id === open.applicant_id);
          const t = db.tenants.find((x) => x.id === open.tenant_id);
          const agent = db.ai_agents.find((x) => x.agent_code === open.agent_code);
          const run = db.agent_runs.find((r) => r.id === open.agent_run_id);
          const bs = run ? db.browser_sessions.find((b) => b.agent_run_id === run.id) : undefined;
          const expired = open.status === "PENDING" && new Date(open.expires_at).getTime() < Date.now();
          return (
            <div className="space-y-4">
              <Card className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-base font-bold text-slate-900">{open.action_type.replace(/_/g, " ")}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{agent?.name} • run {open.agent_run_id?.slice(0, 12)}… • requested {dtt(open.created_at)}</p>
                  </div>
                  <Badge tone={statusTone(expired ? "EXPIRED" : open.status)} dot>{expired ? "EXPIRED" : open.status}</Badge>
                </div>
                <div className="grid md:grid-cols-2 gap-x-6 mt-4">
                  <div>
                    <KV k="Tenant" v={t?.name} />
                    <KV k="Applicant" v={app ? `${app.first_name} ${app.last_name} (${app.target_country})` : "—"} />
                    <KV k="Agent" v={agent?.name || open.agent_code} />
                    <KV k="External system" v={open.action_payload?.target_system || "—"} />
                  </div>
                  <div>
                    <KV k="Amount (if any)" v={open.action_payload?.payment_amount || "—"} />
                    <KV k="Documents to upload" v={open.action_payload?.docs_to_upload ?? "—"} />
                    <KV k="Agent confidence" v={open.action_payload?.confidence != null ? `${Math.round(open.action_payload.confidence * 100)}%` : "—"} />
                    <KV k="Browser session" v={bs ? bs.external_session_id : "—"} />
                  </div>
                </div>
                {Array.isArray(open.action_payload?.risks) && open.action_payload.risks.length > 0 && (
                  <div className="mt-3 rounded-xl bg-red-50 border border-red-200 p-3.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-red-600 mb-1.5">Risks & warnings</p>
                    {open.action_payload.risks.map((r: string, i: number) => <p key={i} className="text-[11px] text-red-700 flex items-start gap-1.5"><AlertTriangle size={12} className="mt-0.5 shrink-0" /> {r}</p>)}
                  </div>
                )}
                <details className="mt-3"><summary className="text-[11px] font-bold text-indigo-600 cursor-pointer">Full action payload (human-readable preview)</summary>
                  <div className="mt-2"><JsonView data={open.action_payload} /></div>
                </details>
                {bs && <p className="text-[10px] text-slate-400 mt-3 flex items-center gap-1.5"><ImageIcon size={12} /> Screenshot: {bs.screenshot_url || "captured (simulated)"} • Recording: {bs.recording_url || "available"}</p>}
              </Card>

              <Card>
                <CardHead title="Decision" sub="Approving issues a short-lived token bound to THIS task only (15 min). Rejecting cancels the run and stops the browser session." />
                <div className="px-5 pb-5 grid md:grid-cols-2 gap-4">
                  {open.status === "PENDING" ? (
                    <>
                      <ActionForm action={decideApprovalAction} submit={<span className="flex items-center gap-2"><CheckCircle2 size={15} /> Approve & execute</span>} variant="success">
                        <input type="hidden" name="id" value={open.id} />
                        <input type="hidden" name="approve" value="1" />
                        <Textarea name="note" rows={2} placeholder="Approval note (audited)" />
                      </ActionForm>
                      <ActionForm action={decideApprovalAction} submit={<span className="flex items-center gap-2"><XCircle size={15} /> Reject — no external action</span>} variant="danger">
                        <input type="hidden" name="id" value={open.id} />
                        <input type="hidden" name="approve" value="0" />
                        <Textarea name="note" rows={2} placeholder="Rejection reason (audited)" />
                      </ActionForm>
                    </>
                  ) : (
                    <Callout tone={open.status === "APPROVED" ? "ok" : open.status === "REJECTED" ? "error" : "info"}>
                      Status: <b>{open.status}</b> {open.approved_by && <>by {db.profiles.find((p) => p.id === open.approved_by)?.full_name}</>} at {open.approved_at ? dtt(open.approved_at) : ""}. {open.note && <>Note: {open.note}</>}
                      {open.status === "EXPIRED" && " The window lapsed — the run was cancelled (fail closed). Create a fresh request to proceed."}
                    </Callout>
                  )}
                </div>
              </Card>
            </div>
          );
        })() : <Card className="p-8"><Empty title="No approval requests" /></Card>}
      </div>
    </div>
  );
}
