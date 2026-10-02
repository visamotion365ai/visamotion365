"use client";

import { useEffect, useRef } from "react";
import { Check, Wrench } from "lucide-react";
import { AGENTS } from "@/lib/agents";
import { useStore } from "@/lib/store";

/**
 * Flyout popover listing the five autonomous agents.
 * Anchored next to the Bot icon in the slim sidebar.
 */
export default function AgentSelector() {
  const activeAgentId = useStore((s) => s.activeAgentId);
  const setActiveAgent = useStore((s) => s.setActiveAgent);
  const setAgentSelectorOpen = useStore((s) => s.setAgentSelectorOpen);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape.
  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setAgentSelectorOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAgentSelectorOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [setAgentSelectorOpen]);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Choose an agent"
      className="animate-fade-up fixed left-[76px] top-1/2 z-50 w-[340px] -translate-y-1/2 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-lg"
    >
      <div className="border-b border-neutral-100 px-4 py-3">
        <p className="text-sm font-medium text-neutral-900">Autonomous agents</p>
        <p className="mt-0.5 text-xs text-neutral-500">
          Five specialists. Switch instantly — the composer adapts.
        </p>
      </div>

      <ul className="max-h-[70vh] overflow-y-auto p-1.5">
        {AGENTS.map((agent) => {
          const active = agent.id === activeAgentId;
          return (
            <li key={agent.id}>
              <button
                type="button"
                onClick={() => setActiveAgent(agent.id)}
                className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                  active ? "bg-neutral-100" : "hover:bg-neutral-50"
                }`}
              >
                <span
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ring-1 ${agent.accentBg} ${agent.accentText} ${agent.accentRing}`}
                >
                  {agent.index}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-medium text-neutral-900">
                      {agent.shortName}
                    </span>
                    {active && <Check size={14} className="shrink-0 text-green-600" />}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-neutral-500">
                    {agent.blurb}
                  </span>
                  <span className="mt-1.5 flex items-center gap-1 text-[11px] text-neutral-400">
                    <Wrench size={11} />
                    {agent.tools.join(" · ")}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
