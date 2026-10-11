import Link from "next/link";
import { needStaff } from "@/lib/session";
import { listApplicants } from "@/lib/service";
import { liveDb } from "@/lib/agents";
import { PageHeader, Card, Table, Td, Badge, statusTone, Avatar, LinkBtn } from "@/components/ui";
import { STAGE_LABEL } from "@/lib/schema";
import { Plus, Users } from "lucide-react";
import { dt } from "@/lib/format";

export default async function AgencyApplicantsPage() {
  const s = await needStaff();
  const db = liveDb();
  const apps = listApplicants(s);
  return (
    <div className="fade-up">
      <PageHeader crumb="Agency" title="My Applicants" sub="Your tenant only — isolation enforced at the data layer."
        right={<Link href="/agency/applicants/new" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-bold px-4 py-2.5 hover:opacity-90"><Plus size={15} /> New applicant</Link>} />
      <Card>
        <Table head={["Applicant", "Country / Program", "Stage", "Documents", "Created", ""]}>
          {apps.map((a) => {
            const p = db.visa_programs.find((x) => x.id === a.visa_program_id);
            const c = db.countries.find((x) => x.name === a.target_country);
            const docs = db.client_documents.filter((d) => d.applicant_id === a.id);
            const verified = docs.filter((d) => d.verification_status === "VERIFIED").length;
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
                <Td><span className="text-sm">{c?.flag} {a.target_country}</span><p className="text-[10px] text-slate-400">{p?.name}</p></Td>
                <Td><Badge tone={statusTone(a.application_stage)} dot>{STAGE_LABEL[a.application_stage]}</Badge></Td>
                <Td><span className="text-xs font-bold text-slate-700">{verified}/{docs.length}</span> <span className="text-[10px] text-slate-400">verified</span></Td>
                <Td><span className="text-xs text-slate-500">{dt(a.created_at)}</span></Td>
                <Td><LinkBtn href={`/agency/applicants/${a.id}`}>Open</LinkBtn></Td>
              </tr>
            );
          })}
        </Table>
      </Card>
    </div>
  );
}
