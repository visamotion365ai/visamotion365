"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Search } from "lucide-react";
import { AGENTS, QUICK_ACTIONS, type AgentId } from "@/lib/agents";
import { useStore } from "@/lib/store";

interface SearchOverlayProps {
  onPrefill: (text: string) => void;
  onSelectAgent: (id: AgentId) => void;
}

/** Lightweight command palette for consultations, agents and quick actions. */
export default function SearchOverlay({ onPrefill, onSelectAgent }: SearchOverlayProps) {
  const open = useStore((s) => s.searchOpen);
  const setOpen = useStore((s) => s.setSearchOpen);
  const messages = useStore((s) => s.messages);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [setOpen]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const consultations = messages
      .filter((message) => message.content.toLowerCase().includes(q))
      .slice(0, 5)
      .map((message) => ({
        kind: "Consultation" as const,
        label: message.content.slice(0, 90),
      }));
    const agents = AGENTS.filter(
      (agent) =>
        agent.name.toLowerCase().includes(q) || agent.shortName.toLowerCase().includes(q),
    ).map((agent) => ({ kind: "Agent" as const, label: agent.name, id: agent.id }));
    const actions = QUICK_ACTIONS.filter(
      (action) => action.title.toLowerCase().includes(q) || action.description.toLowerCase().includes(q),
    ).map((action) => ({ kind: "Action" as const, label: action.title, prompt: action.prompt, agentId: action.agentId }));
    if (!q) {
      return [...actions.slice(0, 6), ...agents];
    }
    return [...agents, ...actions, ...consultations].slice(0, 8);
  }, [query, messages]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center bg-black/20 p-4 pt-[12vh] backdrop-blur-[1px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setOpen(false);
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        className="w-full max-w-[560px] overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl"
      >
        <div className="flex items-center gap-3 border-b border-neutral-100 px-4 py-3">
          <Search size={18} className="text-neutral-400" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search consultations, agents, actions..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400"
          />
          <kbd className="rounded border border-neutral-200 px-1.5 py-0.5 text-[10px] text-neutral-400">
            ESC
          </kbd>
        </div>

        <ul className="max-h-[50vh] overflow-y-auto p-2">
          {results.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-neutral-400">No matches.</li>
          )}
          {results.map((result, index) => (
            <li key={`${result.kind}-${index}`}>
              <button
                type="button"
                onClick={() => {
                  if (result.kind === "Agent" && "id" in result) onSelectAgent(result.id as AgentId);
                  if (result.kind === "Action" && "prompt" in result) {
                    if ("agentId" in result) onSelectAgent(result.agentId as AgentId);
                    onPrefill(result.prompt as string);
                  }
                  setOpen(false);
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-neutral-50"
              >
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-neutral-500">
                  {result.kind}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-neutral-700">
                  {result.label}
                </span>
                <ArrowRight size={14} className="shrink-0 text-neutral-300" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
