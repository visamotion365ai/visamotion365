import { randomId } from "./crypto";
import type { DB, AuditLog } from "./schema";

export function logAudit(
  db: DB,
  e: {
    actor_user_id?: string; actor_type: string; tenant_id?: string | null;
    action: string; resource_type?: string; resource_id?: string; metadata?: any;
  }
): AuditLog {
  const entry: AuditLog = {
    id: randomId("aud"),
    actor_user_id: e.actor_user_id,
    actor_type: e.actor_type,
    tenant_id: e.tenant_id || undefined,
    action: e.action,
    resource_type: e.resource_type,
    resource_id: e.resource_id,
    metadata: e.metadata,
    ip_address: "127.0.0.1",
    created_at: new Date().toISOString()
  };
  db.audit_logs.unshift(entry);
  if (db.audit_logs.length > 3000) db.audit_logs.length = 3000;
  return entry;
}
