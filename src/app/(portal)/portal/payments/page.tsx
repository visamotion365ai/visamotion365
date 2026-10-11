import { needPortal } from "@/lib/session";
import { liveDb } from "@/lib/agents";
import { Card, Badge, statusTone } from "@/components/ui";
import { ActionForm } from "@/components/forms";
import { payInvoiceAction } from "@/app/actions/main";
import { Receipt, Wallet } from "lucide-react";
import { money, dt } from "@/lib/format";

export default async function PortalPaymentsPage() {
  const s = await needPortal();
  const db = liveDb();
  const app = db.applicants.find((a) => a.id === s.applicant_id)!;
  const invs = db.invoices.filter((i) => i.applicant_id === app.id);
  const pays = db.payments.filter((p) => p.applicant_id === app.id);

  return (
    <div className="px-4 pt-5 pb-6 space-y-4">
      <div>
        <h1 className="text-lg font-black text-slate-900 flex items-center gap-2"><Receipt size={18} className="text-indigo-600" /> Payments</h1>
        <p className="text-[11px] text-slate-400 mt-0.5">Invoices and receipts for your case.</p>
      </div>

      {invs.map((i) => {
        const paid = pays.filter((p) => p.invoice_id === i.id && p.status === "PAID").reduce((a, p) => a + p.amount, 0);
        const bal = Math.max(0, i.total - paid);
        return (
          <Card key={i.id} className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold font-mono text-slate-900">{i.number}</p>
              <Badge tone={statusTone(i.status)} dot>{i.status}</Badge>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">due {dt(i.due_date)}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {i.items.map((it, idx) => <span key={idx} className="rounded-full bg-slate-100 text-slate-500 text-[10px] font-medium px-2 py-0.5">{it.desc} • {money(it.amount, i.currency)}</span>)}
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
              <span className="text-[11px] text-slate-400">Balance</span>
              <span className={`text-base font-black ${bal > 0 ? "text-slate-900" : "text-emerald-600"}`}>{money(bal, i.currency)}</span>
            </div>
            {bal > 0 && (
              <div className="mt-3">
                <ActionForm action={payInvoiceAction} submit={`Pay ${money(bal, i.currency)} (demo gateway)`} variant="brand">
                  <input type="hidden" name="invoice_id" value={i.id} />
                  <input type="hidden" name="method" value="bKash (demo)" />
                </ActionForm>
              </div>
            )}
          </Card>
        );
      })}
      {invs.length === 0 && <Card className="p-6 text-center"><Wallet size={20} className="mx-auto text-slate-300 mb-2" /><p className="text-xs font-bold text-slate-600">No invoices yet</p></Card>}

      {pays.length > 0 && (
        <Card className="p-4">
          <p className="text-xs font-black text-slate-900 mb-2.5">Payment history</p>
          {pays.map((p) => (
            <div key={p.id} className="flex items-center justify-between py-2 border-t border-slate-100 first:border-0">
              <div>
                <p className="text-[11px] font-bold font-mono text-slate-700">{p.reference}</p>
                <p className="text-[10px] text-slate-400">{p.method} • {dt(p.paid_at)}</p>
              </div>
              <span className="text-sm font-black text-emerald-600">{money(p.amount, p.currency)}</span>
            </div>
          ))}
        </Card>
      )}
      <p className="text-[10px] text-slate-400 text-center">Demo gateway — no real money moves. Production uses bKash/bank with signed webhooks and Master-approved refunds.</p>
    </div>
  );
}
