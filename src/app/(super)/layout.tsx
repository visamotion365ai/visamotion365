import { needSuper } from "@/lib/session";
import { SuperShell } from "@/components/shells";
import { liveDb } from "@/lib/agents";
import { listNotifications } from "@/lib/service";

export default async function SuperLayout({ children }: { children: React.ReactNode }) {
  const s = await needSuper();
  const db = liveDb();
  const unread = listNotifications(s).filter((n) => !n.read).length;
  return (
    <SuperShell s={s} unread={unread}>
      <div id="top">{children}</div>
    </SuperShell>
  );
}
