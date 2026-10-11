import { needPortal } from "@/lib/session";
import { liveDb } from "@/lib/agents";
import { runCompliance } from "@/lib/compliance";
import { Card, Badge, Progress, Callout } from "@/components/ui";
import { ListChecks, AlertTriangle } from "lucide-react";

export default async function PortalChecklistPage() {
  const s = await needPortal();
  const db = liveDb();
  const app = db.applicants.find((a) => a.id === s.applicant_id)!;
  const program = db.visa_programs.find((p) => p.id === app.visa_program_id);
  const report = runCompliance(db, app);

  return (
    <div className="px-4 pt-5 pb-6 space-y-4">
      <div>
        <h1 className="text-lg font-black text-slate-900 flex items-center gap-2"><ListChecks size={18} className="text-indigo-600" /> Checklist</h1>
        <p className="text-[11px] text-slate-400 mt-0.5">{program?.name}</p>
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-slate-700">Completion</p>
          <p className={`text-lg font-black ${report.score >= 80 ? "text-emerald-600" : report.score >= 60 ? "text-amber-600" : "text-red-500"}`}>{report.score}%</p>
        </div>
        <Progress value={report.score} tone={report.score >= 80 ? "emerald" : report.score >= 60 ? "amber" : "red"} />
      </Card>

      <div className="space-y-2">
        {report.rows.map((r) => (
          <Card key={r.requirement} className="p-3.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold text-slate-800">{r.requirement.replace(/_/g, " ")} {!r.required && <span className="text-slate-300 font-normal">(optional)</span>}</p>
              <Badge tone={r.status === "VERIFIED" ? "emerald" : ["PENDING_REVIEW", "UPLOADED"].includes(r.status) ? "amber" : r.status === "EXPIRED" ? "red" : "red"} dot>{r.status.replace(/_/g, " ")}</Badge>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">{r.detail}</p>
          </Card>
        ))}
      </div>

      {report.warnings.length > 0 && (
        <Card className="p-4">
          <p className="text-xs font-black text-slate-900 flex items-center gap-1.5 mb-2"><AlertTriangle size={13} className="text-amber-500" /> Consistency flags</p>
          {report.warnings.map((w, i) => <p key={i} className="text-[11px] text-slate-600 mb-1.5">• {w}</p>)}
        </Card>
      )}
      <Callout tone="info">When everything is green, submit to our team from the Application screen — or we'll dispatch it automatically after review.</Callout>
    </div>
  );
}
