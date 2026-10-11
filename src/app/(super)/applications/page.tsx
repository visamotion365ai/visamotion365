import Link from "next/link";
import { needSuper } from "@/lib/session";
import { liveDb } from "@/lib/agents";
import { PageHeader, Badge, statusTone, Card } from "@/components/ui";
import { STAGE_LABEL, STAGES } from "@/lib/schema";
import { STAGE_TONE } from "@/lib/workflow";
import { Workflow, ArrowRight } from "lucide-react";

export default async function ApplicationsPage() {
  await needSuper();
  const db = liveDb();
  const cols = STAGES.slice(0, 9);
  return (
    <div className="fade-up">
      <PageHeader crumb="Cases" title="Application Pipeline" sub="Live status across both tenants — drag-free board; stages advance through the workflow and approvals."
        right={<Badge tone="indigo" dot><Workflow size={12} /> live</Badge>} />
      <div className="overflow-x-auto pb-2 -mx-1 px-1">
        <div className="flex gap-3 min-w-[1500px]">
          {cols.map((st) => {
            const apps = db.applicants.filter((a) => a.application_stage === st);
            return (
              <div key={st} className="w-[176px] shrink-0">
                <div className="flex items-center justify-between px-1 mb-2">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">{STAGE_LABEL[st]}</p>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 rounded-full px-1.5 py-0.5">{apps.length}</span>
                </div>
                <div className="space-y-2">
                  {apps.map((a) => {
                    const t = db.tenants.find((x) => x.id === a.tenant_id);
                    const c = db.countries.find((x) => x.name === a.target_country);
                    return (
                      <Link key={a.id} href={`/applicants/${a.id}`} className="block rounded-xl bg-white border border-slate-200 shadow-card p-3 hover:border-indigo-300 transition">
                        <p className="text-xs font-bold text-slate-800">{c?.flag} {a.first_name} {a.last_name}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{a.target_country}</p>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-[9px] font-bold" style={{ color: t?.theme_config.primary }}>{t?.name.split(" ")[0]}</span>
                          <ArrowRight size={11} className="text-slate-300" />
                        </div>
                      </Link>
                    );
                  })}
                  {apps.length === 0 && <div className="rounded-xl border border-dashed border-slate-200 py-6 text-center text-[10px] text-slate-300 font-semibold">empty</div>}
                </div>
              </div>
            );
          })}
          {(["VISA_ISSUED", "CLOSED"] as const).map((st) => {
            const apps = db.applicants.filter((a) => a.application_stage === st);
            if (!apps.length) return null;
            return (
              <div key={st} className="w-[176px] shrink-0">
                <div className="flex items-center justify-between px-1 mb-2">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">{STAGE_LABEL[st]}</p>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 rounded-full px-1.5 py-0.5">{apps.length}</span>
                </div>
                <div className="space-y-2">
                  {apps.map((a) => (
                    <Link key={a.id} href={`/applicants/${a.id}`} className="block rounded-xl bg-white border border-slate-200 p-3">
                      <p className="text-xs font-bold text-slate-800">{a.first_name} {a.last_name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{a.target_country}</p>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
