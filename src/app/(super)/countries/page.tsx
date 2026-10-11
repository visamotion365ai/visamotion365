import { needSuper } from "@/lib/session";
import { liveDb } from "@/lib/agents";
import { PageHeader, Card, CardHead, Badge, statusTone, Stepper } from "@/components/ui";
import { COUNTRY_WORKFLOWS } from "@/lib/workflow";
import { Globe2, CheckCircle2 } from "lucide-react";

export default async function CountriesPage() {
  await needSuper();
  const db = liveDb();
  return (
    <div className="fade-up">
      <PageHeader crumb="Catalog" title="Country-wise Visa Workflows" sub="Five destinations with defined step pipelines. Each step shows who owns it (applicant / agency / master / agent)." />
      <div className="grid lg:grid-cols-2 gap-4">
        {db.countries.map((c) => {
          const programs = db.visa_programs.filter((p) => p.country_id === c.id);
          const wf = COUNTRY_WORKFLOWS[c.name] || [];
          return (
            <Card key={c.id}>
              <CardHead title={<span>{c.flag} {c.name}</span>} sub={`${c.code} • ${programs.length} programs`} right={<Badge tone="emerald" dot>Active</Badge>} />
              <div className="px-5 pb-5">
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {programs.map((p) => (
                    <span key={p.id} className="rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold px-2.5 py-1">
                      {p.name.split("—")[1]?.trim()} <span className="text-slate-300">({p.category})</span>
                    </span>
                  ))}
                </div>
                {wf.length > 0 ? (
                  <Stepper steps={wf.map((s) => `${s.title} — ${s.actor} (${s.eta})`)} current={99} />
                ) : <p className="text-xs text-slate-400">No workflow defined.</p>}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
