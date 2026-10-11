import { needPortal } from "@/lib/session";
import { liveDb } from "@/lib/agents";
import { listMessages } from "@/lib/service";
import { PortalChat } from "./chat";

export default async function PortalMessagesPage() {
  const s = await needPortal();
  const db = liveDb();
  const cv = db.conversations.find((c) => c.applicant_id === s.applicant_id);
  const msgs = cv ? listMessages(s, cv.id) : [];
  return (
    <PortalChat
      applicantId={s.applicant_id!}
      initialMessages={msgs.map((m) => ({ id: m.id, sender: m.sender, senderName: m.sender_name, body: m.body, createdAt: m.created_at }))}
    />
  );
}
