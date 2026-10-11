"use client";
import React, { useEffect, useRef, useState } from "react";
import { ActionForm } from "@/components/forms";
import { sendMessageAction } from "@/app/actions/main";
import { Bot, User, MessageSquare } from "lucide-react";
import { dtt } from "@/lib/format";

export function PortalChat({ applicantId, initialMessages }: {
  applicantId: string;
  initialMessages: { id: string; sender: "APPLICANT" | "STAFF" | "AUTO"; senderName: string; body: string; createdAt: string }[];
}) {
  const [body, setBody] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => { boxRef.current?.scrollTo(0, 99999); }, [initialMessages.length]);

  return (
    <div className="px-4 pt-5 pb-6 flex flex-col" style={{ minHeight: "calc(100vh - 80px)" }}>
      <div className="mb-3">
        <h1 className="text-lg font-black text-slate-900 flex items-center gap-2"><MessageSquare size={18} className="text-indigo-600" /> Inbox</h1>
        <p className="text-[11px] text-slate-400 mt-0.5">Try asking: “status”, “documents”, “fee” or “appointment”.</p>
      </div>
      <div ref={boxRef} className="flex-1 space-y-2.5 overflow-y-auto pr-1" style={{ maxHeight: "52vh" }}>
        {initialMessages.map((m) => (
          <div key={m.id} className={`flex ${m.sender === "APPLICANT" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${m.sender === "APPLICANT" ? "bg-indigo-600 text-white" : m.sender === "AUTO" ? "bg-violet-50 border border-violet-100 text-slate-700" : "bg-slate-100 text-slate-800"}`}>
              <p className={`text-[9px] font-bold ${m.sender === "APPLICANT" ? "text-indigo-200" : m.sender === "AUTO" ? "text-violet-500" : "text-slate-400"} flex items-center gap-1`}>
                {m.sender === "AUTO" ? <Bot size={10} /> : m.sender === "APPLICANT" ? <User size={10} /> : null}
                {m.senderName}
              </p>
              <p className="text-xs leading-relaxed mt-0.5">{m.body}</p>
              <p className={`text-[9px] mt-1 ${m.sender === "APPLICANT" ? "text-indigo-300" : "text-slate-400"}`}>{dtt(m.createdAt)}</p>
            </div>
          </div>
        ))}
        {initialMessages.length === 0 && <p className="text-center text-[11px] text-slate-400 py-8">Say hello 👋 — the auto-responder answers instantly.</p>}
      </div>
      <div className="mt-3">
        <ActionForm action={sendMessageAction} submit="Send" variant="brand">
          <input type="hidden" name="applicant_id" value={applicantId} />
          <input name="body" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Type a message…"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
        </ActionForm>
      </div>
    </div>
  );
}
