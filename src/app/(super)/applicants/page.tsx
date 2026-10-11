import Link from "next/link";
import { needSuper } from "@/lib/session";
import { liveDb } from "@/lib/agents";
import { PageHeader, Card, Badge, statusTone, Table, Td, Avatar, LinkBtn } from "@/components/ui";
import { STAGE_LABEL, STAGES } from "@/lib/schema";
import { maskPassport } from "@/lib/mrz";
import { dt } from "@/lib/format";
import { Users, Search } from "lucide-react";

export default async function ApplicantsPage({ searchParams }: { searchParams: Promise<{ q?: string; tenant?: string; stage?: string }> }) {
  await needSuper();
  const db = liveDb();
  const sp = await searchParams;
  let list = db.applicants;
  if (sp.tenant) list = list.filter((a) => a.tenant_id === sp.tenant);
  if (sp.stage) list = list.filter((a) => a.application_stage === sp.stage);
  return (
    <div className="fade-up">
      <PageHeader crumb="Cases" title="All Applicants" sub="Both tenants. Filter by tenant or stage — access checks remain server-side on every record." />
      <Card className="mb-4 p-3">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5"><Search size={14} /> Filter:</span>
          <a href="/applicants" className="text-[11px] font-semibold text-indigo-600 hover:underline">All tenants</a>
          {db.tenants.map((t) => <a key={t.id} href={`/applicants?tenant=${t.id}`} className="text-[11px] font-semibold text-indigo-600 hover:underline">{t.name}</a>)}
          <span className="w-px h-4 bg-slate-200" />
          {STAGES.slice(0, 6).map((st) => <a key={st} href={`/applicants?stage=${st}`} className="text-[11px] font-semibold text-slate-500 hover:text-indigo-600">{STAGE_LABEL[st]}</a>)}
        </div>
      </Card>
      <Card>
        <Table head={["Applicant", "Tenant", "Country / Program", "Passport", "Stage", "Created", ""]}>
          {list.map((a) => {
            const t = db.tenants.find((x) => x.id === a.tenant_id);
            const p = db.visa_programs.find((x) => x.id === a.visa_program_id);
            const c = db.countries.find((x) => x.name === a.target_country);
            return (
              <tr key={a.id} className="hover:bg-slate-50/60">
                <Td>
                  <div className="flex items-center gap-2.5">
                    <Avatar name={`${a.first_name} ${a.last_name}`} size={30} />
                    <div>
                      <p className="text-sm font-bold text-slate-800">{a.first_name} {a.last_name}</p>
                      <p className="text-[10px] text-slate-400">{a.id}</p>
                    </div>
                  </div>
                </Td>
                <Td><span className="text-xs font-semibold" style={{ color: t?.theme_config.primary }}>{t?.name}</span></Td>
                <Td><span className="text-sm">{c?.flag} {a.target_country}</span><p className="text-[10px] text-slate-400">{p?.name}</p></Td>
                <Td><span className="font-mono text-xs">{a.passport_data ? maskPassport(a.passport_data.passport_number) : "—"}</span></Td>
                <Td><Badge tone={statusTone(a.application_stage)} dot>{STAGE_LABEL[a.application_stage]}</Badge></Td>
                <Td><span className="text-xs text-slate-500">{dt(a.created_at)}</span></Td>
                <Td><LinkBtn href={`/applicants/${a.id}`}>Open</LinkBtn></Td>
              </tr>
            );
          })}
        </Table>
      </Card>
    </div>
  );
}
