// -----------------------------------------------------------------------------
// lib/store.ts
// Single Zustand store for VisaMotion 365: active agent, persisted config,
// chat messages, streaming state and cloud browser tasks.
//
// Config is persisted to localStorage under the key `visamotion_config`.
// -----------------------------------------------------------------------------

import { create } from "zustand";
import { AGENTS, type AgentId } from "./agents";
import type { ChatMessage } from "./chat";

export const CONFIG_STORAGE_KEY = "visamotion_config";

export type ProxyCountry = "us" | "uk" | "ca" | "au" | "de" | "ae";
export type LlmProvider = "openai" | "gemini" | "anthropic";

export interface AppConfig {
  browserUseKey: string;
  base44Key: string;
  base44Endpoint: string;
  llmProvider: LlmProvider;
  llmKey: string;
  proxyCountry: ProxyCountry;
}

export const DEFAULT_CONFIG: AppConfig = {
  browserUseKey: "",
  base44Key: "",
  base44Endpoint: "",
  llmProvider: "openai",
  llmKey: "",
  proxyCountry: "us",
};

export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  addedAt: number;
}

export interface CloudTask {
  id: string;
  remoteId: string;
  task: string;
  status: string;
  output: string;
  liveUrl?: string;
  createdAt: number;
}

/** Test status per settings field. */
export type TestState = "idle" | "testing" | "connected" | "error";

interface VisaMotionState {
  // ---- agent ---------------------------------------------------------------
  activeAgentId: AgentId;
  setActiveAgent: (id: AgentId) => void;

  // ---- config --------------------------------------------------------------
  config: AppConfig;
  configLoaded: boolean;
  loadConfig: () => void;
  setConfig: (patch: Partial<AppConfig>) => void;
  saveConfig: () => void;
  resetConfig: () => void;

  // ---- UI panels -----------------------------------------------------------
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  agentSelectorOpen: boolean;
  setAgentSelectorOpen: (open: boolean) => void;
  tasksPanelOpen: boolean;
  setTasksPanelOpen: (open: boolean) => void;
  vaultOpen: boolean;
  setVaultOpen: (open: boolean) => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;

  // ---- chat ----------------------------------------------------------------
  messages: ChatMessage[];
  addMessage: (message: ChatMessage) => void;
  appendToMessage: (id: string, token: string) => void;
  setMessageContent: (id: string, content: string) => void;
  isStreaming: boolean;
  setStreaming: (streaming: boolean) => void;
  resetChat: () => void;

  // ---- attachments (document vault) ---------------------------------------
  attachments: Attachment[];
  addAttachment: (file: Attachment) => void;
  removeAttachment: (id: string) => void;

  // ---- cloud tasks ---------------------------------------------------------
  cloudTasks: CloudTask[];
  addCloudTask: (task: CloudTask) => void;
  updateCloudTask: (id: string, patch: Partial<CloudTask>) => void;
  clearCloudTasks: () => void;
}

function readConfig(): AppConfig {
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  try {
    const raw = window.localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    return { ...DEFAULT_CONFIG, ...(JSON.parse(raw) as Partial<AppConfig>) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export const useStore = create<VisaMotionState>((set, get) => ({
  activeAgentId: AGENTS[0].id,
  setActiveAgent: (id) =>
    set({ activeAgentId: id, agentSelectorOpen: false }),

  config: DEFAULT_CONFIG,
  configLoaded: false,
  loadConfig: () => set({ config: readConfig(), configLoaded: true }),
  setConfig: (patch) => set({ config: { ...get().config, ...patch } }),
  saveConfig: () => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(get().config));
  },
  resetConfig: () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(CONFIG_STORAGE_KEY);
    }
    set({ config: DEFAULT_CONFIG });
  },

  settingsOpen: false,
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  agentSelectorOpen: false,
  setAgentSelectorOpen: (open) => set({ agentSelectorOpen: open }),
  tasksPanelOpen: false,
  setTasksPanelOpen: (open) => set({ tasksPanelOpen: open }),
  vaultOpen: false,
  setVaultOpen: (open) => set({ vaultOpen: open }),
  searchOpen: false,
  setSearchOpen: (open) => set({ searchOpen: open }),

  messages: [],
  addMessage: (message) => set({ messages: [...get().messages, message] }),
  appendToMessage: (id, token) =>
    set({
      messages: get().messages.map((message) =>
        message.id === id
          ? { ...message, content: message.content + token }
          : message,
      ),
    }),
  setMessageContent: (id, content) =>
    set({
      messages: get().messages.map((message) =>
        message.id === id ? { ...message, content } : message,
      ),
    }),
  isStreaming: false,
  setStreaming: (streaming) => set({ isStreaming: streaming }),
  resetChat: () => set({ messages: [], isStreaming: false }),

  attachments: [],
  addAttachment: (file) =>
    set({ attachments: [file, ...get().attachments].slice(0, 50) }),
  removeAttachment: (id) =>
    set({ attachments: get().attachments.filter((file) => file.id !== id) }),

  cloudTasks: [],
  addCloudTask: (task) => set({ cloudTasks: [task, ...get().cloudTasks].slice(0, 30) }),
  updateCloudTask: (id, patch) =>
    set({
      cloudTasks: get().cloudTasks.map((task) =>
        task.id === id ? { ...task, ...patch } : task,
      ),
    }),
  clearCloudTasks: () => set({ cloudTasks: [] }),
}));
