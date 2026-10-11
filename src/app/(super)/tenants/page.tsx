import Link from "next/link";
import { needSuper } from "@/lib/session";
import { liveDb } from "@/lib/agents";
import { tenantStats } from "@/lib/service";
import { PageHeader, Card, Badge, statusTone, LinkBtn } from "@/components/ui";
import { Building2, Users, Inbox, CheckCircle2, ArrowRight } from "lucide-react";
import { money, dt } from "@/lib/format";

export default async function TenantsPage() {
  await needSuper();
  const db = liveDb();
  return (
    <div className="fade-up">
      <PageHeader crumb="Super Admin" title="Tenants" sub="Two agency tenants, one console. Each tenant only ever sees its own data (RLS + service-layer checks)." />
      <div className="grid md:grid-cols-2 gap-4">
        {db.tenants.map((t) => {
          const ts = tenantStats(db, t.id);
          const members = db.organization_members.filter((m) => m.tenant_id === t.id);
          return (
            <Card key={t.id} className="overflow-hidden">
              <div className="h-1.5" style={{ background: t.theme_config.primary }} />
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-black" style={{ background: t.theme_config.primary }}>
                      {t.name.split(" ").map((x) => x[0]).slice(0, 2).join("")}
                    </div>
                    <div>
                      <p className="text-base font-bold text-slate-900">{t.name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{t.id} • {t.subdomain}</p>
                    </div>
                  </div>
                  <Badge tone={statusTone(t.status)} dot>{t.status}</Badge>
                </div>
                <div className="mt-4 grid grid-cols-4 gap-2">
                  {[["Applicants", ts.applicants, <Users size={13} key="u" />], ["Master queue", ts.dispatched, <Inbox size={13} key="i" />], ["Lodged+", ts.lodged, <CheckCircle2 size={13} key="c" />], ["Collected", money(ts.revenueCollected, t.id === "t_wvc" ? "BDT" : "USD"), <Building2 size={13} key="b" />]].map(([l, v, ic], i) => (
                    <div key={i} className="rounded-xl bg-slate-50 px-3 py-2">
                      <p className="flex items-center gap-1 text-[9px] font-bold uppercase text-slate-400">{ic}{l}</p>
                      <p className="text-sm font-black text-slate-800 mt-0.5">{v}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {t.services.map((sv) => <span key={sv} className="rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold px-2.5 py-1">{sv}</span>)}
                  {t.countries.map((c) => <span key={c} className="rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-semibold px-2.5 py-1">{c}</span>)}
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                  <p className="text-[11px] text-slate-400">{members.length} members • created {dt(t.created_at)}</p>
                  <LinkBtn href={`/tenants/${t.id}`}>Manage <ArrowRight size={12} /></LinkBtn>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
