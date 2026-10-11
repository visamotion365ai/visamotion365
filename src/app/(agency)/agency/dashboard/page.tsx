import Link from "next/link";
import { needStaff } from "@/lib/session";
import { liveDb } from "@/lib/agents";
import { tenantStats } from "@/lib/service";
import { PageHeader, Card, CardHead, Stat, Badge, statusTone, LinkBtn, Progress } from "@/components/ui";
import { STAGE_LABEL, STAGES } from "@/lib/schema";
import { Users, Inbox, FileText, Wallet, Plus, ArrowRight, AlertTriangle, MessageSquare } from "lucide-react";
import { money, dt, timeAgo } from "@/lib/format";

export default async function AgencyDashboard() {
  const s = await needStaff();
  const db = liveDb();
  const t = tenantStats(db, s.tenant_id!);
  const apps = db.applicants.filter((a) => a.tenant_id === s.tenant_id);
  const dispatches = db.master_dispatch_requests.filter((d) => d.tenant_id === s.tenant_id);
  const notifs = db.notifications.filter((n) => n.tenant_id === s.tenant_id && !n.read).slice(0, 5);
  const pendingDocs = db.client_documents.filter((d) => d.tenant_id === s.tenant_id && ["PENDING_REVIEW", "UPLOADED", "OCR_PROCESSING"].includes(d.verification_status));
  const stageCounts = STAGES.slice(0, 8).map((st) => ({ st, n: apps.filter((a) => a.application_stage === st).length }));

  return (
    <div className="fade-up">
      <PageHeader crumb="Agency" title={`Hello, ${s.name.split(" ")[0]} 👋`} sub="Your case portfolio at a glance — documents, dispatch status and finance."
        right={<Link href="/agency/applicants/new" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-bold px-4 py-2.5 hover:opacity-90"><Plus size={15} /> New applicant</Link>} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat icon={<Users size={18} />} label="Applicants" value={t.applicants} sub={`${t.active} active`} tone="indigo" />
        <Stat icon={<Inbox size={18} />} label="At Master" value={t.dispatched} sub="awaiting review" tone="amber" />
        <Stat icon={<FileText size={18} />} label="Docs in review" value={pendingDocs.length} sub="needs your upload/fix" tone="violet" />
        <Stat icon={<Wallet size={18} />} label="Outstanding" value={money(t.outstanding, s.tenant_id === "t_wvc" ? "BDT" : "USD")} sub="to collect" tone="emerald" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mt-4">
        <Card className="lg:col-span-2">
          <CardHead title="My pipeline" right={<LinkBtn href="/agency/applications">Full board <ArrowRight size={12} /></LinkBtn>} />
          <div className="px-5 pb-5">
            <div className="space-y-2">
              {stageCounts.map(({ st, n }) => (
                <div key={st} className="flex items-center gap-3">
                  <span className="w-40 text-[11px] font-semibold text-slate-500 truncate">{STAGE_LABEL[st]}</span>
                  <Progress value={(n / Math.max(1, t.applicants)) * 100} className="flex-1" />
                  <span className="w-5 text-right text-xs font-black text-slate-800">{n}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
        <Card>
          <CardHead title="Notifications" />
          <div className="px-5 pb-5 space-y-2">
            {notifs.length === 0 && <p className="text-xs text-slate-400">You're all caught up.</p>}
            {notifs.map((n) => (
              <div key={n.id} className="rounded-xl border border-slate-100 px-3.5 py-2.5">
                <p className="text-xs font-bold text-slate-800">{n.title}</p>
                <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">{n.body}</p>
                <p className="text-[9px] text-slate-300 mt-1">{timeAgo(n.created_at)}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mt-4">
        <Card>
          <CardHead title="Recent applicants" right={<LinkBtn href="/agency/applicants">All <ArrowRight size={12} /></LinkBtn>} />
          <div className="px-5 pb-5 space-y-2">
            {apps.slice(0, 5).map((a) => (
              <Link key={a.id} href={`/agency/applicants/${a.id}`} className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3 hover:border-indigo-200">
                <div>
                  <p className="text-xs font-bold text-slate-800">{a.first_name} {a.last_name}</p>
                  <p className="text-[10px] text-slate-400">{a.target_country} • {dt(a.created_at)}</p>
                </div>
                <Badge tone={statusTone(a.application_stage)} dot>{STAGE_LABEL[a.application_stage]}</Badge>
              </Link>
            ))}
          </div>
        </Card>
        <Card>
          <CardHead title="Dispatch status" sub="Master feedback lands here" right={<LinkBtn href="/agency/dispatch-requests">Open <ArrowRight size={12} /></LinkBtn>} />
          <div className="px-5 pb-5 space-y-2">
            {dispatches.slice(0, 4).map((d) => {
              const app = db.applicants.find((a) => a.id === d.applicant_id);
              return (
                <div key={d.id} className="rounded-xl border border-slate-100 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-800">{app?.first_name} {app?.last_name} <span className="text-slate-400 font-medium">→ {app?.target_country}</span></p>
                    <Badge tone={statusTone(d.status)} dot>{d.status.replace(/_/g, " ")}</Badge>
                  </div>
                  {d.master_note && <p className="text-[11px] text-indigo-700 mt-1.5 flex items-start gap-1.5"><AlertTriangle size={12} className="mt-0.5 shrink-0" /> {d.master_note}</p>}
                  <p className="text-[10px] text-slate-400 mt-1">{d.request_type.replace(/_/g, " ")} • {dtt(d.submitted_at)}</p>
                </div>
              );
            })}
            {dispatches.length === 0 && <p className="text-xs text-slate-400">No dispatch requests yet.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
import { dtt } from "@/lib/format";
