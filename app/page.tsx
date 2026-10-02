"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import ActiveAgentBadge from "@/components/ActiveAgentBadge";
import HeroInput from "@/components/HeroInput";
import ChatThread from "@/components/ChatThread";
import SettingsModal from "@/components/SettingsModal";
import CloudTasksPanel from "@/components/CloudTasksPanel";
import DocumentVault from "@/components/DocumentVault";
import SearchOverlay from "@/components/SearchOverlay";
import WaveBackground from "@/components/WaveBackground";
import InstallPrompt from "@/components/InstallPrompt";
import MobileApp from "@/components/mobile/MobileApp";
import { CountryCards, CountryDrawer, Flag } from "@/components/CountryCards";
import { getCountry, type Country } from "@/lib/countries";
import { getAgent, type AgentId, type ChatMode } from "@/lib/agents";
import { createMessage, streamChat } from "@/lib/chat";
import { createBrowserTask, getBrowserTaskStatus } from "@/lib/browserUse";
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
  const updateCloudTask = useStore((s) => s.updateCloudTask);
  const addAttachment = useStore((s) => s.addAttachment);
  const removeAttachment = useStore((s) => s.removeAttachment);
  const setTasksPanelOpen = useStore((s) => s.setTasksPanelOpen);
  const countryCode = useStore((s) => s.countryCode);
  const setCountryCode = useStore((s) => s.setCountryCode);
  const setCountryDrawerOpen = useStore((s) => s.setCountryDrawerOpen);
  const loadApplications = useStore((s) => s.loadApplications);

  const [input, setInput] = useState("");
  const [mode, setMode] = useState<ChatMode>("browser");
  const [composerFiles, setComposerFiles] = useState<Attachment[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    loadConfig();
    loadApplications();
    return () => abortRef.current?.abort();
  }, [loadConfig, loadApplications]);

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

  const selectedCountry = countryCode ? getCountry(countryCode) : undefined;

  const handleCountry = (country: Country) => {
    setCountryCode(country.code);
    setActiveAgent("strategist");
    setMode("browser");
    setInput(
      `Assess eligibility for ${country.name} — ${country.visa}. Applicant profile: [age, education, language score, skilled work experience, funds].`,
    );
    setCountryDrawerOpen(false);
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

    const controller = new AbortController();
    abortRef.current = controller;

    // --- Single prompt → real Browser Use Cloud task (default mode) ----------
    if (mode === "browser") {
      try {
        // The key may be empty here: the /api/browser route falls back to the
        // server's BROWSER_USE_API_KEY when one is configured.
        const task = await createBrowserTask(text, config.browserUseKey, {
          proxyCountryCode: config.proxyCountry,
          maxSteps: 25,
        });
        const localId = uid();
        addCloudTask({
          id: localId,
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
          [
            `**Browser Use Cloud task launched** — \`${task.id}\``,
            "",
            `Status: **${task.status}**`,
            task.liveUrl ? `[Watch the live browser](${task.liveUrl})` : "",
          ]
            .filter(Boolean)
            .join("\n"),
        );

        // Poll until the run finishes, streaming status + output into the thread.
        void (async () => {
          const terminal = ["finished", "failed", "stopped", "completed", "success", "error"];
          for (let i = 0; i < 24; i += 1) {
            await new Promise((resolve) => setTimeout(resolve, 5000));
            try {
              const result = await getBrowserTaskStatus(task.id, config.browserUseKey);
              updateCloudTask(localId, { status: result.status, output: result.output });
              setMessageContent(
                assistantMessage.id,
                [
                  `**Browser Use Cloud task** — \`${task.id}\``,
                  "",
                  `Status: **${result.status}**`,
                  task.liveUrl ? `[Watch the live browser](${task.liveUrl})` : "",
                  result.output ? `\n---\n\n${result.output}` : "",
                ]
                  .filter(Boolean)
                  .join("\n"),
              );
              if (terminal.includes(result.status.toLowerCase())) break;
            } catch (error) {
              appendToMessage(
                assistantMessage.id,
                `\n\n_Status check failed: ${(error as Error).message}_`,
              );
              break;
            }
          }
          setStreaming(false);
        })();
        return;
      } catch (error) {
        setMessageContent(
          assistantMessage.id,
          `**Browser Use:** ${(error as Error).message}\n\n_Falling back to the AI agent…_\n\n`,
        );
      }
    }

    // --- AI agent: Base44 when configured, otherwise the built-in agent ------
    await streamChat(
      {
        agentId: activeAgentId,
        messages: [...messages, userMessage],
        mode,
        config: {
          llmProvider: config.llmProvider,
          llmKey: config.llmKey,
          base44Key: config.base44Key,
          base44Endpoint: config.base44Endpoint,
        },
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
    <div className="relative h-[100dvh] w-full overflow-hidden bg-white dark:bg-[#0b0d12]">
      <WaveBackground />

      {/* Mobile app shell */}
      <div className="lg:hidden">
        <MobileApp
          input={input}
          setInput={setInput}
          onSend={send}
          mode={mode}
          setMode={setMode}
          files={composerFiles}
          onAddFiles={handleAddFiles}
          onRemoveFile={handleRemoveFile}
          isStreaming={isStreaming}
          onSelectCountry={handleCountry}
        />
      </div>

      {/* Desktop shell */}
      <div className="hidden h-[100dvh] w-full lg:flex">
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
            <div className="vm-glass flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden rounded-[34px] px-4 py-8 sm:px-8">
              <div className="w-full max-w-[860px] text-center">
                <span className="vm-pill">AI visa agency · 5 autonomous agents</span>
                <h1 className="mt-4 text-[32px] font-normal leading-tight tracking-tight text-neutral-900 sm:text-[46px]">
                  Where should we start?
                </h1>
                <p className="mx-auto mt-3 max-w-[560px] text-[14px] leading-relaxed text-neutral-500 sm:text-[15px]">
                  Pick a destination or describe the applicant — eligibility, document
                  audit, SOP drafting, refusal analysis and embassy portals in one
                  workspace.
                </p>
              </div>

              <div className="mt-8 w-full max-w-[1000px]">
                <div className="mb-3 flex items-center justify-between px-1">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">
                    Popular destinations
                  </span>
                  <button
                    type="button"
                    onClick={() => setCountryDrawerOpen(true)}
                    className="flex items-center gap-1 text-xs text-neutral-500 transition-colors hover:text-neutral-900"
                  >
                    View all 30 <ArrowRight size={13} />
                  </button>
                </div>
                <CountryCards onSelect={handleCountry} activeCode={countryCode} />
              </div>
            </div>
          )}
        </section>

        {/* Prompt box — pinned to the very bottom */}
        <div className="relative w-full shrink-0 px-3 pb-4 pt-1 sm:px-5 sm:pb-6">
          <div className="mx-auto mb-2 flex max-w-[720px] items-center justify-between gap-2 px-1">
            <div className="flex min-w-0 items-center gap-2">
              <ActiveAgentBadge />
              {selectedCountry && (
                <span className="vm-country-tag hidden sm:flex">
                  <Flag country={selectedCountry} />
                  <span className="max-w-[110px] truncate">{selectedCountry.name}</span>
                </span>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-4">
              <span className="hidden text-xs text-neutral-400 md:inline">
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
      </div>

      <SettingsModal />
      <CloudTasksPanel />
      <DocumentVault />
      <SearchOverlay onPrefill={prefill} onSelectAgent={selectAgent} />
      <CountryDrawer onSelect={handleCountry} />
      <InstallPrompt />
    </div>
  );
}
