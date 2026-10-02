"use client";

import { ChevronDown } from "lucide-react";
import { getAgent } from "@/lib/agents";
import { useStore } from "@/lib/store";

/**
 * Pill shown directly above the composer: "Active: Agent 3 — SOP Architect".
 * Clicking it re-opens the agent flyout.
 */
export default function ActiveAgentBadge() {
  const activeAgentId = useStore((s) => s.activeAgentId);
  const setAgentSelectorOpen = useStore((s) => s.setAgentSelectorOpen);
  const agent = getAgent(activeAgentId);

  return (
    <button
      type="button"
      onClick={() => setAgentSelectorOpen(true)}
      className="mx-auto mb-4 flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-200/70"
    >
      <span className={`h-1.5 w-1.5 rounded-full ${agent.accentText.replace("text-", "bg-")}`} />
      Active: Agent {agent.index} — {agent.shortName}
      <ChevronDown size={13} className="text-neutral-400" />
    </button>
  );
}
