"use client";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-8 max-w-md w-full text-center">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mb-4"><AlertTriangle size={22} /></div>
        <h1 className="text-lg font-bold text-slate-900">Something went wrong</h1>
        <p className="text-sm text-slate-500 mt-2">{error.message || "Unexpected error."}</p>
        <p className="text-xs text-slate-400 mt-1">Access checks fail closed: if you do not see what you expect, your role or tenant scope may not allow it.</p>
        <div className="flex gap-2 justify-center mt-5">
          <button onClick={reset} className="rounded-xl bg-slate-900 text-white text-sm font-semibold px-4 py-2.5">Try again</button>
          <Link href="/login" className="rounded-xl border border-slate-200 text-sm font-semibold px-4 py-2.5 text-slate-700 hover:bg-slate-50">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
