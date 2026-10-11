import { needSuper } from "@/lib/session";
import { liveDb } from "@/lib/agents";
import { PageHeader, Card, Badge, Table, Td } from "@/components/ui";
import { CsvExportButton } from "@/components/csv-export";
import { ScrollText } from "lucide-react";
import { dtt } from "@/lib/format";

export default async function AuditLogsPage() {
  await needSuper();
  const db = liveDb();
  const logs = db.audit_logs;
  const csvRows: (string | number)[][] = [["created_at", "actor", "type", "tenant", "action", "resource", "detail"]];
  for (const l of logs) csvRows.push([l.created_at, l.actor_user_id || "", l.actor_type, l.tenant_id || "", l.action, `${l.resource_type || ""}:${l.resource_id || ""}`, JSON.stringify(l.metadata || {})]);
  return (
    <div className="fade-up">
      <PageHeader crumb="System" title="Audit Logs" sub="Immutable trail of every sensitive action — login, MFA, document verify, dispatch decision, approval, credential rotation, payment."
        right={<CsvExportButton filename="audit-logs.csv" rows={csvRows} />} />
      <Card>
        <Table head={["Time", "Actor", "Type", "Tenant", "Action", "Resource", "Detail"]}>
          {logs.slice(0, 80).map((l) => {
            const p = db.profiles.find((x) => x.id === l.actor_user_id);
            return (
              <tr key={l.id} className="hover:bg-slate-50/60 align-top">
                <Td><span className="text-[11px] text-slate-500 whitespace-nowrap">{dtt(l.created_at)}</span></Td>
                <Td><span className="text-xs font-semibold">{l.actor_user_id === "system" ? "system" : l.actor_user_id === "auto_responder" ? "auto-responder" : (p?.full_name || l.actor_user_id || "—")}</span></Td>
                <Td><Badge tone={l.actor_type === "SYSTEM" ? "slate" : l.actor_type === "AGENT" ? "violet" : "indigo"}>{l.actor_type}</Badge></Td>
                <Td><span className="text-[11px]">{l.tenant_id ? db.tenants.find((t) => t.id === l.tenant_id)?.name.split(" ")[0] || l.tenant_id : "—"}</span></Td>
                <Td><span className="font-mono text-[11px] font-bold text-slate-800">{l.action}</span></Td>
                <Td><span className="text-[10px] font-mono text-slate-400">{l.resource_type ? `${l.resource_type}:${String(l.resource_id).slice(0, 12)}…` : "—"}</span></Td>
                <Td><span className="text-[10px] text-slate-400 max-w-[220px] block truncate" title={JSON.stringify(l.metadata)}>{l.metadata ? JSON.stringify(l.metadata) : ""}</span></Td>
              </tr>
            );
          })}
        </Table>
      </Card>
      <p className="text-[11px] text-slate-400 mt-3 flex items-center gap-1.5"><ScrollText size={12} /> Retention: {db.settings.retention_days_logs} days (configurable in Settings). Sensitive values are masked at write-time.</p>
    </div>
  );
}
