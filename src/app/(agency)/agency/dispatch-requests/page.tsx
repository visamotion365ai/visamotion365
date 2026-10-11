import Link from "next/link";
import { needStaff } from "@/lib/session";
import { listDispatch } from "@/lib/service";
import { liveDb } from "@/lib/agents";
import { PageHeader, Card, Badge, statusTone, Empty } from "@/components/ui";
import { Inbox, AlertTriangle, ArrowRight } from "lucide-react";
import { dtt } from "@/lib/format";

export default async function AgencyDispatchPage() {
  const s = await needStaff();
  const db = liveDb();
  const list = listDispatch(s);
  return (
    <div className="fade-up">
      <PageHeader crumb="Agency" title="Dispatch Requests" sub="Track what you submitted to the Master Console and the feedback you received. Create requests from any applicant file." />
      <div className="space-y-3">
        {list.length === 0 && <Card className="p-8"><Empty icon={<Inbox size={20} />} title="No dispatch requests yet" sub="Open an applicant and use “Submit to Master Console”." /></Card>}
        {list.map((d) => {
          const app = db.applicants.find((a) => a.id === d.applicant_id);
          return (
            <Card key={d.id} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link href={`/agency/applicants/${app?.id}`} className="text-sm font-bold text-slate-900 hover:text-indigo-600">
                      {app?.first_name} {app?.last_name}
                    </Link>
                    <span className="text-xs text-slate-400">→ {app?.target_country}</span>
                    <Badge tone={statusTone(d.status)} dot>{d.status.replace(/_/g, " ")}</Badge>
                    {d.priority !== "NORMAL" && <Badge tone="amber">{d.priority}</Badge>}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">{d.request_type.replace(/_/g, " ")} • {dtt(d.submitted_at)}</p>
                  <p className="text-xs text-slate-600 mt-1.5">“{d.agency_note}”</p>
                  {d.master_note && (
                    <p className="text-xs text-indigo-700 mt-2 flex items-start gap-1.5 rounded-lg bg-indigo-50 px-3 py-2">
                      <AlertTriangle size={13} className="mt-0.5 shrink-0" /> <b>Master feedback:</b> {d.master_note}
                    </p>
                  )}
                </div>
                <Link href={`/agency/applicants/${app?.id}`} className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1">Open file <ArrowRight size={12} /></Link>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
