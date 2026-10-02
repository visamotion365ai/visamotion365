"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  BookOpen,
  FileText,
  Flower2,
  FolderOpen,
  Home,
  Menu,
  Moon,
  Plane,
  Settings as SettingsIcon,
  Sparkles,
  Sun,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import ApplicationForm from "@/components/mobile/ApplicationForm";
import {
  ApplicationsScreen,
  AssistantScreen,
  DestinationsScreen,
  DocumentsScreen,
  NotificationsScreen,
  ProfileScreen,
} from "@/components/mobile/MobileScreens";
import type { Country } from "@/lib/countries";
import { useStore, type Attachment, type VisaApplication } from "@/lib/store";
import type { ChatMode } from "@/lib/agents";

type Tab =
  | "home"
  | "applications"
  | "assistant"
  | "travel"
  | "guide"
  | "documents"
  | "notifications"
  | "profile";

interface NavItem {
  id: Tab;
  label: string;
  icon: LucideIcon;
  dot?: boolean;
}

const NAV: NavItem[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "applications", label: "Applications", icon: FileText },
  { id: "assistant", label: "AI Assistant", icon: Sparkles },
  { id: "travel", label: "Travel", icon: Plane },
  { id: "guide", label: "Visa Guide", icon: BookOpen },
  { id: "documents", label: "Documents", icon: FolderOpen },
  { id: "notifications", label: "Notifications", icon: Bell, dot: true },
  { id: "profile", label: "Profile", icon: UserRound },
];

export interface MobileAppProps {
  input: string;
  setInput: (value: string) => void;
  onSend: () => void;
  mode: ChatMode;
  setMode: (mode: ChatMode) => void;
  files: Attachment[];
  onAddFiles: (files: File[]) => void;
  onRemoveFile: (id: string) => void;
  isStreaming: boolean;
  onSelectCountry: (country: Country) => void;
}

export default function MobileApp(props: MobileAppProps) {
  const theme = useStore((s) => s.theme);
  const toggleTheme = useStore((s) => s.toggleTheme);
  const setSettingsOpen = useStore((s) => s.setSettingsOpen);
  const loadApplications = useStore((s) => s.loadApplications);

  const [tab, setTab] = useState<Tab>("home");
  const [drawer, setDrawer] = useState(false);
  const [resume, setResume] = useState<VisaApplication | null>(null);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const go = (next: Tab) => {
    setTab(next);
    setDrawer(false);
  };

  const openAssistant = (country: Country) => {
    props.onSelectCountry(country);
    setTab("assistant");
  };

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden">
      {/* Header */}
      <header className="vm-m-header relative z-20 flex shrink-0 items-center gap-3 px-4 pb-3 pt-4">
        <button
          type="button"
          aria-label="Open menu"
          onClick={() => setDrawer(true)}
          className="vm-m-icon-btn"
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2">
          <span className="vm-mark">
            <Flower2 size={19} />
          </span>
          <span className="text-[19px] font-semibold tracking-tight text-neutral-900 dark:text-white">
            Visa <span className="vm-wordmark">AI</span>
          </span>
        </div>
        <button
          type="button"
          aria-label="Profile"
          onClick={() => go("profile")}
          className="vm-m-avatar ml-auto"
        >
          <UserRound size={18} />
        </button>
      </header>

      {/* Screens */}
      <main className="relative z-10 flex min-h-0 flex-1 flex-col">
        {tab === "assistant" ? (
          <div className="min-h-0 flex-1 px-4 pb-3">
            <AssistantScreen
              input={props.input}
              setInput={props.setInput}
              onSend={props.onSend}
              mode={props.mode}
              setMode={props.setMode}
              files={props.files}
              onAddFiles={props.onAddFiles}
              onRemoveFile={props.onRemoveFile}
              isStreaming={props.isStreaming}
            />
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-2">
            {tab === "home" && (
              <ApplicationForm
                key={resume?.id ?? "new"}
                initial={resume}
                onOpenAssistant={openAssistant}
                onViewApplications={() => go("applications")}
              />
            )}
            {tab === "applications" && (
              <ApplicationsScreen
                onResume={(app) => {
                  setResume(app);
                  go("home");
                }}
                onNew={() => {
                  setResume(null);
                  go("home");
                }}
              />
            )}
            {tab === "travel" && <DestinationsScreen onPickCountry={openAssistant} />}
            {tab === "guide" && <DestinationsScreen onPickCountry={openAssistant} guide />}
            {tab === "documents" && (
              <DocumentsScreen
                files={props.files}
                onAddFiles={props.onAddFiles}
                onRemoveFile={props.onRemoveFile}
              />
            )}
            {tab === "notifications" && <NotificationsScreen />}
            {tab === "profile" && (
              <ProfileScreen onOpenSettings={() => setSettingsOpen(true)} />
            )}
          </div>
        )}
      </main>

      {/* Drawer */}
      {drawer && (
        <div className="fixed inset-0 z-[65] lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setDrawer(false)}
            className="absolute inset-0 bg-neutral-900/30 backdrop-blur-sm"
          />
          <aside className="vm-m-drawer vm-anim-in absolute bottom-0 left-0 top-0 flex w-[78%] max-w-[320px] flex-col p-4">
            <div className="flex items-center gap-2 px-2 pb-4 pt-1">
              <span className="vm-mark">
                <Flower2 size={18} />
              </span>
              <span className="text-[17px] font-semibold tracking-tight text-neutral-900 dark:text-white">
                Visa <span className="vm-wordmark">AI</span>
              </span>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setDrawer(false)}
                className="vm-m-icon-btn ml-auto"
              >
                <X size={18} />
              </button>
            </div>

            <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
              {NAV.map((item) => {
                const Icon = item.icon;
                const active = tab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => go(item.id)}
                    className={`vm-m-nav ${active ? "is-active" : ""}`}
                  >
                    <Icon size={19} strokeWidth={1.8} />
                    <span>{item.label}</span>
                    {item.dot && <span className="vm-dot ml-auto" />}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => {
                  setSettingsOpen(true);
                  setDrawer(false);
                }}
                className="vm-m-nav"
              >
                <SettingsIcon size={19} strokeWidth={1.8} />
                <span>Settings</span>
              </button>

              <div className="my-2 border-t border-neutral-200/70 dark:border-white/10" />

              <button type="button" onClick={toggleTheme} className="vm-m-nav">
                {theme === "dark" ? <Moon size={19} /> : <Sun size={19} />}
                <span>Dark Mode</span>
                <span className={`vm-switch ml-auto ${theme === "dark" ? "is-on" : ""}`}>
                  <span className="vm-switch-knob" />
                </span>
              </button>
            </nav>

            <p className="px-3 pt-4 text-[11px] text-neutral-400">
              VisaMotion 365 · v2.0
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}
