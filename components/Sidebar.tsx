"use client";

import {
  Bot,
  FolderOpen,
  Globe,
  Search,
  Settings,
  SquarePen,
  type LucideIcon,
} from "lucide-react";
import AgentSelector from "./AgentSelector";
import { useStore } from "@/lib/store";
import { getAgent } from "@/lib/agents";

interface NavButtonProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  active?: boolean;
  badge?: number;
}

function NavButton({ icon: Icon, label, onClick, active, badge }: NavButtonProps) {
  return (
    <div className="group/nav relative flex items-center">
      <button
        type="button"
        aria-label={label}
        onClick={onClick}
        className={`relative flex h-11 w-11 items-center justify-center rounded-xl transition-colors ${
          active
            ? "bg-neutral-100 text-black"
            : "text-neutral-500 hover:bg-neutral-100 hover:text-black"
        }`}
      >
        <Icon size={22} strokeWidth={1.8} />
        {badge ? (
          <span className="absolute right-2 top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-black px-1 text-[10px] font-medium leading-none text-white">
            {badge}
          </span>
        ) : null}
      </button>
      <span className="vm-tooltip">{label}</span>
    </div>
  );
}

export default function Sidebar() {
  const setSettingsOpen = useStore((s) => s.setSettingsOpen);
  const setTasksPanelOpen = useStore((s) => s.setTasksPanelOpen);
  const setVaultOpen = useStore((s) => s.setVaultOpen);
  const setSearchOpen = useStore((s) => s.setSearchOpen);
  const toggleAgentSelector = useStore((s) => s.setAgentSelectorOpen);
  const agentSelectorOpen = useStore((s) => s.agentSelectorOpen);
  const resetChat = useStore((s) => s.resetChat);
  const activeAgentId = useStore((s) => s.activeAgentId);
  const taskCount = useStore((s) => s.cloudTasks.length);

  const activeAgent = getAgent(activeAgentId);

  return (
    <aside className="relative z-40 flex h-screen w-[64px] flex-col items-center justify-between border-r border-neutral-200 bg-white py-4">
      {/* Logo */}
      <div className="group/nav relative flex items-center">
        <button
          type="button"
          aria-label="VisaMotion 365"
          onClick={resetChat}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-neutral-900 to-neutral-700 text-white shadow-sm"
        >
          <span className="text-[15px] font-semibold tracking-tight">V</span>
        </button>
        <span className="vm-tooltip">VisaMotion 365</span>
      </div>

      {/* Primary navigation */}
      <nav className="flex flex-col items-center gap-2">
        <div className="group/nav relative">
          <NavButton icon={SquarePen} label="New Case / New Chat" onClick={resetChat} />
        </div>
        <div className="group/nav relative">
          <NavButton icon={Search} label="Search Consultations" onClick={() => setSearchOpen(true)} />
        </div>

        {/* Switch Agent — opens the flyout popover */}
        <div className="relative">
          <div className="group/nav relative flex items-center">
            <button
              type="button"
              aria-label="Switch Agent"
              aria-expanded={agentSelectorOpen}
              onClick={() => toggleAgentSelector(!agentSelectorOpen)}
              className={`relative flex h-11 w-11 items-center justify-center rounded-xl transition-colors ${
                agentSelectorOpen
                  ? "bg-neutral-100 text-black"
                  : "text-neutral-500 hover:bg-neutral-100 hover:text-black"
              }`}
            >
              <Bot size={22} strokeWidth={1.8} />
              <span
                className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-neutral-900 text-[9px] font-semibold leading-none text-white"
                aria-hidden
              >
                {activeAgent.index}
              </span>
            </button>
            <span className="vm-tooltip">Switch Agent</span>
          </div>
          {agentSelectorOpen && <AgentSelector />}
        </div>

        <div className="group/nav relative">
          <NavButton icon={FolderOpen} label="Document Vault" onClick={() => setVaultOpen(true)} />
        </div>
        <div className="group/nav relative">
          <NavButton
            icon={Globe}
            label="Active Cloud Browser Tasks"
            onClick={() => setTasksPanelOpen(true)}
            badge={taskCount || undefined}
          />
        </div>
        <div className="group/nav relative">
          <NavButton icon={Settings} label="API Keys & Config" onClick={() => setSettingsOpen(true)} />
        </div>
      </nav>

      {/* User avatar */}
      <div className="group/nav relative flex items-center">
        <div className="relative">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900 text-[11px] font-medium text-white">
            VM
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
        </div>
        <span className="vm-tooltip">VisaMotion 365 — online</span>
      </div>
    </aside>
  );
}
