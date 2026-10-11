import Link from "next/link";
import { needSuper } from "@/lib/session";
import { liveDb } from "@/lib/agents";
import { PageHeader, Card, CardHead, Badge, statusTone, Field, Select, Textarea, Btn, Empty, Tabs } from "@/components/ui";
import { ActionForm } from "@/components/forms";
import { decideDispatchAction } from "@/app/actions/main";
import { Inbox, CheckCircle2, AlertTriangle, XCircle, Bot } from "lucide-react";
import { dtt } from "@/lib/format";

export default async function DispatchQueuePage({ searchParams }: { searchParams: Promise<{ open?: string }> }) {
  const s = await needSuper();
  const db = liveDb();
  const sp = await searchParams;
  const all = db.master_dispatch_requests;
  const pending = all.filter((d) => d.status === "PENDING_MASTER_REVIEW");
  const decided = all.filter((d) => d.status !== "PENDING_MASTER_REVIEW");
  const openId = sp.open || pending[0]?.id;
  const open = all.find((d) => d.id === openId) || pending[0];

  return (
    <div className="fade-up">
      <PageHeader crumb="Cases" title="Master Dispatch Queue" sub="Agency requests for Master review — correct, approve, assign an agent, or reject." />
      <div className="grid lg:grid-cols-[380px_1fr] gap-4">
        <Card>
          <CardHead title="Queue" sub={`${pending.length} pending`} />
          <div className="px-4 pb-4 space-y-2 max-h-[560px] overflow-y-auto">
            {pending.length === 0 && <Empty icon={<Inbox size={18} />} title="Queue clear" sub="No pending dispatch requests." />}
            {pending.map((d) => {
              const app = db.applicants.find((a) => a.id === d.applicant_id);
              const t = db.tenants.find((x) => x.id === d.tenant_id);
              return (
                <Link key={d.id} href={`/dispatch-queue?open=${d.id}`}
                  className={`block rounded-xl border px-4 py-3 transition ${open?.id === d.id ? "border-indigo-300 bg-indigo-50/50" : "border-slate-100 hover:border-slate-300"}`}>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-900">{app?.first_name} {app?.last_name}</p>
                    {d.priority !== "NORMAL" && <Badge tone="amber">{d.priority}</Badge>}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">{app?.target_country} • {d.request_type.replace(/_/g, " ")}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[9px] font-bold" style={{ color: t?.theme_config.primary }}>{t?.name.split(" ")[0]}</span>
                    <span className="text-[9px] text-slate-400">{dtt(d.submitted_at)}</span>
                  </div>
                </Link>
              );
            })}
            {decided.length > 0 && (
              <div className="pt-3 border-t border-slate-100">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Decided</p>
                {decided.slice(0, 5).map((d) => (
                  <Link key={d.id} href={`/dispatch-queue?open=${d.id}`} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-slate-50 mb-1">
                    <p className="text-[11px] font-semibold text-slate-600">{db.applicants.find((a) => a.id === d.applicant_id)?.first_name} {db.applicants.find((a) => a.id === d.applicant_id)?.last_name}</p>
                    <Badge tone={statusTone(d.status)} dot>{d.decision || d.status}</Badge>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </Card>

        <div>
          {!open ? (
            <Card className="p-8"><Empty icon={<Inbox size={20} />} title="Select a request" sub="Pick a dispatch request from the queue to review it." /></Card>
          ) : (
            (() => {
              const app = db.applicants.find((a) => a.id === open.applicant_id)!;
              const t = db.tenants.find((x) => x.id === open.tenant_id)!;
              const p = db.visa_programs.find((x) => x.id === app.visa_program_id);
              return (
                <div className="space-y-4">
                  <Card className="p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-base font-bold text-slate-900">{app.first_name} {app.last_name} <span className="text-slate-400 text-sm font-medium">→ {app.target_country}</span></p>
                        <p className="text-xs text-slate-500 mt-0.5">{p?.name} • {t.name}</p>
                      </div>
                      <div className="flex gap-2">
                        <Badge tone={statusTone(open.status)} dot>{open.status.replace(/_/g, " ")}</Badge>
                        <Badge tone="slate">{open.priority}</Badge>
                      </div>
                    </div>
                    <div className="mt-4 rounded-xl bg-slate-50 border border-slate-100 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Agency note</p>
                      <p className="text-xs text-slate-700 leading-relaxed">{open.agency_note || "—"}</p>
                      {open.master_note && <p className="text-xs text-indigo-700 mt-2 font-medium">Master: {open.master_note}</p>}
                    </div>
                    <Link href={`/applicants/${app.id}`} className="inline-flex items-center gap-1.5 mt-3 text-xs font-bold text-indigo-600 hover:underline">Open full applicant file ↗</Link>
                  </Card>

                  <Card>
                    <CardHead title="Master decision" sub="Every decision is audit-logged. Assigning an agent starts a dry-run and may create an approval request." />
                    <div className="px-5 pb-5 grid md:grid-cols-2 gap-4">
                      <ActionForm action={decideDispatchAction} submit="↩ Request correction" variant="outline">
                        <input type="hidden" name="id" value={open.id} />
                        <input type="hidden" name="decision" value="CORRECTION" />
                        <Textarea name="master_note" rows={3} placeholder="What must the agency fix? (sent to agency as feedback)" />
                      </ActionForm>
                      <div className="space-y-3">
                        <ActionForm action={decideDispatchAction} submit="✓ Approve dossier" variant="success">
                          <input type="hidden" name="id" value={open.id} />
                          <input type="hidden" name="decision" value="APPROVE_DOSSIER" />
                          <Textarea name="master_note" rows={2} placeholder="Optional note to agency" />
                        </ActionForm>
                        <ActionForm action={decideDispatchAction} submit="✕ Reject / close case" variant="danger">
                          <input type="hidden" name="id" value={open.id} />
                          <input type="hidden" name="decision" value="REJECT" />
                          <Textarea name="master_note" rows={2} placeholder="Reason (sent to agency)" />
                        </ActionForm>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5"><Bot size={13} /> Or assign an agent (creates a run + approval if required)</p>
                        <ActionForm action={decideDispatchAction} submit="Assign agent & run (dry-run)">
                          <input type="hidden" name="id" value={open.id} />
                          <input type="hidden" name="decision" value="ASSIGN_AGENT" />
                          <div className="grid sm:grid-cols-3 gap-3">
                            <Field label="Agent">
                              <Select name="agent_id" defaultValue="ag_03">
                                {db.ai_agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                              </Select>
                            </Field>
                            <div className="sm:col-span-2"><Field label="Note (optional)"><Textarea name="master_note" rows={1} placeholder="Context for the agent run" /></Field></div>
                          </div>
                        </ActionForm>
                      </div>
                    </div>
                  </Card>
                </div>
              );
            })()
          )}
        </div>
      </div>
    </div>
  );
}
