import { needStaff } from "@/lib/session";
import { liveDb } from "@/lib/agents";
import { commissionSummary } from "@/lib/billing";
import { PageHeader, Card, CardHead, Stat, Badge, statusTone, Table, Td, Callout } from "@/components/ui";
import { ActionForm } from "@/components/forms";
import { payInvoiceAction } from "@/app/actions/main";
import { Wallet, TrendingUp, BadgeDollarSign, Receipt } from "lucide-react";
import { money, dt } from "@/lib/format";

export default async function AgencyBillingPage() {
  const s = await needStaff();
  const db = liveDb();
  const invs = db.invoices.filter((i) => i.tenant_id === s.tenant_id);
  const pays = db.payments.filter((p) => p.tenant_id === s.tenant_id);
  const comm = commissionSummary(db, s.tenant_id);
  const collected = pays.filter((p) => p.status === "PAID").reduce((a, p) => a + p.amount, 0);
  const outstanding = invs.filter((i) => i.status === "SENT").reduce((a, i) => a + Math.max(0, i.total - pays.filter((p) => p.invoice_id === i.id && p.status === "PAID").reduce((x, p) => x + p.amount, 0)), 0);

  return (
    <div className="fade-up">
      <PageHeader crumb="Agency" title="Billing" sub="Your invoices, collections and (for recruitment) employer commission reconciliation." />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Stat icon={<Wallet size={18} />} label="Collected" value={money(collected, s.tenant_id === "t_wvc" ? "BDT" : "USD")} tone="emerald" />
        <Stat icon={<TrendingUp size={18} />} label="Outstanding" value={money(outstanding, s.tenant_id === "t_wvc" ? "BDT" : "USD")} tone="amber" />
        <Stat icon={<BadgeDollarSign size={18} />} label="Commission" value={comm.workers ? `$${comm.expected_usd}` : "—"} sub={comm.workers ? `${comm.workers} workers` : "recruitment only"} tone="indigo" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mt-4">
        <Card>
          <CardHead title="Invoices" />
          <div className="px-5 pb-5 space-y-2">
            {invs.map((i) => {
              const app = db.applicants.find((a) => a.id === i.applicant_id);
              const paid = pays.filter((p) => p.invoice_id === i.id && p.status === "PAID").reduce((a, p) => a + p.amount, 0);
              const bal = Math.max(0, i.total - paid);
              return (
                <div key={i.id} className="rounded-xl border border-slate-100 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-900 font-mono">{i.number}</p>
                      <p className="text-[10px] text-slate-400">{app?.first_name} {app?.last_name} • due {dt(i.due_date)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-slate-900">{money(i.total, i.currency)}</p>
                      <Badge tone={statusTone(i.status)} dot>{i.status}</Badge>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {i.items.map((it, idx) => <span key={idx} className="rounded-full bg-slate-100 text-slate-500 text-[10px] font-medium px-2 py-0.5">{it.desc} — {money(it.amount, i.currency)}</span>)}
                  </div>
                  {bal > 0 && i.status !== "PAID" && (
                    <div className="mt-3">
                      <ActionForm action={payInvoiceAction} submit={`Record payment of ${money(bal, i.currency)} (demo gateway)`} variant="success">
                        <input type="hidden" name="invoice_id" value={i.id} />
                        <input type="hidden" name="method" value={s.tenant_id === "t_wvc" ? "bKash" : "Bank transfer"} />
                      </ActionForm>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHead title="Payments" />
            <div className="px-5 pb-5 space-y-2">
              {pays.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-2.5">
                  <div>
                    <p className="text-xs font-bold text-slate-800 font-mono">{p.reference}</p>
                    <p className="text-[10px] text-slate-400">{p.method} • {dt(p.paid_at)}</p>
                  </div>
                  <p className="text-sm font-black text-emerald-600">{money(p.amount, p.currency)}</p>
                </div>
              ))}
              {pays.length === 0 && <p className="text-xs text-slate-400">No payments yet.</p>}
            </div>
          </Card>
          {comm.rows.length > 0 && (
            <Card>
              <CardHead title="Employer commission" sub="Agent 10 reconciliation (draft — no transfers initiated)" />
              <div className="px-5 pb-5">
                <Table head={["Employer", "Workers", "Commission", "Status"]}>
                  {comm.rows.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/60">
                      <Td><span className="text-xs font-semibold">{r.employer}</span><p className="text-[10px] text-slate-400">{r.role} • {r.destination}</p></Td>
                      <Td><span className="text-xs font-bold">{r.count}</span></Td>
                      <Td><span className="text-xs font-bold text-emerald-600">${r.commission} <span className="text-slate-400 font-normal">({r.rate}%)</span></span></Td>
                      <Td><Badge tone={statusTone(r.status)} dot>{r.status}</Badge></Td>
                    </tr>
                  ))}
                </Table>
                <div className="flex gap-4 mt-3 text-[11px] text-slate-500">
                  <span>Expected <b>${comm.expected_usd}</b></span><span>Collected <b className="text-emerald-600">${comm.collected_usd}</b></span><span>Pending <b className="text-amber-600">${comm.pending_usd}</b></span>
                </div>
              </div>
            </Card>
          )}
          <Callout tone="info">Production: bKash / bank / payment provider with signed webhooks (WEBHOOK_SIGNING_SECRET). Refunds and bank transfers always require Master approval.</Callout>
        </div>
      </div>
    </div>
  );
}
