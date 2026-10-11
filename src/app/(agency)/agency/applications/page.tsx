import Link from "next/link";
import { needStaff } from "@/lib/session";
import { listApplicants } from "@/lib/service";
import { liveDb } from "@/lib/agents";
import { PageHeader, Badge, statusTone } from "@/components/ui";
import { STAGE_LABEL, STAGES } from "@/lib/schema";

export default async function AgencyApplicationsPage() {
  const s = await needStaff();
  const db = liveDb();
  const apps = listApplicants(s);
  const cols = STAGES.slice(0, 9);
  return (
    <div className="fade-up">
      <PageHeader crumb="Agency" title="My Pipeline" sub="Live stages for your tenant. Stages advance as documents complete, Master approves and agents run." />
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-3 min-w-[1400px]">
          {cols.map((st) => {
            const list = apps.filter((a) => a.application_stage === st);
            return (
              <div key={st} className="w-[168px] shrink-0">
                <div className="flex items-center justify-between px-1 mb-2">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">{STAGE_LABEL[st]}</p>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 rounded-full px-1.5 py-0.5">{list.length}</span>
                </div>
                <div className="space-y-2">
                  {list.map((a) => (
                    <Link key={a.id} href={`/agency/applicants/${a.id}`} className="block rounded-xl bg-white border border-slate-200 shadow-card p-3 hover:border-indigo-300">
                      <p className="text-xs font-bold text-slate-800">{a.first_name} {a.last_name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{a.target_country}</p>
                    </Link>
                  ))}
                  {list.length === 0 && <div className="rounded-xl border border-dashed border-slate-200 py-6 text-center text-[10px] text-slate-300 font-semibold">empty</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
