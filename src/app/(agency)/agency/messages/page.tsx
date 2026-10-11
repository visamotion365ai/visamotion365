import { needStaff } from "@/lib/session";
import { listConversations, listMessages } from "@/lib/service";
import { liveDb } from "@/lib/agents";
import { PageHeader, Card, CardHead, Badge, Avatar, Empty } from "@/components/ui";
import { ActionForm } from "@/components/forms";
import { sendMessageAction } from "@/app/actions/main";
import { Bot, User } from "lucide-react";
import { dtt } from "@/lib/format";

export default async function AgencyMessagesPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const s = await needStaff();
  const db = liveDb();
  const sp = await searchParams;
  const cvs = listConversations(s);
  const cv = cvs.find((c) => c.id === sp.c) || cvs[0];
  const msgs = cv ? listMessages(s, cv.id) : [];
  const app = cv ? db.applicants.find((a) => a.id === cv.applicant_id) : null;

  return (
    <div className="fade-up">
      <PageHeader crumb="Agency" title="Messages" sub="Talk to your applicants. The auto-responder handles instant FAQs with approved templates." />
      <div className="grid lg:grid-cols-[320px_1fr] gap-4">
        <Card>
          <CardHead title="Applicants" />
          <div className="px-4 pb-4 space-y-2">
            {cvs.map((c) => {
              const a = db.applicants.find((x) => x.id === c.applicant_id);
              return (
                <a key={c.id} href={`/agency/messages?c=${c.id}`}
                  className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 ${cv?.id === c.id ? "border-indigo-300 bg-indigo-50/40" : "border-slate-100 hover:border-slate-300"}`}>
                  <Avatar name={`${a?.first_name} ${a?.last_name}`} size={30} />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{a?.first_name} {a?.last_name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{a?.target_country}</p>
                  </div>
                </a>
              );
            })}
            {cvs.length === 0 && <Empty title="No conversations yet" sub="They appear when applicants message you from the portal." />}
          </div>
        </Card>
        <Card className="flex flex-col">
          <CardHead title={app ? `${app.first_name} ${app.last_name}` : "Select a conversation"}
            sub={cv ? `${cv.channel} • auto-responder ${cv.auto_responder ? "ON" : "OFF"}` : ""} />
          <div className="flex-1 px-5 space-y-2.5 min-h-[300px] max-h-[420px] overflow-y-auto">
            {msgs.map((m) => (
              <div key={m.id} className={`flex ${m.sender === "STAFF" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 ${m.sender === "STAFF" ? "bg-indigo-600 text-white" : m.sender === "AUTO" ? "bg-violet-50 border border-violet-100 text-slate-700" : "bg-slate-100 text-slate-800"}`}>
                  <p className={`text-[10px] font-bold ${m.sender === "STAFF" ? "text-indigo-200" : m.sender === "AUTO" ? "text-violet-500" : "text-slate-400"} flex items-center gap-1`}>
                    {m.sender === "AUTO" && <Bot size={10} />} {m.sender_name}
                  </p>
                  <p className="text-xs leading-relaxed mt-0.5">{m.body}</p>
                  <p className={`text-[9px] mt-1 ${m.sender === "STAFF" ? "text-indigo-300" : "text-slate-400"}`}>{dtt(m.created_at)}</p>
                </div>
              </div>
            ))}
            {msgs.length === 0 && <Empty title="No messages yet" />}
          </div>
          {cv && (
            <div className="p-4 border-t border-slate-100">
              <ActionForm action={sendMessageAction} submit="Send message" variant="brand">
                <input type="hidden" name="conversation_id" value={cv.id} />
                <textarea name="body" rows={2} required placeholder="Write a message…"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
              </ActionForm>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
