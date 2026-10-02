"use client";

import {
  Bot,
  Compass,
  Download,
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
import { promptInstall, subscribeInstall } from "@/lib/pwa";
import { useEffect, useState } from "react";

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
        className={`relative flex h-11 w-11 items-center justify-center rounded-2xl transition-all duration-200 ${
          active
            ? "bg-white text-neutral-900 shadow-[0_6px_18px_-6px_rgba(15,32,24,0.4)]"
            : "text-neutral-500 hover:-translate-y-0.5 hover:bg-white/80 hover:text-neutral-900 hover:shadow-[0_6px_18px_-8px_rgba(15,32,24,0.35)]"
        }`}
      >
        <Icon size={22} strokeWidth={1.75} />
        {badge ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-neutral-900 px-1 text-[10px] font-medium leading-none text-white ring-2 ring-white">
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
  const setCountryDrawerOpen = useStore((s) => s.setCountryDrawerOpen);
  const toggleAgentSelector = useStore((s) => s.setAgentSelectorOpen);
  const agentSelectorOpen = useStore((s) => s.agentSelectorOpen);
  const resetChat = useStore((s) => s.resetChat);
  const activeAgentId = useStore((s) => s.activeAgentId);
  const taskCount = useStore((s) => s.cloudTasks.length);
  const countryCode = useStore((s) => s.countryCode);

  const [canInstall, setCanInstall] = useState(false);
  useEffect(() => subscribeInstall(setCanInstall), []);

  const activeAgent = getAgent(activeAgentId);

  const handleInstall = async () => {
    const outcome = await promptInstall();
    if (outcome === "unavailable") {
      window.dispatchEvent(new CustomEvent("visamotion:open-install"));
    }
  };

  return (
    <aside className="vm-sidebar relative z-40 flex h-[100dvh] w-[68px] shrink-0 flex-col items-center justify-between py-4">
      {/* Logo */}
      <div className="group/nav relative flex items-center">
        <button
          type="button"
          aria-label="VisaMotion 365"
          onClick={resetChat}
          className="vm-logo flex h-11 w-11 items-center justify-center rounded-[15px] text-white"
        >
          <span className="text-[16px] font-semibold tracking-tight">V</span>
        </button>
        <span className="vm-tooltip">VisaMotion 365</span>
      </div>

      {/* Primary navigation */}
      <nav className="vm-nav flex min-h-0 flex-col items-center gap-1.5 overflow-y-auto px-1 py-1">
        <div className="group/nav relative">
          <NavButton icon={SquarePen} label="New Case / New Chat" onClick={resetChat} />
        </div>
        <div className="group/nav relative">
          <NavButton icon={Search} label="Search Consultations" onClick={() => setSearchOpen(true)} />
        </div>

        {/* Switch Agent — flyout popover */}
        <div className="relative">
          <div className="group/nav relative flex items-center">
            <button
              type="button"
              aria-label="Switch Agent"
              aria-expanded={agentSelectorOpen}
              onClick={() => toggleAgentSelector(!agentSelectorOpen)}
              className={`relative flex h-11 w-11 items-center justify-center rounded-2xl transition-all duration-200 ${
                agentSelectorOpen
                  ? "bg-white text-neutral-900 shadow-[0_6px_18px_-6px_rgba(15,32,24,0.4)]"
                  : "text-neutral-500 hover:-translate-y-0.5 hover:bg-white/80 hover:text-neutral-900"
              }`}
            >
              <Bot size={22} strokeWidth={1.75} />
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
          <NavButton
            icon={Compass}
            label="Destinations & Flags"
            onClick={() => setCountryDrawerOpen(true)}
            active={Boolean(countryCode)}
          />
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

      {/* Bottom: install + user */}
      <div className="flex flex-col items-center gap-3">
        {canInstall ? (
          <div className="group/nav relative flex items-center">
            <button
              type="button"
              aria-label="Install app"
              onClick={handleInstall}
              className="vm-install-btn flex h-11 w-11 items-center justify-center rounded-2xl text-white"
            >
              <Download size={20} strokeWidth={1.9} />
            </button>
            <span className="vm-tooltip">Install app</span>
          </div>
        ) : null}

        <div className="group/nav relative flex items-center">
          <div className="relative">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-neutral-900 to-neutral-700 text-[11px] font-medium text-white shadow">
              VM
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
          </div>
          <span className="vm-tooltip">VisaMotion 365 — online</span>
        </div>
      </div>
    </aside>
  );
}
