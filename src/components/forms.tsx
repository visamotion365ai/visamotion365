"use client";
import React, { useState, useActionState } from "react";
import { Upload, CheckCircle2, AlertTriangle, ExternalLink } from "lucide-react";

type ActionState = { ok: boolean; error?: string } & Record<string, any>;
type AnyAction = (prev: any, fd: FormData) => Promise<ActionState>;

export function ActionForm({ action, children, submit = "Save", variant = "primary", className = "", hideSubmit }:
  { action: AnyAction; children: React.ReactNode; submit?: string; variant?: "primary" | "outline" | "danger" | "success" | "brand"; className?: string; hideSubmit?: boolean }) {
  const [state, formAction, pending] = useActionState(action, { ok: true });
  const v: Record<string, string> = {
    primary: "bg-slate-900 text-white hover:bg-slate-800",
    brand: "bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:opacity-90",
    outline: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
    danger: "bg-red-600 text-white hover:bg-red-500",
    success: "bg-emerald-600 text-white hover:bg-emerald-500"
  };
  return (
    <form action={formAction} className={className}>
      {children}
      {!hideSubmit && (
        <button type="submit" disabled={pending} className={`inline-flex items-center gap-2 rounded-xl text-sm font-semibold px-4 py-2.5 disabled:opacity-60 ${v[variant]}`}>
          {pending ? "Working…" : submit}
        </button>
      )}
      {state && !state.ok && (
        <div className="flex items-start gap-2 mt-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2.5">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {state.error}
        </div>
      )}
      {state && state.ok && state.url && (
        <a href={state.url} className="mt-2 inline-flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold px-3 py-2.5 hover:bg-emerald-100">
          <ExternalLink size={13} /> Vault link ready (15-min expiry) — open ↗
        </a>
      )}
    </form>
  );
}

export function DocUploadForm({ applicantId, action, defaultType = "PHOTOGRAPH", types }:
  { applicantId: string; action: AnyAction; defaultType?: string; types: string[] }) {
  const [state, formAction, pending] = useActionState(action, { ok: true });
  const [up, setUp] = useState(false);
  const [type, setType] = useState(defaultType);
  const fileRef = React.useRef<HTMLInputElement>(null);

  async function handleFile(f: File | null) {
    if (!f) return;
    setUp(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || "Upload failed");
      const data = new FormData();
      data.append("applicant_id", applicantId);
      data.append("document_type", type);
      data.append("storage_path", j.storage_path);
      data.append("file_name", j.file_name);
      data.append("mime_type", j.mime_type);
      data.append("file_size", String(j.file_size));
      const out = await formAction({ ok: true }, data);
      if (out && !out.ok) throw new Error(out.error);
    } catch (e: any) {
      alert(e.message || "Upload failed");
    } finally {
      setUp(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div>
      <div className="flex gap-2">
        <select value={type} onChange={(e) => setType(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30">
          {types.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
        </select>
        <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden" onChange={(e) => handleFile(e.target.files?.[0] || null)} />
        <button type="button" onClick={() => fileRef.current?.click()} disabled={up || pending}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/50 hover:border-indigo-400 hover:bg-indigo-50/40 transition px-4 py-2.5 text-xs font-semibold text-slate-600 disabled:opacity-60">
          <Upload size={15} /> {up ? "Uploading & processing…" : "Choose file (pdf/jpg/png, ≤10MB)"}
        </button>
      </div>
      <p className="text-[10px] text-slate-400 mt-1.5">Validated: type, size, ownership. Private storage + signed access in production.</p>
      {state && !state.ok && (
        <div className="mt-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2.5 flex items-start gap-2">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {state.error}
        </div>
      )}
    </div>
  );
}

export function PassportCaptureForm({ applicantId, action, demoFirst }:
  { applicantId: string; action: AnyAction; demoFirst?: boolean }) {
  const [state, formAction, pending] = useActionState(action, { ok: true });
  const [up, setUp] = useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  async function submitDemo() {
    const data = new FormData();
    data.append("applicant_id", applicantId);
    data.append("demo", "1");
    await formAction({ ok: true }, data);
  }
  async function handleFile(f: File | null) {
    if (!f) return;
    setUp(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || "Upload failed");
      const data = new FormData();
      data.append("applicant_id", applicantId);
      data.append("file_hash", j.file_hash);
      data.append("storage_path", j.storage_path);
      data.append("file_name", j.file_name);
      const out = await formAction({ ok: true }, data);
      if (out && !out.ok) throw new Error(out.error);
    } catch (e: any) {
      alert(e.message || "Capture failed");
    } finally {
      setUp(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => handleFile(e.target.files?.[0] || null)} />
      <div className="flex gap-2">
        <button type="button" onClick={() => fileRef.current?.click()} disabled={up || pending}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold px-4 py-2.5 hover:bg-slate-50 disabled:opacity-60">
          <Upload size={15} /> {up ? "Processing…" : "Upload passport photo/PDF"}
        </button>
        <button type="button" onClick={submitDemo} disabled={pending}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 text-sm font-semibold px-4 py-2.5 hover:bg-indigo-100 disabled:opacity-60">
          <CheckCircle2 size={15} /> Use demo passport (synthetic)
        </button>
      </div>
      <p className="text-[10px] text-slate-400 text-center">Demo OCR extracts a synthetic MRZ; checksums are validated by the real TD3 parser. Do not use real passports in this demo environment.</p>
      {state && !state.ok && (
        <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2.5 flex items-start gap-2">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {state.error}
        </div>
      )}
    </div>
  );
}
