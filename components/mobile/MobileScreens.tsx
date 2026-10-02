"use client";

import { useRef } from "react";
import {
  Bell,
  CheckCircle2,
  Download,
  FileText,
  FolderOpen,
  Globe,
  Moon,
  Paperclip,
  Plus,
  Settings as SettingsIcon,
  Sparkles,
  Sun,
  Trash2,
  UserRound,
} from "lucide-react";
import { CountryCards } from "@/components/CountryCards";
import ChatThread from "@/components/ChatThread";
import HeroInput from "@/components/HeroInput";
import ActiveAgentBadge from "@/components/ActiveAgentBadge";
import type { Country } from "@/lib/countries";
import { getCountry } from "@/lib/countries";
import { useStore, type Attachment, type VisaApplication } from "@/lib/store";
import { getAgent, type ChatMode } from "@/lib/agents";
import { promptInstall } from "@/lib/pwa";

const fmt = (ts: number) =>
  new Date(ts).toLocaleDateString(undefined, { day: "numeric", month: "short" });

/* ------------------------------- Applications ------------------------------ */

export function ApplicationsScreen({
  onResume,
  onNew,
}: {
  onResume: (application: VisaApplication) => void;
  onNew: () => void;
}) {
  const applications = useStore((s) => s.applications);
  const removeApplication = useStore((s) => s.removeApplication);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="vm-m-title">Applications</h1>
          <p className="vm-m-sub">{applications.length} saved case(s)</p>
        </div>
        <button type="button" onClick={onNew} className="vm-m-icon-btn" aria-label="New application">
          <Plus size={18} />
        </button>
      </div>

      {applications.length === 0 && (
        <div className="vm-m-card text-center">
          <FolderOpen size={26} className="mx-auto text-neutral-300" />
          <p className="vm-m-sub mt-3">No applications yet. Start one from Home.</p>
          <button type="button" onClick={onNew} className="vm-m-ghost mx-auto mt-4 w-auto px-4">
            Start an application
          </button>
        </div>
      )}

      {applications.map((app) => (
        <div key={app.id} className="vm-m-card">
          <div className="flex items-start gap-3">
            <span className="vm-flag vm-flag-lg">
              <img src={`https://flagcdn.com/w160/${app.countryCode}.png`} alt="" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold text-neutral-900 dark:text-neutral-50">
                {app.countryName || "Unnamed destination"}
              </p>
              <p className="truncate text-[12px] text-neutral-500">
                {app.visaType || "Visa type pending"} · {app.fullName || "No name"}
              </p>
            </div>
            <span
              className={`vm-chip ${
                app.status === "submitted" ? "is-green" : "is-amber"
              }`}
            >
              {app.status}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[11px] text-neutral-400">
              Step {app.step}/3 · {fmt(app.createdAt)}
            </span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => onResume(app)} className="vm-m-mini-btn">
                {app.status === "submitted" ? "View" : "Resume"}
              </button>
              <button
                type="button"
                aria-label="Delete"
                onClick={() => removeApplication(app.id)}
                className="vm-m-icon-btn danger"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------- Destinations ------------------------------ */

export function DestinationsScreen({
  onPickCountry,
  guide = false,
}: {
  onPickCountry: (country: Country) => void;
  guide?: boolean;
}) {
  const tips = [
    "Passport valid 6+ months beyond travel",
    "Bank statements for the last 3–6 months",
    "Employment / sponsorship letter",
    "Police clearance & medicals (when asked)",
  ];
  return (
    <div className="space-y-4">
      <div>
        <h1 className="vm-m-title">{guide ? "Visa Guide" : "Travel & Destinations"}</h1>
        <p className="vm-m-sub">
          {guide ? "Route notes for every destination we cover." : "Tap a country to start a case."}
        </p>
      </div>

      {guide && (
        <div className="vm-m-card">
          <h2 className="vm-m-section flex items-center gap-2">
            <Sparkles size={15} className="text-violet-500" /> Universal checklist
          </h2>
          <ul className="mt-2 space-y-2">
            {tips.map((tip) => (
              <li key={tip} className="flex items-start gap-2 text-[13px] text-neutral-600 dark:text-neutral-300">
                <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-500" />
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      <CountryCards variant="grid" onSelect={onPickCountry} />
    </div>
  );
}

/* -------------------------------- Documents -------------------------------- */

export function DocumentsScreen({
  files,
  onAddFiles,
  onRemoveFile,
}: {
  files: Attachment[];
  onAddFiles: (files: File[]) => void;
  onRemoveFile: (id: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="vm-m-title">Documents</h1>
          <p className="vm-m-sub">{files.length} file(s) staged for audit</p>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="vm-m-icon-btn"
          aria-label="Add document"
        >
          <Paperclip size={18} />
        </button>
        <input
          ref={inputRef}
          type="file"
          hidden
          multiple
          accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.webp"
          onChange={(e) => {
            if (e.target.files?.length) onAddFiles(Array.from(e.target.files));
            e.target.value = "";
          }}
        />
      </div>

      {files.length === 0 && (
        <div className="vm-m-card text-center">
          <FileText size={26} className="mx-auto text-neutral-300" />
          <p className="vm-m-sub mt-3">Attach passport, bank statements, ITR, PCC, medicals.</p>
        </div>
      )}

      {files.map((file) => (
        <div key={file.id} className="vm-m-card flex items-center gap-3 py-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500 dark:bg-white/5">
            <FileText size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-neutral-800 dark:text-neutral-100">
              {file.name}
            </p>
            <p className="text-[11px] text-neutral-400">{(file.size / 1024).toFixed(0)} KB</p>
          </div>
          <button
            type="button"
            aria-label="Remove"
            onClick={() => onRemoveFile(file.id)}
            className="vm-m-icon-btn danger"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------ Notifications ------------------------------ */

export function NotificationsScreen() {
  const applications = useStore((s) => s.applications);
  const cloudTasks = useStore((s) => s.cloudTasks);

  const items = [
    ...applications.slice(0, 6).map((app) => ({
      id: `app-${app.id}`,
      icon: CheckCircle2,
      tone: "text-emerald-500",
      title: app.status === "submitted" ? "Application submitted" : "Draft application",
      body: `${app.countryName} · ${app.visaType || "Visa"}`,
      time: fmt(app.createdAt),
    })),
    ...cloudTasks.slice(0, 6).map((task) => ({
      id: `task-${task.id}`,
      icon: Globe,
      tone: "text-sky-500",
      title: "Cloud browser task",
      body: task.task.slice(0, 70),
      time: fmt(task.createdAt),
    })),
    {
      id: "welcome",
      icon: Sparkles,
      tone: "text-violet-500",
      title: "Welcome to VisaMotion 365",
      body: "Five AI agents are ready for your case.",
      time: "now",
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="vm-m-title">Notifications</h1>
        <p className="vm-m-sub">{items.length} updates</p>
      </div>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.id} className="vm-m-card flex items-start gap-3 py-3.5">
            <Icon size={18} className={`mt-0.5 shrink-0 ${item.tone}`} />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-neutral-800 dark:text-neutral-100">
                {item.title}
              </p>
              <p className="truncate text-[12px] text-neutral-500">{item.body}</p>
            </div>
            <span className="shrink-0 text-[11px] text-neutral-400">{item.time}</span>
          </div>
        );
      })}
    </div>
  );
}

/* --------------------------------- Profile --------------------------------- */

export function ProfileScreen({ onOpenSettings }: { onOpenSettings: () => void }) {
  const applications = useStore((s) => s.applications);
  const attachments = useStore((s) => s.attachments);
  const cloudTasks = useStore((s) => s.cloudTasks);
  const theme = useStore((s) => s.theme);
  const toggleTheme = useStore((s) => s.toggleTheme);
  const latest = applications[0];

  return (
    <div className="space-y-4">
      <div className="vm-m-card text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg">
          <UserRound size={28} />
        </div>
        <h1 className="mt-3 text-[17px] font-semibold text-neutral-900 dark:text-neutral-50">
          {latest?.fullName || "Guest applicant"}
        </h1>
        <p className="text-[12px] text-neutral-500">{latest?.email || "Add your profile in a case"}</p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Stat value={applications.length} label="Cases" />
          <Stat value={attachments.length} label="Docs" />
          <Stat value={cloudTasks.length} label="Tasks" />
        </div>
      </div>

      <div className="vm-m-card divide-y divide-neutral-100 dark:divide-white/5">
        <button type="button" onClick={toggleTheme} className="vm-m-row">
          <span className="flex items-center gap-3">
            {theme === "dark" ? <Moon size={17} /> : <Sun size={17} />}
            Dark mode
          </span>
          <span className={`vm-switch ${theme === "dark" ? "is-on" : ""}`}>
            <span className="vm-switch-knob" />
          </span>
        </button>
        <button type="button" onClick={onOpenSettings} className="vm-m-row">
          <span className="flex items-center gap-3">
            <SettingsIcon size={17} /> API keys & config
          </span>
          <span className="text-neutral-300">›</span>
        </button>
        <button
          type="button"
          onClick={async () => {
            const outcome = await promptInstall();
            if (outcome === "unavailable")
              window.dispatchEvent(new CustomEvent("visamotion:open-install"));
          }}
          className="vm-m-row"
        >
          <span className="flex items-center gap-3">
            <Download size={17} /> Install app
          </span>
          <span className="text-neutral-300">›</span>
        </button>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl bg-neutral-50 py-3 dark:bg-white/5">
      <p className="text-[18px] font-semibold text-neutral-900 dark:text-neutral-50">{value}</p>
      <p className="text-[11px] text-neutral-400">{label}</p>
    </div>
  );
}

/* -------------------------------- Assistant -------------------------------- */

interface AssistantProps {
  input: string;
  setInput: (value: string) => void;
  onSend: () => void;
  mode: ChatMode;
  setMode: (mode: ChatMode) => void;
  files: Attachment[];
  onAddFiles: (files: File[]) => void;
  onRemoveFile: (id: string) => void;
  isStreaming: boolean;
}

const QUICK = [
  "Assess my eligibility for Canada work permit",
  "Audit my document checklist",
  "Draft my statement of purpose",
  "Analyze my visa refusal letter",
];

export function AssistantScreen(props: AssistantProps) {
  const messages = useStore((s) => s.messages);
  const activeAgentId = useStore((s) => s.activeAgentId);
  const agent = getAgent(activeAgentId);
  const countryCode = useStore((s) => s.countryCode);
  const country = countryCode ? getCountry(countryCode) : undefined;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0">
        <h1 className="vm-m-title">AI Assistant</h1>
        <p className="vm-m-sub">
          {country ? `${country.flag} ${country.name} · ` : ""}
          {agent.shortName}
        </p>
        <div className="mt-3">
          <ActiveAgentBadge />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto py-4">
        {messages.length === 0 ? (
          <div className="space-y-2">
            <p className="vm-m-sub mb-2">Try one of these:</p>
            {QUICK.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => props.setInput(prompt)}
                className="vm-m-card w-full py-3 text-left text-[13px] text-neutral-700 dark:text-neutral-200"
              >
                {prompt}
              </button>
            ))}
          </div>
        ) : (
          <ChatThread messages={messages} isStreaming={props.isStreaming} />
        )}
      </div>

      <div className="shrink-0 pt-2">
        <HeroInput
          value={props.input}
          onChange={props.setInput}
          onSubmit={props.onSend}
          files={props.files}
          onAddFiles={props.onAddFiles}
          onRemoveFile={props.onRemoveFile}
          mode={props.mode}
          onModeChange={props.setMode}
          disabled={props.isStreaming}
        />
      </div>
    </div>
  );
}
