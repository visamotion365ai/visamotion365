"use client";

import { useEffect, useRef, useState } from "react";
import Sidebar from "@/components/Sidebar";
import ActiveAgentBadge from "@/components/ActiveAgentBadge";
import HeroInput from "@/components/HeroInput";
import ActionGrid from "@/components/ActionGrid";
import ChatThread from "@/components/ChatThread";
import SettingsModal from "@/components/SettingsModal";
import CloudTasksPanel from "@/components/CloudTasksPanel";
import DocumentVault from "@/components/DocumentVault";
import SearchOverlay from "@/components/SearchOverlay";
import { FILTER_CHIPS, getAgent, type AgentId, type ChatMode, type QuickAction } from "@/lib/agents";
import { createMessage, streamChat } from "@/lib/chat";
import { createBrowserTask } from "@/lib/browserUse";
import { useStore, type Attachment } from "@/lib/store";

/** Map a filter chip to an agent + prompt + mode. */
const CHIP_RECIPES: Record<string, { agentId: AgentId; prompt: string; mode?: ChatMode }> = {
  "Assess Eligibility": {
    agentId: "strategist",
    prompt: "Assess this applicant's eligibility. Profile: age, education, language score, work experience, target country.",
  },
  "Audit Documents": {
    agentId: "auditor",
    prompt: "Audit my document checklist and return PASS / FAIL / MISSING for each item. Documents: ",
  },
  "Generate SOP": {
    agentId: "writer",
    prompt: "Draft a statement of purpose. Background: ",
  },
  "Analyze Refusal": {
    agentId: "forensic",
    prompt: "Analyze this refusal letter and build a re-application rebuttal. Refusal text: ",
  },
  "Check Embassy Slots": {
    agentId: "portal",
    prompt: "Check the earliest available appointment slot on the official portal for this country and visa type.",
    mode: "browser",
  },
  "Cloud Browser Agent": {
    agentId: "portal",
    prompt: "Launch a cloud browser task to verify the current official portal guidelines and appointment information.",
    mode: "browser",
  },
};

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export default function Home() {
  const activeAgentId = useStore((s) => s.activeAgentId);
  const setActiveAgent = useStore((s) => s.setActiveAgent);
  const messages = useStore((s) => s.messages);
  const addMessage = useStore((s) => s.addMessage);
  const appendToMessage = useStore((s) => s.appendToMessage);
  const setMessageContent = useStore((s) => s.setMessageContent);
  const isStreaming = useStore((s) => s.isStreaming);
  const setStreaming = useStore((s) => s.setStreaming);
  const resetChat = useStore((s) => s.resetChat);
  const config = useStore((s) => s.config);
  const loadConfig = useStore((s) => s.loadConfig);
  const addCloudTask = useStore((s) => s.addCloudTask);
  const addAttachment = useStore((s) => s.addAttachment);
  const removeAttachment = useStore((s) => s.removeAttachment);
  const setSettingsOpen = useStore((s) => s.setSettingsOpen);
  const setTasksPanelOpen = useStore((s) => s.setTasksPanelOpen);

  const [input, setInput] = useState("");
  const [mode, setMode] = useState<ChatMode>("browser");
  const [composerFiles, setComposerFiles] = useState<Attachment[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    loadConfig();
    return () => abortRef.current?.abort();
  }, [loadConfig]);

  const agent = getAgent(activeAgentId);
  const hasConversation = messages.length > 0;

  const handleAddFiles = (files: File[]) => {
    const next = files.map((file) => ({
      id: uid(),
      name: file.name,
      size: file.size,
      type: file.type,
      addedAt: Date.now(),
    }));
    setComposerFiles((current) => [...current, ...next]);
    next.forEach(addAttachment);
  };

  const handleRemoveFile = (id: string) => {
    setComposerFiles((current) => current.filter((file) => file.id !== id));
    removeAttachment(id);
  };

  const prefill = (text: string) => setInput(text);
  const selectAgent = (id: AgentId) => setActiveAgent(id);

  const applyChip = (chip: string) => {
    const recipe = CHIP_RECIPES[chip];
    if (!recipe) return;
    setActiveAgent(recipe.agentId);
    setInput(recipe.prompt);
    if (recipe.mode) setMode(recipe.mode);
  };

  const applyAction = (action: QuickAction) => {
    setActiveAgent(action.agentId);
    setInput(action.prompt);
  };

  const send = async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    const userMessage = createMessage("user", text);
    const assistantMessage = createMessage("assistant", "", activeAgentId);
    addMessage(userMessage);
    addMessage(assistantMessage);
    setInput("");
    setComposerFiles([]);
    setStreaming(true);

    // --- Real Browser Use Cloud task when the browser mode is selected -------
    if (mode === "browser") {
      if (config.browserUseKey) {
        try {
          const task = await createBrowserTask(text, config.browserUseKey, {
            proxyCountryCode: config.proxyCountry,
            maxSteps: 20,
          });
          addCloudTask({
            id: uid(),
            remoteId: task.id,
            task: text,
            status: task.status,
            output: "",
            liveUrl: task.liveUrl,
            createdAt: Date.now(),
          });
          setTasksPanelOpen(true);
          setMessageContent(
            assistantMessage.id,
            `**Cloud browser task launched** — \`${task.id}\` (status: ${task.status}). Track it in Active Cloud Browser Tasks.\n\n`,
          );
        } catch (error) {
          setMessageContent(
            assistantMessage.id,
            `**Browser Use error:** ${(error as Error).message}\n\n`,
          );
        }
      } else {
        setMessageContent(
          assistantMessage.id,
          `**Browser Use key missing.** Open Settings → Browser Use Cloud and add your \`bu_...\` key to launch real cloud tasks.\n\n`,
        );
      }
    }

    const controller = new AbortController();
    abortRef.current = controller;

    await streamChat(
      {
        agentId: activeAgentId,
        messages: [...messages, userMessage],
        mode,
        config: { llmProvider: config.llmProvider, llmKey: config.llmKey },
        signal: controller.signal,
      },
      {
        onToken: (token) => appendToMessage(assistantMessage.id, token),
        onDone: () => setStreaming(false),
        onError: (error) => {
          appendToMessage(assistantMessage.id, `\n\n_Error: ${error.message}_`);
          setStreaming(false);
        },
      },
    );
  };

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-white">
      <div className="vm-aurora" aria-hidden />
      <Sidebar />

      <main
        className={`relative flex min-h-screen flex-1 flex-col items-center bg-transparent px-4 ${
          hasConversation ? "overflow-hidden" : "overflow-y-auto"
        }`}
      >
        {hasConversation ? (
          <>
            {/* Conversation layout */}
            <div className="w-full flex-1 overflow-y-auto px-4 pb-4 pt-10">
              <ChatThread messages={messages} isStreaming={isStreaming} />
            </div>
            <div className="w-full border-t border-transparent bg-white px-4 pb-5 pt-2">
              <div className="mx-auto mb-2 flex max-w-[720px] items-center justify-between">
                <ActiveAgentBadge />
                <div className="flex items-center gap-4">
                  <span className="text-xs text-neutral-400">
                    {agent.shortName}
                  </span>
                  <button
                    type="button"
                    onClick={resetChat}
                    className="text-xs text-neutral-500 transition-colors hover:text-neutral-900"
                  >
                    New case
                  </button>
                </div>
              </div>
              <HeroInput
                value={input}
                onChange={setInput}
                onSubmit={send}
                files={composerFiles}
                onAddFiles={handleAddFiles}
                onRemoveFile={handleRemoveFile}
                mode={mode}
                onModeChange={setMode}
                disabled={isStreaming}
              />
            </div>
          </>
        ) : (
          /* Empty hero state */
          <div className="my-auto w-full max-w-[820px] py-10">
            <h1 className="mb-8 text-center text-3xl font-normal tracking-tight text-neutral-900 sm:text-[40px]">
              Where should we start?
            </h1>

            <ActiveAgentBadge />

            <HeroInput
              value={input}
              onChange={setInput}
              onSubmit={send}
              files={composerFiles}
              onAddFiles={handleAddFiles}
              onRemoveFile={handleRemoveFile}
              mode={mode}
              onModeChange={setMode}
              disabled={isStreaming}
              autoFocus
            />

            {/* Filter chips */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {FILTER_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => applyChip(chip)}
                  className="rounded-full border border-neutral-200 bg-white px-4 py-1.5 text-sm text-neutral-600 transition-colors hover:border-neutral-300 hover:bg-neutral-50"
                >
                  {chip}
                </button>
              ))}
            </div>

            <ActionGrid onSelect={applyAction} />

            {!config.browserUseKey && (
              <div className="mx-auto mt-6 flex max-w-[720px] items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3">
                <p className="text-xs text-neutral-600">
                  Add your Browser Use Cloud key to enable real autonomous browser tasks.
                </p>
                <button
                  type="button"
                  onClick={() => setSettingsOpen(true)}
                  className="shrink-0 rounded-full bg-black px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-neutral-800"
                >
                  Open Settings
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      <SettingsModal />
      <CloudTasksPanel />
      <DocumentVault />
      <SearchOverlay onPrefill={prefill} onSelectAgent={selectAgent} />
    </div>
  );
}
