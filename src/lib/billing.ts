import type { DB } from "./schema";

export function invoicePaid(db: DB, invoiceId: string): number {
  return db.payments
    .filter((p) => p.invoice_id === invoiceId && p.status === "PAID")
    .reduce((a, p) => a + p.amount, 0);
}
export function invoiceBalance(db: DB, inv: { id: string; total: number; status: string }): number {
  if (inv.status === "PAID") return 0;
  return Math.max(0, inv.total - invoicePaid(db, inv.id));
}
export function commissionSummary(db: DB, tenantId: string) {
  const jobs = db.job_orders.filter((j) => j.tenant_id === tenantId);
  const expected = jobs.reduce((a, j) => a + j.fee_per_worker * j.count * (j.commission_rate / 100), 0);
  const collected = jobs.filter((j) => j.status === "ACTIVE").reduce((a, j) => a + j.fee_per_worker * j.count * (j.commission_rate / 100) * 0.6, 0); // demo: 60% collected
  return {
    orders: jobs.length,
    workers: jobs.reduce((a, j) => a + j.count, 0),
    expected_usd: Math.round(expected),
    collected_usd: Math.round(collected),
    pending_usd: Math.round(expected - collected),
    rows: jobs.map((j) => {
      const emp = db.employers.find((e) => e.id === j.employer_id);
      return {
        id: j.id, employer: emp?.name || "—", role: j.role, count: j.count, destination: j.destination,
        fee: j.fee_per_worker, rate: j.commission_rate,
        commission: Math.round(j.fee_per_worker * j.count * (j.commission_rate / 100)), status: j.status
      };
    })
  };
}
