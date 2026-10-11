import { needStaff } from "@/lib/session";
import { AgencyShell } from "@/components/shells";
import { liveDb } from "@/lib/agents";
import { listNotifications } from "@/lib/service";

export default async function AgencyLayout({ children }: { children: React.ReactNode }) {
  const s = await needStaff();
  const db = liveDb();
  const tenant = db.tenants.find((t) => t.id === s.tenant_id);
  const unread = listNotifications(s).filter((n) => !n.read).length;
  return <AgencyShell s={s} tenantName={tenant?.name} unread={unread}>{children}</AgencyShell>;
}
