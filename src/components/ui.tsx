import React from "react";
import Link from "next/link";

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white border border-slate-200 rounded-2xl shadow-card ${className}`}>{children}</div>;
}
export function CardHead({ title, sub, right }: { title: React.ReactNode; sub?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between px-5 pt-4 pb-3 gap-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
      {right}
    </div>
  );
}
export function PageHeader({ title, sub, right, crumb }: { title: string; sub?: React.ReactNode; right?: React.ReactNode; crumb?: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
      <div>
        {crumb && <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">{crumb}</p>}
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        {sub && <p className="text-sm text-slate-500 mt-1 max-w-2xl">{sub}</p>}
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  );
}

const TONES: Record<string, string> = {
  slate: "bg-slate-100 text-slate-600",
  indigo: "bg-indigo-50 text-indigo-700",
  violet: "bg-violet-50 text-violet-700",
  emerald: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
  red: "bg-red-50 text-red-600",
  blue: "bg-blue-50 text-blue-700",
  teal: "bg-teal-50 text-teal-700"
};
export function Badge({ tone = "slate", children, dot }: { tone?: string; children: React.ReactNode; dot?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap ${TONES[tone] || TONES.slate}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />}
      {children}
    </span>
  );
}
export function statusTone(status: string): string {
  const s = status.toUpperCase();
  if (["VERIFIED", "PAID", "COMPLETED", "APPROVED", "ACTIVE", "CONFIRMED", "VISA_ISSUED", "CONVERTED"].includes(s)) return "emerald";
  if (["PENDING_REVIEW", "PENDING", "PENDING_MASTER_REVIEW", "WAITING_FOR_APPROVAL", "WAITING_FOR_OTP", "WAITING_FOR_CAPTCHA", "WAITING_FOR_LOGIN", "RUNNING", "UPLOADED", "OCR_PROCESSING", "IN_PROCESS", "CONTACTED", "SENT", "ACTIVE_LEADS"].includes(s)) return "amber";
  if (["REJECTED", "EXPIRED", "FAILED", "CORRECTION_REQUIRED", "CLOSED", "OVERDUE", "MISSING", "EXPIRED"].includes(s)) return "red";
  if (["QUEUED", "DRAFT", "DRAFT_CAPTURED", "NEW"].includes(s)) return "indigo";
  if (["LODGED", "UNDER_REVIEW"].includes(s)) return "blue";
  return "slate";
}

export function Stat({ icon, label, value, sub, tone = "slate" }: { icon: React.ReactNode; label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: string }) {
  const icons: Record<string, string> = {
    slate: "bg-slate-100 text-slate-600", indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600", amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-500", violet: "bg-violet-50 text-violet-600", blue: "bg-blue-50 text-blue-600"
  };
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${icons[tone] || icons.slate}`}>{icon}</div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
          <p className="text-lg font-bold text-slate-900 leading-tight truncate">{value}</p>
          {sub && <p className="text-[11px] text-slate-400 truncate">{sub}</p>}
        </div>
      </div>
    </Card>
  );
}

export function Progress({ value, tone = "indigo", className = "" }: { value: number; tone?: string; className?: string }) {
  const colors: Record<string, string> = { indigo: "bg-indigo-600", emerald: "bg-emerald-500", amber: "bg-amber-500", red: "bg-red-500", slate: "bg-slate-400" };
  return (
    <div className={`h-2 rounded-full bg-slate-100 overflow-hidden ${className}`}>
      <div className={`h-full rounded-full ${colors[tone] || colors.indigo}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

export function Ring({ value, size = 84, label }: { value: number; size?: number; label?: string }) {
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth="8" className="stroke-slate-100" fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth="8" strokeLinecap="round" fill="none"
          className="stroke-indigo-600 transition-all" strokeDasharray={c} strokeDashoffset={c - (c * Math.min(100, value)) / 100} />
      </svg>
      <div className="absolute text-center">
        <p className="text-base font-bold text-slate-900">{Math.round(value)}%</p>
        {label && <p className="text-[9px] text-slate-400 font-medium uppercase">{label}</p>}
      </div>
    </div>
  );
}

export function Empty({ icon, title, sub, action }: { icon?: React.ReactNode; title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
      {icon && <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">{icon}</div>}
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {sub && <p className="text-xs text-slate-400 mt-1 max-w-xs">{sub}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function KV({ k, v, mono }: { k: string; v: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-500 font-medium shrink-0">{k}</span>
      <span className={`text-sm font-medium text-slate-800 text-right break-all ${mono ? "font-mono text-[13px]" : ""}`}>{v}</span>
    </div>
  );
}

export function Tabs({ tabs, active, onChange }: { tabs: { id: string; label: string; count?: number }[]; active: string; onChange?: (id: string) => void }) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {tabs.map((t) => (
        <button key={t.id} type="button" onClick={() => onChange?.(t.id)}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${active === t.id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
          {t.label}{t.count != null && <span className={`ml-1.5 ${active === t.id ? "text-slate-300" : "text-slate-400"}`}>{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="space-y-0">
      {steps.map((s, i) => (
        <li key={s} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${i < current ? "bg-emerald-500 text-white" : i === current ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-400"}`}>
              {i < current ? "✓" : i + 1}
            </div>
            {i < steps.length - 1 && <div className={`w-0.5 flex-1 min-h-[18px] ${i < current ? "bg-emerald-300" : "bg-slate-100"}`} />}
          </div>
          <div className={`pb-4 pt-1 text-sm ${i === current ? "font-semibold text-slate-900" : i < current ? "text-slate-600" : "text-slate-400"}`}>{s}</div>
        </li>
      ))}
    </ol>
  );
}

export function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px]">
        <thead>
          <tr className="bg-slate-50/70">
            {head.map((h) => <th key={h} className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-4 py-2.5">{h}</th>)}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
export function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 text-sm text-slate-700 border-t border-slate-100 ${className}`}>{children}</td>;
}

export function Avatar({ name, size = 36, src }: { name: string; size?: number; src?: string }) {
  const initials = name.split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase();
  const hue = (name.charCodeAt(0) * 47) % 360;
  return (
    <div className="rounded-full flex items-center justify-center font-bold text-white shrink-0"
      style={{ width: size, height: size, fontSize: size / 2.6, background: `linear-gradient(135deg, hsl(${hue} 65% 45%), hsl(${(hue + 40) % 360} 65% 35%))` }}>
      {initials}
    </div>
  );
}

export function Btn({ children, variant = "primary", className = "", ...rest }: any) {
  const v: Record<string, string> = {
    primary: "bg-slate-900 text-white hover:bg-slate-800",
    brand: "bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:opacity-90",
    outline: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
    ghost: "text-slate-600 hover:bg-slate-100",
    danger: "bg-red-600 text-white hover:bg-red-500",
    success: "bg-emerald-600 text-white hover:bg-emerald-500"
  };
  return (
    <button {...rest} className={`inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition px-4 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed ${v[variant]} ${className}`}>
      {children}
    </button>
  );
}
export function Input(props: any) {
  return <input {...props} className={`w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 ${props.className || ""}`} />;
}
export function Select(props: any) {
  return <select {...props} className={`w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 ${props.className || ""}`} />;
}
export function Textarea(props: any) {
  return <textarea {...props} className={`w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 ${props.className || ""}`} />;
}
export function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{children}</label>;
}
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label>{label}</Label>{children}</div>;
}
export { Toggle } from "./toggle";
export function Callout({ tone = "info", children }: { tone?: "info" | "warn" | "error" | "ok"; children: React.ReactNode }) {
  const c: Record<string, string> = {
    info: "bg-indigo-50 border-indigo-100 text-indigo-900",
    warn: "bg-amber-50 border-amber-200 text-amber-900",
    error: "bg-red-50 border-red-200 text-red-900",
    ok: "bg-emerald-50 border-emerald-200 text-emerald-900"
  };
  return <div className={`rounded-xl border px-4 py-3 text-xs leading-relaxed ${c[tone]}`}>{children}</div>;
}
export function JsonView({ data }: { data: any }) {
  return <pre className="text-[11.5px] leading-relaxed font-mono bg-slate-900 text-slate-100 rounded-xl p-4 overflow-x-auto whitespace-pre-wrap break-words">{JSON.stringify(data, null, 2)}</pre>;
}
export function LinkBtn({ href, children, className = "" }: { href: string; children: React.ReactNode; className?: string }) {
  return <Link href={href} className={`inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 ${className}`}>{children}</Link>;
}
