import Link from "next/link";
import { needPortal } from "@/lib/session";
import { liveDb } from "@/lib/agents";
import { listNotifications } from "@/lib/service";
import { runCompliance } from "@/lib/compliance";
import { Card, Ring, Badge, statusTone } from "@/components/ui";
import { STAGE_LABEL } from "@/lib/schema";
import { FileText, CheckSquare, Receipt, Send, Upload, ShieldCheck, Bell } from "lucide-react";
import { timeAgo } from "@/lib/format";

export default async function PortalHome() {
  const s = await needPortal();
  const db = liveDb();
  const app = db.applicants.find((a) => a.id === s.applicant_id)!;
  const country = db.countries.find((c) => c.name === app.target_country);
  const program = db.visa_programs.find((p) => p.id === app.visa_program_id);
  const report = runCompliance(db, app);
  const notifs = listNotifications(s).slice(0, 4);
  const pendingDocs = db.client_documents.filter((d) => d.applicant_id === app.id && !["VERIFIED"].includes(d.verification_status));

  return (
    <div className="px-4 pt-5 pb-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-400 font-semibold">Welcome back 👋</p>
          <h1 className="text-lg font-black text-slate-900">{app.first_name} {app.last_name}</h1>
        </div>
        <Link href="/portal/profile" className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-xs font-black flex items-center justify-center">
          {app.first_name[0]}{app.last_name[0]}
        </Link>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-4">
          <Ring value={report.score} label="checklist" size={88} />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Your case</p>
            <p className="text-sm font-black text-slate-900 mt-0.5 flex items-center gap-1.5">{country?.flag} {app.target_country}</p>
            <p className="text-[11px] text-slate-500 truncate">{program?.name}</p>
            <div className="mt-2"><Badge tone={statusTone(app.application_stage)} dot>{STAGE_LABEL[app.application_stage]}</Badge></div>
          </div>
        </div>
        {report.missing.length > 0 && (
          <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-2.5">
            <p className="text-[11px] font-bold text-amber-800">{report.missing.length} document(s) still needed:</p>
            <p className="text-[11px] text-amber-700 mt-0.5">{report.missing.join(", ")}</p>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-2.5">
        <Link href="/portal/documents" className="rounded-2xl bg-white border border-slate-200 p-3.5 hover:border-indigo-300">
          <Upload size={16} className="text-indigo-600 mb-1.5" />
          <p className="text-xs font-bold text-slate-800">Upload document</p>
          <p className="text-[10px] text-slate-400">{pendingDocs.length ? `${pendingDocs.length} in review` : "all verified"}</p>
        </Link>
        <Link href="/portal/checklist" className="rounded-2xl bg-white border border-slate-200 p-3.5 hover:border-indigo-300">
          <CheckSquare size={16} className="text-indigo-600 mb-1.5" />
          <p className="text-xs font-bold text-slate-800">Checklist</p>
          <p className="text-[10px] text-slate-400">{report.rows.filter((r) => r.status === "VERIFIED").length}/{report.rows.filter((r) => r.required).length} required done</p>
        </Link>
        <Link href="/portal/payments" className="rounded-2xl bg-white border border-slate-200 p-3.5 hover:border-indigo-300">
          <Receipt size={16} className="text-indigo-600 mb-1.5" />
          <p className="text-xs font-bold text-slate-800">Payments</p>
          <p className="text-[10px] text-slate-400">invoice status</p>
        </Link>
        <Link href="/portal/messages" className="rounded-2xl bg-white border border-slate-200 p-3.5 hover:border-indigo-300">
          <Send size={16} className="text-indigo-600 mb-1.5" />
          <p className="text-xs font-bold text-slate-800">Message us</p>
          <p className="text-[10px] text-slate-400">instant auto-reply</p>
        </Link>
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-black text-slate-900 flex items-center gap-1.5"><Bell size={13} className="text-indigo-500" /> Updates</p>
          <Link href="/portal/application" className="text-[10px] font-bold text-indigo-600">Timeline →</Link>
        </div>
        <div className="space-y-2">
          {notifs.map((n) => (
            <div key={n.id} className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
              <p className="text-[11px] font-bold text-slate-800">{n.title}</p>
              <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{n.body}</p>
              <p className="text-[9px] text-slate-300 mt-1">{timeAgo(n.created_at)}</p>
            </div>
          ))}
          {notifs.length === 0 && <p className="text-[11px] text-slate-400">No updates yet.</p>}
        </div>
      </Card>

      <div className="rounded-2xl bg-slate-900 text-white p-4 flex items-start gap-2.5">
        <ShieldCheck size={15} className="mt-0.5 text-emerald-400 shrink-0" />
        <p className="text-[10px] leading-relaxed text-slate-300">
          Your passport number is AES-256-GCM encrypted at rest and masked everywhere. No outcome is ever guaranteed — we guarantee a complete, accurate file.
        </p>
      </div>
    </div>
  );
}
