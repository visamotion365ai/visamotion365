"use client";

import { useEffect, useRef } from "react";
import { getAgent } from "@/lib/agents";
import type { ChatMessage } from "@/lib/chat";

/** Escape HTML then apply a small subset of markdown. */
function inline(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, '<code class="rounded bg-neutral-100 px-1 text-[13px]">$1</code>');
}

function MarkdownLite({ content }: { content: string }) {
  const lines = content.split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Table block
    if (line.trim().startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const cells = lines[i]
          .trim()
          .replace(/^\|/, "")
          .replace(/\|$/, "")
          .split("|")
          .map((cell) => cell.trim());
        if (!cells.every((cell) => /^-+$/.test(cell))) rows.push(cells);
        i += 1;
      }
      if (rows.length) {
        const [head, ...body] = rows;
        blocks.push(
          <div key={key++} className="my-3 overflow-x-auto">
            <table className="w-full border-collapse overflow-hidden rounded-xl border border-neutral-200 text-sm">
              <thead>
                <tr className="bg-neutral-50">
                  {head.map((cell, index) => (
                    <th key={index} className="border-b border-neutral-200 px-3 py-2 text-left font-medium text-neutral-700">
                      <span dangerouslySetInnerHTML={{ __html: inline(cell) }} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {body.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className="border-b border-neutral-100 px-3 py-2 align-top text-neutral-600 last:border-b-0">
                        <span dangerouslySetInnerHTML={{ __html: inline(cell) }} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>,
        );
      }
      continue;
    }

    // List block
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ""));
        i += 1;
      }
      blocks.push(
        <ul key={key++} className="my-2 list-disc space-y-1 pl-5">
          {items.map((item, index) => (
            <li key={index} dangerouslySetInnerHTML={{ __html: inline(item) }} />
          ))}
        </ul>,
      );
      continue;
    }

    // Heading / bold-only line
    const trimmed = line.trim();
    if (/^\*\*.+\*\*$/.test(trimmed)) {
      blocks.push(
        <h4 key={key++} className="mt-4 text-[15px] font-semibold text-neutral-900 first:mt-0">
          {trimmed.replace(/\*\*/g, "")}
        </h4>,
      );
      i += 1;
      continue;
    }

    if (!trimmed) {
      i += 1;
      continue;
    }

    // Paragraph
    blocks.push(
      <p key={key++} className="my-2 leading-relaxed" dangerouslySetInnerHTML={{ __html: inline(trimmed) }} />,
    );
    i += 1;
  }

  return <div className="text-[15px] text-neutral-700">{blocks}</div>;
}

interface ChatThreadProps {
  messages: ChatMessage[];
  isStreaming: boolean;
}

export default function ChatThread({ messages, isStreaming }: ChatThreadProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  return (
    <div className="mx-auto w-full max-w-[720px] space-y-6 pb-6">
      {messages.map((message, index) =>
        message.role === "user" ? (
          <div key={message.id} className="flex justify-end">
            <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl bg-neutral-100 px-4 py-2.5 text-[15px] text-neutral-900">
              {message.content}
            </div>
          </div>
        ) : (
          <div key={message.id} className="flex gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-white">
              {message.agentId ? getAgent(message.agentId).index : "V"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="mb-1 text-xs font-medium text-neutral-400">
                {message.agentId ? getAgent(message.agentId).shortName : "VisaMotion"}
              </p>
              <MarkdownLite content={message.content} />
              {isStreaming && index === messages.length - 1 && (
                <span className="vm-caret" aria-hidden />
              )}
            </div>
          </div>
        ),
      )}
      <div ref={endRef} />
    </div>
  );
}
