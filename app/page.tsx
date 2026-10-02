"use client";

import { useEffect, useRef, useState } from "react";
import Sidebar from "@/components/Sidebar";
import ActiveAgentBadge from "@/components/ActiveAgentBadge";
import HeroInput from "@/components/HeroInput";
import ChatThread from "@/components/ChatThread";
import SettingsModal from "@/components/SettingsModal";
import CloudTasksPanel from "@/components/CloudTasksPanel";
import DocumentVault from "@/components/DocumentVault";
import SearchOverlay from "@/components/SearchOverlay";
import { getAgent, type AgentId, type ChatMode } from "@/lib/agents";
import { createMessage, streamChat } from "@/lib/chat";
import { createBrowserTask } from "@/lib/browserUse";
import { useStore, type Attachment } from "@/lib/store";

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
    <div className="relative flex h-[100dvh] w-full overflow-hidden bg-white">
      {/* All-time animated, dynamic-colour wave background */}
      <div className="vm-wavefield" aria-hidden>
        <span className="vm-wave vm-wave-a" />
        <span className="vm-wave vm-wave-b" />
        <span className="vm-wave vm-wave-c" />
        <span className="vm-haze" />
      </div>

      <Sidebar />

      <main className="relative z-10 flex h-[100dvh] min-h-0 flex-1 flex-col">
        {/* Upper section — liquid glass with shadow */}
        <section className="relative flex min-h-0 flex-1 flex-col p-3 sm:p-5">
          {hasConversation ? (
            <div className="vm-glass flex min-h-0 flex-1 flex-col overflow-hidden rounded-[34px]">
              <div className="w-full flex-1 overflow-y-auto px-4 pb-6 pt-8 sm:px-8">
                <ChatThread messages={messages} isStreaming={isStreaming} />
              </div>
            </div>
          ) : (
            <div className="vm-glass flex min-h-0 flex-1 items-center justify-center rounded-[34px] px-6 py-10">
              <div className="w-full max-w-[620px] text-center">
                <h1 className="text-[34px] font-normal leading-tight tracking-tight text-neutral-900 sm:text-[46px]">
                  Where should we start?
                </h1>
                <p className="mx-auto mt-4 max-w-[480px] text-[15px] leading-relaxed text-neutral-500">
                  Five autonomous immigration agents — eligibility, document audit,
                  SOP drafting, refusal analysis and embassy portals. Describe the
                  applicant or attach a file below.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Prompt box — pinned to the very bottom */}
        <div className="relative w-full shrink-0 px-3 pb-4 pt-1 sm:px-5 sm:pb-6">
          <div className="mx-auto mb-2 flex max-w-[720px] items-center justify-between px-1">
            <ActiveAgentBadge />
            <div className="flex items-center gap-4">
              <span className="hidden text-xs text-neutral-400 sm:inline">
                {agent.shortName}
              </span>
              <button
                type="button"
                onClick={resetChat}
                className="whitespace-nowrap text-xs text-neutral-500 transition-colors hover:text-neutral-900"
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
            autoFocus={!hasConversation}
          />
        </div>
      </main>

      <SettingsModal />
      <CloudTasksPanel />
      <DocumentVault />
      <SearchOverlay onPrefill={prefill} onSelectAgent={selectAgent} />
    </div>
  );
}
