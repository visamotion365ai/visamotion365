import { needPortal } from "@/lib/session";
import { liveDb } from "@/lib/agents";
import { runCompliance } from "@/lib/compliance";
import { Card, Badge, KV, Field, Input, Callout } from "@/components/ui";
import { PassportCaptureForm, ActionForm } from "@/components/forms";
import { confirmPassportAction, capturePassportAction } from "@/app/actions/main";
import { Fingerprint, CheckCircle2 } from "lucide-react";
import { maskPassport, parseMrz } from "@/lib/mrz";

export default async function PortalPassportPage() {
  const s = await needPortal();
  const db = liveDb();
  const app = db.applicants.find((a) => a.id === s.applicant_id)!;
  const pd = app.passport_data;

  return (
    <div className="px-4 pt-5 pb-6 space-y-4">
      <div>
        <h1 className="text-lg font-black text-slate-900 flex items-center gap-2"><Fingerprint size={18} className="text-indigo-600" /> Passport</h1>
        <p className="text-[11px] text-slate-400 mt-0.5">OCR extraction → you confirm → our officer verifies.</p>
      </div>

      {!pd ? (
        <Card className="p-4">
          <p className="text-xs text-slate-500 mb-3">Capture your passport to begin. We extract the data automatically — you review and confirm it below.</p>
          <PassportCaptureForm applicantId={app.id} action={capturePassportAction} />
        </Card>
      ) : (
        <>
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-black text-slate-900">Extracted data (editable until verified)</p>
              {pd.verified ? <Badge tone="emerald" dot>Verified</Badge> : pd.confirmed_by_applicant ? <Badge tone="amber" dot>Officer review pending</Badge> : <Badge tone="indigo" dot>Draft — confirm it</Badge>}
            </div>
            <div className="rounded-xl bg-slate-900 p-3 space-y-0.5 mb-3">
              {pd.mrz.map((l, i) => <p key={i} className="font-mono text-[10px] text-emerald-300/90">{l}</p>)}
            </div>
            {(() => { const p = parseMrz(pd.mrz); return p.ok
              ? <p className="text-[10px] font-bold text-emerald-600 flex items-center gap-1"><CheckCircle2 size={12} /> MRZ checksums valid (L1, L2, L3)</p>
              : <p className="text-[10px] font-bold text-red-500">MRZ errors: {p.errors.join(", ")}</p>; })()}
            <div className="mt-2">
              <KV k="Passport no." v={<span className="font-mono text-xs">{maskPassport(pd.passport_number)}</span>} />
              <KV k="Confidence" v={`${Math.round(pd.ocr_confidence * 100)}%`} />
            </div>
          </Card>

          {!pd.verified && (
            <Card className="p-4">
              <p className="text-xs font-black text-slate-900 mb-3">Confirm or correct the fields</p>
              <ActionForm action={confirmPassportAction} submit="Confirm data (applicant)" variant="brand">
                <input type="hidden" name="applicant_id" value={app.id} />
                <div className="grid grid-cols-2 gap-2.5">
                  <Field label="Surname"><Input name="surname" defaultValue={pd.surname} required /></Field>
                  <Field label="Given names"><Input name="given" defaultValue={pd.given} required /></Field>
                  <div className="col-span-2"><Field label="Passport number"><Input name="passport_number" defaultValue={pd.passport_number} required /></Field></div>
                  <Field label="Date of birth"><Input name="dob" type="date" defaultValue={pd.dob} required /></Field>
                  <Field label="Expiry"><Input name="expiry" type="date" defaultValue={pd.expiry} required /></Field>
                  <Field label="Sex"><Input name="sex" defaultValue={pd.sex} /></Field>
                </div>
              </ActionForm>
              <div className="mt-3"><Callout tone="info">Final verification is done by our document officer — you are only confirming that the OCR read your passport correctly.</Callout></div>
            </Card>
          )}

          <Card className="p-4">
            <p className="text-xs font-black text-slate-900 mb-2">Recapture</p>
            <PassportCaptureForm applicantId={app.id} action={capturePassportAction} />
          </Card>
        </>
      )}
    </div>
  );
}

