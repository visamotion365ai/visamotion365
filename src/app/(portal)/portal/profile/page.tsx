import { needPortal } from "@/lib/session";
import { liveDb } from "@/lib/agents";
import { Card, KV, Badge } from "@/components/ui";
import { User, ShieldCheck, LogOut } from "lucide-react";
import { maskPassport } from "@/lib/mrz";
import { dt } from "@/lib/format";
import { logoutAction } from "@/app/actions/auth";

export default async function PortalProfilePage() {
  const s = await needPortal();
  const db = liveDb();
  const app = db.applicants.find((a) => a.id === s.applicant_id)!;
  const tenant = db.tenants.find((t) => t.id === app.tenant_id)!;

  return (
    <div className="px-4 pt-5 pb-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-base font-black flex items-center justify-center">
          {app.first_name[0]}{app.last_name[0]}
        </div>
        <div>
          <h1 className="text-lg font-black text-slate-900 flex items-center gap-2"><User size={16} className="text-indigo-600" /> Profile</h1>
          <p className="text-[11px] text-slate-400">{s.email}</p>
        </div>
      </div>

      <Card className="p-4">
        <KV k="Full name" v={`${app.first_name} ${app.last_name}`} />
        <KV k="Date of birth" v={app.date_of_birth || "—"} />
        <KV k="Nationality" v={app.nationality} />
        <KV k="Gender" v={app.gender || "—"} />
        <KV k="Passport" v={app.passport_data ? <span className="font-mono">{maskPassport(app.passport_data.passport_number)}</span> : "not captured"} mono />
        <KV k="Target" v={app.target_country} />
        <KV k="Agency" v={tenant.name} />
        <KV k="Case ref" v={app.id.toUpperCase()} mono />
        <KV k="Member since" v={dt(app.created_at)} />
      </Card>

      <div className="rounded-2xl bg-slate-900 text-white p-4 flex items-start gap-2.5">
        <ShieldCheck size={15} className="mt-0.5 text-emerald-400 shrink-0" />
        <p className="text-[10px] leading-relaxed text-slate-300">
          Verified passport data can only be changed with our review flow — this prevents accidental or fraudulent identity edits. Your file is visible to <b className="text-white">{tenant.name}</b> staff only.
        </p>
      </div>

      <form action={logoutAction}>
        <button type="submit" className="w-full flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white text-slate-600 text-sm font-bold py-3.5 hover:bg-red-50 hover:text-red-500 hover:border-red-200">
          <LogOut size={15} /> Sign out
        </button>
      </form>
    </div>
  );
}
