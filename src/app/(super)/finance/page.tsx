import { needSuper } from "@/lib/session";
import { liveDb, usageSummary } from "@/lib/agents";
import { tenantStats } from "@/lib/service";
import { commissionSummary } from "@/lib/billing";
import { PageHeader, Card, CardHead, Stat, Badge, statusTone, Table, Td, Progress } from "@/components/ui";
import { Wallet, TrendingUp, CircleDollarSign, BadgeDollarSign, MonitorPlay, AlertTriangle } from "lucide-react";
import { money, dt } from "@/lib/format";

export default async function FinancePage() {
  await needSuper();
  const db = liveDb();
  const t = tenantStats(db);
  const usage = usageSummary(db);
  const comm = { wvc: commissionSummary(db, "t_wvc"), vfs: commissionSummary(db, "t_vfs") };
  const invoices = db.invoices;
  const payments = db.payments;

  return (
    <div className="fade-up">
      <PageHeader crumb="Finance" title="Billing & Commission" sub="Invoices, payments, recruitment commission reconciliation and agent/browser cost control." />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat icon={<Wallet size={18} />} label="Collected" value={money(t.revenueCollected, "BDT")} sub="all tenants" tone="emerald" />
        <Stat icon={<TrendingUp size={18} />} label="Outstanding" value={money(t.outstanding, "BDT")} sub="sent invoices" tone="amber" />
        <Stat icon={<BadgeDollarSign size={18} />} label="Commission (VFS)" value={`$${comm.vfs.expected_usd}`} sub={`${comm.vfs.orders} job orders`} tone="indigo" />
        <Stat icon={<MonitorPlay size={18} />} label="Agent cost est." value={`$${usage.costEstimate}`} sub={`${usage.minutes} browser min`} tone="violet" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mt-4">
        <Card>
          <CardHead title="Invoices" />
          <Table head={["Invoice", "Applicant", "Amount", "Status", "Due"]}>
            {invoices.map((i) => {
              const app = db.applicants.find((a) => a.id === i.applicant_id);
              return (
                <tr key={i.id} className="hover:bg-slate-50/60">
                  <Td><span className="font-mono text-xs font-bold">{i.number}</span></Td>
                  <Td><span className="text-xs">{app?.first_name} {app?.last_name}</span></Td>
                  <Td><span className="text-xs font-bold">{money(i.total, i.currency)}</span></Td>
                  <Td><Badge tone={statusTone(i.status)} dot>{i.status}</Badge></Td>
                  <Td><span className="text-[11px] text-slate-500">{dt(i.due_date)}</span></Td>
                </tr>
              );
            })}
          </Table>
        </Card>
        <Card>
          <CardHead title="Payments" sub="Demo gateway — production uses bKash/bank/payment provider webhooks with WEBHOOK_SIGNING_SECRET verification" />
          <Table head={["Ref", "Applicant", "Amount", "Method", "Paid"]}>
            {payments.map((p) => {
              const app = db.applicants.find((a) => a.id === p.applicant_id);
              return (
                <tr key={p.id} className="hover:bg-slate-50/60">
                  <Td><span className="font-mono text-xs font-bold">{p.reference}</span></Td>
                  <Td><span className="text-xs">{app?.first_name} {app?.last_name}</span></Td>
                  <Td><span className="text-xs font-bold">{money(p.amount, p.currency)}</span></Td>
                  <Td><span className="text-[11px] text-slate-500">{p.method}</span></Td>
                  <Td><span className="text-[11px] text-slate-500">{dt(p.paid_at)}</span></Td>
                </tr>
              );
            })}
          </Table>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mt-4">
        <Card>
          <CardHead title="Recruitment commission reconciliation (VFS)" sub="Agent 10 output — draft only, no transfers initiated" />
          <div className="px-5 pb-5">
            {comm.vfs.rows.length === 0 ? <p className="text-xs text-slate-400">No job orders.</p> : (
              <Table head={["Employer", "Role", "Workers", "Fee/wkr", "Rate", "Commission", "Status"]}>
                {comm.vfs.rows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60">
                    <Td><span className="text-xs font-semibold">{r.employer}</span></Td>
                    <Td><span className="text-[11px]">{r.role}</span></Td>
                    <Td><span className="text-xs font-bold">{r.count}</span></Td>
                    <Td><span className="text-xs">${r.fee.toLocaleString()}</span></Td>
                    <Td><span className="text-xs">{r.rate}%</span></Td>
                    <Td><span className="text-xs font-bold text-emerald-600">${r.commission}</span></Td>
                    <Td><Badge tone={statusTone(r.status)} dot>{r.status}</Badge></Td>
                  </tr>
                ))}
              </Table>
            )}
            <div className="flex gap-4 mt-3 text-xs">
              <span className="text-slate-500">Expected: <b className="text-slate-800">${comm.vfs.expected_usd}</b></span>
              <span className="text-slate-500">Collected: <b className="text-emerald-600">${comm.vfs.collected_usd}</b></span>
              <span className="text-slate-500">Pending: <b className="text-amber-600">${comm.vfs.pending_usd}</b></span>
            </div>
          </div>
        </Card>
        <Card>
          <CardHead title="Cost & usage control" sub={`Budget $${usage.budget}/month • warning at ${Math.round(db.settings.warn_at * 100)}%`} />
          <div className="px-5 pb-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-2xl font-black text-slate-900">${usage.costEstimate}<span className="text-xs text-slate-400 font-semibold"> / ${usage.budget}</span></p>
              <Badge tone={usage.costEstimate / usage.budget > db.settings.warn_at ? "amber" : "emerald"} dot>{Math.round((usage.costEstimate / usage.budget) * 100)}% used</Badge>
            </div>
            <Progress value={(usage.costEstimate / usage.budget) * 100} tone={usage.costEstimate / usage.budget > db.settings.warn_at ? "amber" : "emerald"} />
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-3.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Per-agent usage (today / limit)</p>
              {usage.perAgent.map(({ agent, today }) => (
                <div key={agent.id} className="flex items-center gap-2 py-1">
                  <span className="text-[11px] font-semibold text-slate-600 w-44 truncate">{agent.name}</span>
                  <Progress value={(today / agent.daily_limit) * 100} className="flex-1" />
                  <span className="text-[10px] font-bold text-slate-500 w-12 text-right">{today}/{agent.daily_limit}</span>
                </div>
              ))}
            </div>
            <div className="flex items-start gap-2 text-[11px] text-slate-500">
              <AlertTriangle size={13} className="text-amber-500 mt-0.5" />
              Controls: per-agent daily limits, per-task timeout, max browser minutes, bounded retries, duplicate-task prevention, explicit session stop, hard pause (Settings).
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
