import Link from "next/link";
import { needSuper } from "@/lib/session";
import { liveDb, usageSummary } from "@/lib/agents";
import { tenantStats, listNotifications } from "@/lib/service";
import { runCompliance } from "@/lib/compliance";
import { PageHeader, Card, CardHead, Stat, Badge, statusTone, Progress, Table, Td, LinkBtn, Ring } from "@/components/ui";
import { STAGE_LABEL } from "@/lib/schema";
import { STAGES } from "@/lib/schema";
import { Users, Inbox, ShieldCheck, Cpu, Wallet, MonitorPlay, AlertTriangle, Activity, ArrowRight, Building2, TrendingUp } from "lucide-react";
import { dt, timeAgo, money } from "@/lib/format";

export default async function MasterDashboard() {
  const s = await needSuper();
  const db = liveDb();
  const t = tenantStats(db);
  const usage = usageSummary(db);
  const notifs = listNotifications(s).slice(0, 6);
  const pendingApprovals = db.approval_requests.filter((a) => a.status === "PENDING");
  const pendingDispatch = db.master_dispatch_requests.filter((d) => d.status === "PENDING_MASTER_REVIEW");
  const activeSessions = db.browser_sessions.filter((b) => !["STOPPED", "COMPLETED"].includes(b.status));
  const stageCounts = STAGES.map((st) => ({ st, n: db.applicants.filter((a) => a.application_stage === st).length }));
  const maxStage = Math.max(1, ...stageCounts.map((x) => x.n));
  const recentRuns = db.agent_runs.slice(0, 6);
  const complianceAlerts = db.applicants.map((a) => {
    const r = runCompliance(db, a);
    return { a, missing: r.missing.length, score: r.score };
  }).filter((x) => x.missing > 0).slice(0, 4);

  return (
    <div className="fade-up">
      <PageHeader crumb="Super Admin" title="Master Dashboard" sub="All tenants, all cases — live pipeline, agent usage and approvals in one view."
        right={<Badge tone={db.settings.dry_run ? "indigo" : "red"} dot>{db.settings.dry_run ? "DRY-RUN MODE" : "PRODUCTION"}</Badge>} />

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Stat icon={<Users size={18} />} label="Applicants" value={t.applicants} sub={`${t.active} active`} tone="indigo" />
        <Stat icon={<Inbox size={18} />} label="Dispatch pending" value={t.dispatched} sub="awaiting Master" tone="amber" />
        <Stat icon={<ShieldCheck size={18} />} label="Approvals" value={t.pendingApprovals} sub="high-impact waits" tone="red" />
        <Stat icon={<Cpu size={18} />} label="Agent runs" value={db.agent_runs.length} sub={`${db.agent_runs.filter((r) => r.status === "COMPLETED").length} completed`} tone="violet" />
        <Stat icon={<MonitorPlay size={18} />} label="Browser min" value={usage.minutes} sub={`≈ $${usage.costEstimate} (demo rate)`} tone="blue" />
        <Stat icon={<Wallet size={18} />} label="Collected" value={money(t.revenueCollected, "BDT")} sub={`$${t.outstanding.toLocaleString()} outstanding`} tone="emerald" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mt-4">
        <Card className="lg:col-span-2">
          <CardHead title="Application pipeline" sub="Live stage distribution across both tenants" right={<LinkBtn href="/applications">View all <ArrowRight size={12} /></LinkBtn>} />
          <div className="px-5 pb-5">
            <div className="grid grid-cols-6 gap-2">
              {stageCounts.map(({ st, n }) => (
                <div key={st} className="flex flex-col items-center gap-1.5">
                  <div className="w-full h-24 flex items-end">
                    <div className={`w-full rounded-t-lg ${n ? "bg-gradient-to-t from-indigo-600 to-violet-500" : "bg-slate-100"}`} style={{ height: `${Math.max(6, (n / maxStage) * 100)}%` }} />
                  </div>
                  <span className="text-[9px] font-bold text-slate-500 text-center leading-tight">{STAGE_LABEL[st].split(" ")[0]}</span>
                  <span className="text-[10px] font-black text-slate-800 -mt-1">{n}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <CardHead title="Cost control" sub={`Budget $${usage.budget}/mo • warn at ${Math.round(db.settings.warn_at * 100)}%`} />
          <div className="px-5 pb-5 space-y-3">
            <div className="flex items-center justify-between">
              <div><p className="text-2xl font-black text-slate-900">${usage.costEstimate}</p><p className="text-[11px] text-slate-400">est. browser + model usage (demo)</p></div>
              <Ring value={(usage.costEstimate / usage.budget) * 100} label="budget" />
            </div>
            <Progress value={(usage.costEstimate / usage.budget) * 100} tone={usage.costEstimate / usage.budget > db.settings.warn_at ? "amber" : "emerald"} />
            {db.settings.hardPause && <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-[11px] font-bold px-3 py-2">HARD PAUSE ON — approval-required agents suspended.</div>}
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
              <p className="text-[10px] font-bold uppercase text-slate-400 mb-1.5">Browser sessions live</p>
              {activeSessions.length === 0 && <p className="text-xs text-slate-400">None active — all sessions explicitly stopped.</p>}
              {activeSessions.map((b) => (
                <div key={b.id} className="flex items-center justify-between text-xs py-1">
                  <span className="font-mono text-slate-500">{b.external_session_id}</span>
                  <Badge tone={statusTone(b.status)} dot>{b.status.replace(/_/g, " ")}</Badge>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mt-4">
        <Card>
          <CardHead title="Tenant overview" right={<LinkBtn href="/tenants">Manage <ArrowRight size={12} /></LinkBtn>} />
          <div className="px-5 pb-5 space-y-3">
            {db.tenants.map((ten) => {
              const ts = tenantStats(db, ten.id);
              return (
                <Link key={ten.id} href={`/tenants/${ten.id}`} className="block rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-black" style={{ background: ten.theme_config.primary }}>
                        {ten.name.split(" ").map((x) => x[0]).slice(0, 2).join("")}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{ten.name}</p>
                        <p className="text-[10px] text-slate-400">{ten.subdomain} • {ten.services.join(", ")}</p>
                      </div>
                    </div>
                    <Badge tone={statusTone(ten.status)} dot>{ten.status}</Badge>
                  </div>
                  <div className="grid grid-cols-4 gap-2 mt-3">
                    {[["Applicants", ts.applicants], ["Pending Master", ts.dispatched], ["Lodged+", ts.lodged], ["Collected", money(ts.revenueCollected, ten.id === "t_wvc" ? "BDT" : "USD")]].map(([l, v]) => (
                      <div key={l as string} className="rounded-lg bg-slate-50 px-2.5 py-1.5">
                        <p className="text-[9px] font-bold uppercase text-slate-400">{l}</p>
                        <p className="text-xs font-black text-slate-800">{v}</p>
                      </div>
                    ))}
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardHead title="Pending approvals" sub="Irreversible actions wait here — fail closed" right={<LinkBtn href="/approvals">Queue <ArrowRight size={12} /></LinkBtn>} />
          <div className="px-5 pb-5 space-y-2">
            {pendingApprovals.length === 0 && <p className="text-xs text-slate-400">No pending approvals.</p>}
            {pendingApprovals.map((a) => {
              const app = db.applicants.find((x) => x.id === a.applicant_id);
              const agent = db.ai_agents.find((x) => x.id === a.agent_code?.replace("AGENT", "ag_") || x.agent_code === a.agent_code);
              return (
                <Link key={a.id} href={`/approvals?id=${a.id}`} className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3 hover:bg-amber-50">
                  <div>
                    <p className="text-xs font-bold text-slate-900 flex items-center gap-2">
                      <AlertTriangle size={13} className="text-amber-500" /> {a.action_type.replace(/_/g, " ")}
                      <span className="text-slate-400 font-medium">• {app ? `${app.first_name} ${app.last_name}` : "—"} ({db.tenants.find((t) => t.id === a.tenant_id)?.name.split(" ")[0]})</span>
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">expires {timeAgo(a.expires_at).replace(" ago", "")} from now • agent {a.agent_code}</p>
                  </div>
                  <Badge tone="amber" dot>Review</Badge>
                </Link>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mt-4">
        <Card>
          <CardHead title="Dispatch queue" right={<LinkBtn href="/dispatch-queue">Open <ArrowRight size={12} /></LinkBtn>} />
          <div className="px-5 pb-5 space-y-2">
            {pendingDispatch.length === 0 && <p className="text-xs text-slate-400">Queue is clear.</p>}
            {pendingDispatch.map((d) => {
              const app = db.applicants.find((x) => x.id === d.applicant_id);
              return (
                <Link key={d.id} href="/dispatch-queue" className="block rounded-xl border border-slate-100 px-4 py-2.5 hover:border-indigo-200">
                  <p className="text-xs font-bold text-slate-800">{app?.first_name} {app?.last_name} <span className="text-slate-400 font-medium">→ {app?.target_country}</span></p>
                  <p className="text-[10px] text-slate-400">{d.request_type.replace(/_/g, " ")} • {d.priority} • {timeAgo(d.submitted_at)}</p>
                </Link>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardHead title="Recent agent runs" right={<LinkBtn href="/agent-runs">All runs <ArrowRight size={12} /></LinkBtn>} />
          <div className="px-5 pb-5 space-y-2">
            {recentRuns.map((r) => {
              const agent = db.ai_agents.find((a) => a.id === r.agent_id);
              return (
                <div key={r.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{agent?.name}</p>
                    <p className="text-[10px] text-slate-400">{r.task_type.replace(/_/g, " ")} • {timeAgo(r.created_at)}</p>
                  </div>
                  <Badge tone={statusTone(r.status)} dot>{r.status.replace(/_/g, " ")}</Badge>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardHead title="Compliance alerts" sub="Applicants with missing documents" />
          <div className="px-5 pb-5 space-y-2">
            {complianceAlerts.length === 0 && <p className="text-xs text-slate-400">All files complete. 🎉</p>}
            {complianceAlerts.map(({ a, missing, score }) => (
              <Link key={a.id} href={`/applicants/${a.id}`} className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-2.5 hover:border-amber-200">
                <div>
                  <p className="text-xs font-bold text-slate-800">{a.first_name} {a.last_name} <span className="text-slate-400 font-medium">→ {a.target_country}</span></p>
                  <p className="text-[10px] text-amber-600 font-semibold">{missing} missing documents</p>
                </div>
                <span className={`text-sm font-black ${score >= 80 ? "text-emerald-600" : score >= 60 ? "text-amber-600" : "text-red-500"}`}>{score}</span>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
