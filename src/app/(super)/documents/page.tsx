import Link from "next/link";
import { needSuper } from "@/lib/session";
import { liveDb } from "@/lib/agents";
import { PageHeader, Card, Badge, statusTone, Table, Td } from "@/components/ui";
import { ActionForm } from "@/components/forms";
import { setDocumentStatusAction } from "@/app/actions/main";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { dtt } from "@/lib/format";

export default async function DocumentsPage() {
  await needSuper();
  const db = liveDb();
  const docs = db.client_documents;
  return (
    <div className="fade-up">
      <PageHeader crumb="Cases" title="Documents (all tenants)" sub="Verification queue. Verifying a document is an audited, permission-gated action (document.verify)." />
      <Card>
        <Table head={["Document", "Applicant", "Tenant", "Status", "Version", "Uploaded", "Officer actions"]}>
          {docs.map((d) => {
            const app = db.applicants.find((a) => a.id === d.applicant_id);
            const t = db.tenants.find((x) => x.id === d.tenant_id);
            return (
              <tr key={d.id} className="hover:bg-slate-50/60">
                <Td>
                  <p className="text-xs font-bold text-slate-800">{d.document_type.replace(/_/g, " ")}</p>
                  <p className="text-[10px] text-slate-400">{d.file_name || d.storage_path || "—"}</p>
                </Td>
                <Td>
                  <Link href={`/applicants/${app?.id}`} className="text-xs font-semibold text-indigo-600 hover:underline">
                    {app?.first_name} {app?.last_name}
                  </Link>
                </Td>
                <Td><span className="text-xs" style={{ color: t?.theme_config.primary }}>{t?.name.split(" ")[0]}</span></Td>
                <Td><Badge tone={statusTone(d.verification_status)} dot>{d.verification_status.replace(/_/g, " ")}</Badge></Td>
                <Td><span className="text-xs font-mono">v{d.version}</span></Td>
                <Td><span className="text-[11px] text-slate-500">{dtt(d.uploaded_at)}</span></Td>
                <Td>
                  <div className="flex gap-1.5">
                    {d.verification_status !== "VERIFIED" && (
                      <ActionForm action={setDocumentStatusAction} hideSubmit>
                        <input type="hidden" name="doc_id" value={d.id} />
                        <input type="hidden" name="status" value="VERIFIED" />
                        <button type="submit" title="Verify" className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100"><CheckCircle2 size={14} /></button>
                      </ActionForm>
                    )}
                    {d.verification_status !== "CORRECTION_REQUIRED" && (
                      <ActionForm action={setDocumentStatusAction} hideSubmit>
                        <input type="hidden" name="doc_id" value={d.id} />
                        <input type="hidden" name="status" value="CORRECTION_REQUIRED" />
                        <button type="submit" title="Request correction" className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center hover:bg-amber-100"><AlertTriangle size={14} /></button>
                      </ActionForm>
                    )}
                  </div>
                </Td>
              </tr>
            );
          })}
        </Table>
      </Card>
    </div>
  );
}
