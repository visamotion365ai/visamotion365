import { needPortal } from "@/lib/session";
import { liveDb } from "@/lib/agents";
import { Card, Badge, statusTone } from "@/components/ui";
import { DocUploadForm } from "@/components/forms";
import { addDocumentAction } from "@/app/actions/main";
import { FileText, Upload } from "lucide-react";
import { dtt } from "@/lib/format";

const TYPES = ["NATIONAL_ID", "PHOTOGRAPH", "BANK_STATEMENT", "TAX_DOCUMENT", "EMPLOYMENT_CERTIFICATE", "EDUCATIONAL_CERTIFICATE", "POLICE_CLEARANCE", "MEDICAL_CERTIFICATE", "INVITATION", "TRAVEL_INSURANCE", "FLIGHT_BOOKING", "HOTEL_BOOKING", "SOP", "EMPLOYMENT_CONTRACT"];

export default async function PortalDocumentsPage() {
  const s = await needPortal();
  const db = liveDb();
  const app = db.applicants.find((a) => a.id === s.applicant_id)!;
  const docs = db.client_documents.filter((d) => d.applicant_id === app.id);

  return (
    <div className="px-4 pt-5 pb-6 space-y-4">
      <div>
        <h1 className="text-lg font-black text-slate-900 flex items-center gap-2"><FileText size={18} className="text-indigo-600" /> My Documents</h1>
        <p className="text-[11px] text-slate-400 mt-0.5">Upload once — we track versions, review and expiry for you.</p>
      </div>

      <Card className="p-4">
        <DocUploadForm applicantId={app.id} action={addDocumentAction} defaultType="PHOTOGRAPH" types={TYPES} />
      </Card>

      <div className="space-y-2">
        {docs.map((d) => (
          <Card key={d.id} className="p-3.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-800">{d.document_type.replace(/_/g, " ")}</p>
              <Badge tone={statusTone(d.verification_status)} dot>{d.verification_status.replace(/_/g, " ")}</Badge>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">{d.file_name || "on file"} • v{d.version} • {dtt(d.uploaded_at)}</p>
            {d.verification_status === "CORRECTION_REQUIRED" && <p className="text-[10px] font-bold text-amber-600 mt-1.5">⚠ Our officer needs a fresh upload of this document.</p>}
            {d.audit_notes && <p className="text-[10px] text-slate-500 mt-1">Note: {d.audit_notes}</p>}
          </Card>
        ))}
        {docs.length === 0 && <Card className="p-6 text-center"><Upload size={20} className="mx-auto text-slate-300 mb-2" /><p className="text-xs font-bold text-slate-600">Nothing uploaded yet</p><p className="text-[10px] text-slate-400 mt-1">Start with your passport from the Home screen.</p></Card>}
      </div>
    </div>
  );
}
