import { needPortal } from "@/lib/session";
import { PortalShell } from "@/components/shells";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const s = await needPortal();
  return <PortalShell s={s}>{children}</PortalShell>;
}
