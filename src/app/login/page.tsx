"use client";
import React, { useState, useActionState, Suspense } from "react";
import Link from "next/link";
import { loginAction } from "@/app/actions/auth";
import { Logo } from "@/components/brand";

const DEMO = [
  { label: "Super Admin (MFA)", email: "superadmin@example.com", pass: "SuperAdmin123!", desc: "Master console — all tenants" },
  { label: "WVC Owner", email: "owner.wvc@example.com", pass: "Owner123!", desc: "World Vision Consultancy" },
  { label: "VFS Owner", email: "owner.vfs@example.com", pass: "Owner123!", desc: "VFS Recruitment Agency" },
  { label: "Visa Officer (WVC)", email: "visa.officer@example.com", pass: "Officer123!", desc: "Cases, documents, dispatch" },
  { label: "Document Officer (WVC)", email: "document.officer@example.com", pass: "Officer123!", desc: "Document verification" },
  { label: "Applicant Portal", email: "demo.applicant@example.com", pass: "Applicant123!", desc: "Karim Hossain — Singapore" }
];

function Form() {
  const [state, formAction, pending] = useActionState(loginAction, { ok: false, error: "" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const fill = (e: string, p: string) => { setEmail(e); setPassword(p); };

  if (state.ok && state.mfa) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-6 w-full max-w-md fade-up">
        <div className="rounded-xl bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 text-xs leading-relaxed mb-4">
          <b>Step 2 of 2 — Super Admin MFA.</b> In production this code is sent by email/phone. Demo transport — your one-time code is <b>{state.otp}</b>.
        </div>
        <FormState state={state} />
        <form action={formAction}>
          <input type="hidden" name="email" value={state.email} />
          <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">One-time code</label>
          <input name="otp" placeholder="6-digit code" autoFocus
            className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-lg tracking-[0.4em] text-center font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400" />
          <button disabled={pending} className="w-full mt-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-bold py-3 disabled:opacity-60">
            {pending ? "Verifying…" : "Verify & sign in"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-6 w-full max-w-md fade-up">
      <h1 className="text-lg font-bold text-slate-900">Sign in to VisaMotion365</h1>
      <p className="text-xs text-slate-500 mt-1">Role-based access. Super Admin requires MFA. Tenant isolation enforced server-side.</p>
      <FormState state={state} />
      <form action={formAction} className="mt-2">
        <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Email</label>
        <input name="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@agency.com" required
          className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400" />
        <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5 mt-3">Password</label>
        <input name="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required
          className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400" />
        <button disabled={pending} className="w-full mt-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-bold py-3 hover:opacity-90 disabled:opacity-60">
          {pending ? "Signing in…" : "Sign in →"}
        </button>
      </form>
    </div>
  );
}

function FormState({ state }: { state: any }) {
  if (!state?.error) return null;
  return <div className="mt-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-2.5">{state.error}</div>;
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="grid lg:grid-cols-2 gap-8 items-center max-w-5xl w-full">
        <div>
          <Logo size={44} />
          <h1 className="text-3xl font-black text-slate-900 mt-5">VisaMotion365</h1>
          <p className="text-slate-500 mt-2 max-w-md">The multi-tenant operating system for visa consultancies & foreign-worker recruitment — intake to lodgement, with human-in-the-loop AI.</p>
          <div className="mt-6">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Demo accounts (dev only — click to fill)</p>
            <div className="grid sm:grid-cols-2 gap-2 max-w-lg">
              {DEMO.map((d) => (
                <button key={d.email} onClick={() => fill(d.email, d.pass)}
                  className="text-left rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 hover:border-indigo-300 hover:bg-indigo-50/40 transition">
                  <p className="text-xs font-bold text-slate-800">{d.label}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{d.email}</p>
                  <p className="text-[10px] text-slate-400">{d.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
        <Suspense fallback={null}>
          <Form />
        </Suspense>
      </div>
    </div>
  );
}
