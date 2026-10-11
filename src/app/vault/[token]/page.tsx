import Link from "next/link";
import { verifyVaultToken } from "@/lib/vault";
import { getDb } from "@/lib/db";
import { QrCode, ShieldCheck, AlertTriangle, Download, FileText } from "lucide-react";

export const dynamic = "force-dynamic";

export default function VaultPage({ params }: { params: Promise<{ token: string }> }) {
  return <VaultInner params={params} />;
}

async function VaultInner({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const payload = verifyVaultToken(token);
  const db = getDb();
  const app = payload ? db.applicants.find((a) => a.id === payload.kid && a.tenant_id === payload.tid) : null;
  const tenant = app ? db.tenants.find((t) => t.id === app.tenant_id) : null;
  const pdfUrl = payload ? `/api/dossier?token=${encodeURIComponent(token)}` : "#";

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-card max-w-md w-full p-6 fade-up">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white flex items-center justify-center"><QrCode size={17} /></div>
          <div>
            <p className="text-sm font-bold text-slate-900">Private Dossier Vault</p>
            <p className="text-[11px] text-slate-400">Authenticated, expiring link</p>
          </div>
        </div>
        {app ? (
          <div>
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Dossier for</p>
              <p className="text-base font-bold text-slate-900 mt-1">{app.first_name} {app.last_name[0]}.</p>
              <p className="text-xs text-slate-500 mt-0.5">{tenant?.name} • {app.target_country} • v{app.dossier_version || "1.0.0"}</p>
            </div>
            <a href={pdfUrl} download
              className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-bold py-3 hover:opacity-90">
              <Download size={16} /> Download A4 Dossier (PDF)
            </a>
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-indigo-50 border border-indigo-100 px-3.5 py-2.5">
              <ShieldCheck size={14} className="text-indigo-600 mt-0.5 shrink-0" />
              <p className="text-[11px] text-indigo-900 leading-relaxed">This link was generated from the A4 dossier QR code. It expires 15 minutes after generation and is bound to this applicant only.</p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
            <AlertTriangle size={15} className="text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-bold text-red-800">Invalid or expired token</p>
              <p className="text-[11px] text-red-600 mt-1">Ask the issuing agency to generate a fresh vault link from the applicant dossier. Tokens are single-purpose and short-lived.</p>
            </div>
          </div>
        )}
        <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-100">
          <Link href="/" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"><FileText size={13} /> VisaMotion365</Link>
          <span className="text-[10px] text-slate-400">CONFIDENTIAL</span>
        </div>
      </div>
    </div>
  );
}
