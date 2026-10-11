import Link from "next/link";
import {
  LayoutDashboard, Bot, MonitorPlay, User, ScanLine, FileText, ShieldCheck,
  Globe2, Workflow, Wallet, MessageSquare, KeyRound, BadgeCheck, Smartphone,
  Lock, Cpu, Activity, Server
} from "lucide-react";
import { Logo } from "@/components/brand";
import { getSession, homeFor } from "@/lib/session";

const MODULES = [
  { icon: LayoutDashboard, name: "Super Admin Master Dashboard", desc: "One console over all tenants: cases, agents, approvals, finance." },
  { icon: Bot, name: "10 AI Agent Control Center", desc: "Independent agent configs, dry-run first, per-agent production gates." },
  { icon: MonitorPlay, name: "Browser Use Automation", desc: "Cloud browser tasks with OTP/CAPTCHA pauses and explicit stop." },
  { icon: User, name: "Applicant / Client Profile", desc: "Identity, passport, documents, timeline — per applicant." },
  { icon: ScanLine, name: "Passport OCR + Intake", desc: "MRZ TD3 parsing with real checksum validation, editable review." },
  { icon: FileText, name: "A4 Dossier Generator", desc: "Vector PDF with compliance matrix, QR vault link, review notes." },
  { icon: ShieldCheck, name: "Compliance Check", desc: "Missing docs, expiry, name & bank-statement consistency flags." },
  { icon: Globe2, name: "Country Workflows", desc: "Australia, Turkey, Serbia, Singapore, Malaysia step pipelines." },
  { icon: Workflow, name: "Application Pipeline", desc: "Live status stages from intake to lodgement." },
  { icon: Wallet, name: "Billing & Commission", desc: "Invoices, payments, recruitment commission reconciliation." },
  { icon: MessageSquare, name: "AI Live Inbox", desc: "Template auto-responder — never promises visa approval." },
  { icon: KeyRound, name: "API Key & Automation Vault", desc: "Encrypted secret refs only — keys live in server env." },
  { icon: BadgeCheck, name: "Human Approval → Lodge", desc: "Short-lived, task-bound approval tokens. Fail closed." },
  { icon: Smartphone, name: "Mobile Client Portal", desc: "Applicant-first mobile experience for intake & updates." }
];

export default function Landing() {
  const s = getSession();
  const cta = s ? homeFor(s) : "/login";
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-100 sticky top-0 bg-white/90 backdrop-blur z-30">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <Logo size={34} />
          <div className="flex items-center gap-3">
            <Link href={cta} className="text-sm font-bold text-slate-700 hover:text-slate-900">{s ? "Open console" : "Sign in"}</Link>
            <Link href={cta} className="rounded-xl bg-slate-900 text-white text-sm font-semibold px-4 py-2.5 hover:bg-slate-800">Get started →</Link>
          </div>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-5 pt-14 pb-10">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div className="fade-up">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1.5">
              <Activity size={13} /> Multi-tenant Visa Operations OS
            </span>
            <h1 className="text-4xl lg:text-[44px] font-black text-slate-900 leading-[1.08] mt-5">
              Run every visa case from <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">intake to lodgement</span> — in one console.
            </h1>
            <p className="text-slate-500 mt-4 max-w-lg">
              Passport OCR with MRZ validation, A4 dossier generation, compliance scoring, 10 governed AI agents and cloud browser automation — every irreversible step waits for a human.
            </p>
            <div className="flex gap-3 mt-6">
              <Link href={cta} className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-bold px-5 py-3 shadow-pop">Open the console</Link>
              <Link href="/login" className="rounded-xl border border-slate-200 text-sm font-bold px-5 py-3 text-slate-700 hover:bg-slate-50">Demo accounts</Link>
            </div>
            <div className="flex flex-wrap gap-2 mt-6">
              {["RBAC + tenant isolation", "AES-256-GCM passport fields", "Audit log on every action", "Dry-run by default"].map((t) => (
                <span key={t} className="rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold px-3 py-1.5 flex items-center gap-1.5"><Lock size={11} /> {t}</span>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-pop">
              <div className="rounded-2xl bg-white border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-900">Master Dashboard</p>
                  <span className="rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5">LIVE</span>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {[["Applicants", "4"], ["Pending approvals", "2"], ["Browser min", "12"]].map(([l, v]) => (
                    <div key={l} className="rounded-xl bg-slate-50 border border-slate-100 p-2.5">
                      <p className="text-[9px] font-bold uppercase text-slate-400">{l}</p>
                      <p className="text-lg font-black text-slate-900">{v}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 space-y-2">
                  {[
                    { n: "Karim Hossain", c: "🇸🇬 Singapore Tourist", s: "Checklist complete", tone: "bg-indigo-50 text-indigo-700" },
                    { n: "Jashim Uddin", c: "🇲 Malaysia Work", s: "Awaiting FINAL_SUBMIT approval", tone: "bg-amber-50 text-amber-700" }
                  ].map((r) => (
                    <div key={r.n} className="rounded-xl border border-slate-100 px-3 py-2.5 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-800">{r.n}</p>
                        <p className="text-[10px] text-slate-400">{r.c}</p>
                      </div>
                      <span className={`rounded-full text-[10px] font-bold px-2 py-1 ${r.tone}`}>{r.s}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="absolute -bottom-4 -left-4 rounded-2xl bg-white border border-slate-200 shadow-pop px-4 py-3 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><BadgeCheck size={16} /></div>
              <div>
                <p className="text-[11px] font-bold text-slate-800">Approval token issued</p>
                <p className="text-[10px] text-slate-400">Bound to task • expires in 15 min</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 border-y border-slate-100 py-14">
        <div className="max-w-6xl mx-auto px-5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">14 modules, one platform</p>
          <h2 className="text-2xl font-black text-slate-900 mt-2 mb-6">Everything a visa operation runs on</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {MODULES.map((m, i) => (
              <div key={m.name} className="bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-card transition">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3"><m.icon size={17} /></div>
                <p className="text-[10px] font-black text-slate-300">0{i + 1}</p>
                <p className="text-sm font-bold text-slate-900 leading-snug">{m.name}</p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-5 py-14">
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { icon: Cpu, t: "Dry-run first", d: "All 10 agents run in dry-run mode until you enable production per agent, per tool. No external side effects by default." },
            { icon: Server, t: "Human in the loop", d: "OTP, CAPTCHA, payment, legal declaration, final submission — the agent stops and a short-lived, task-bound approval token decides." },
            { icon: ShieldCheck, t: "Tenant isolation", d: "WVC_01 can never read VFS_02. Policies are enforced in the data layer, not the UI. Every sensitive action is audit-logged." }
          ].map((c) => (
            <div key={c.t} className="rounded-2xl border border-slate-200 p-5">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center mb-3"><c.icon size={18} /></div>
              <p className="text-sm font-bold text-slate-900">{c.t}</p>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{c.d}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-100 py-8">
        <div className="max-w-6xl mx-auto px-5 flex flex-wrap items-center justify-between gap-3">
          <Logo size={28} />
          <p className="text-xs text-slate-400">Demo environment — synthetic data only. Browser Use API V4, Base44 slots & Supabase RLS wiring documented in docs/.</p>
        </div>
      </footer>
    </div>
  );
}
