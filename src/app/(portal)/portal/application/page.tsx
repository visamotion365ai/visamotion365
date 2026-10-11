import { needPortal } from "@/lib/session";
import { liveDb } from "@/lib/agents";
import { Card, Badge, statusTone, Stepper, Empty } from "@/components/ui";
import { STAGE_LABEL, STAGES } from "@/lib/schema";
import { FileCheck2, CalendarClock, MessageSquare, Inbox } from "lucide-react";
import { dt, dtt } from "@/lib/format";

export default async function PortalApplicationPage() {
  const s = await needPortal();
  const db = liveDb();
  const app = db.applicants.find((a) => a.id === s.applicant_id)!;
  const idx = STAGES.indexOf(app.application_stage as any);
  const dispatches = db.master_dispatch_requests.filter((d) => d.applicant_id === app.id);
  const appt = db.appointments.find((a) => a.applicant_id === app.id);
  const events = db.audit_logs.filter((l) => l.resource_id === app.id).slice(0, 10);

  return (
    <div className="px-4 pt-5 pb-6 space-y-4">
      <div>
        <h1 className="text-lg font-black text-slate-900 flex items-center gap-2"><FileCheck2 size={18} className="text-indigo-600" /> My Application</h1>
        <p className="text-[11px] text-slate-400 mt-0.5">{app.target_country} • {db.visa_programs.find((p) => p.id === app.visa_program_id)?.name}</p>
      </div>

      {appt && (
        <Card className="p-4 bg-indigo-50/60 border-indigo-100">
          <p className="text-xs font-black text-indigo-900 flex items-center gap-1.5"><CalendarClock size={14} /> Appointment confirmed</p>
          <p className="text-sm font-bold text-slate-900 mt-1">{appt.date} • {appt.time}</p>
          <p className="text-[11px] text-slate-500">{appt.location}</p>
        </Card>
      )}

      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-black text-slate-900">Progress</p>
          <Badge tone={statusTone(app.application_stage)} dot>{STAGE_LABEL[app.application_stage]}</Badge>
        </div>
        <Stepper steps={STAGES.slice(0, 9).map((x) => STAGE_LABEL[x])} current={Math.min(idx + 1, 9)} />
      </Card>

      {app.feedback_note && (
        <Card className="p-4">
          <p className="text-xs font-black text-slate-900 flex items-center gap-1.5 mb-1.5"><MessageSquare size={13} className="text-indigo-500" /> Feedback from our team</p>
          <p className="text-[11px] text-slate-600 leading-relaxed">{app.feedback_note}</p>
        </Card>
      )}

      <Card className="p-4">
        <p className="text-xs font-black text-slate-900 flex items-center gap-1.5 mb-3"><Inbox size={13} className="text-indigo-500" /> Dispatch to Master review</p>
        {dispatches.length === 0 ? <p className="text-[11px] text-slate-400">Not dispatched yet — we'll submit it when your documents are ready.</p> : (
          <div className="space-y-2">
            {dispatches.map((d) => (
              <div key={d.id} className="rounded-xl bg-slate-50 border border-slate-100 px-3.5 py-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold text-slate-800">{d.request_type.replace(/_/g, " ")}</p>
                  <Badge tone={statusTone(d.status)} dot>{d.status.replace(/_/g, " ")}</Badge>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">{dtt(d.submitted_at)}</p>
                {d.master_note && <p className="text-[10px] text-indigo-700 mt-1.5">Team note: {d.master_note}</p>}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-4">
        <p className="text-xs font-black text-slate-900 mb-3">Recent events</p>
        {events.length === 0 ? <Empty title="No events yet" /> : (
          <ol className="relative border-l border-slate-200 ml-1.5 space-y-3">
            {events.map((l) => (
              <li key={l.id} className="ml-4">
                <span className="absolute -left-[4.5px] w-2 h-2 rounded-full bg-indigo-400" />
                <p className="text-[11px] font-bold text-slate-800">{l.action.replace(/_/g, " ")}</p>
                <p className="text-[10px] text-slate-400">{dt(l.created_at)}</p>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
