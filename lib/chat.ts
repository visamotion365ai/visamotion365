// -----------------------------------------------------------------------------
// Chat engine for VisaMotion 365. Live provider calls run through same-origin
// routes so provider credentials are not exposed to third-party browser APIs.
// -----------------------------------------------------------------------------

import { getAgent, type AgentId } from "./agents";
import { runBase44Agent } from "./base44";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  agentId?: AgentId;
  createdAt: number;
}

export interface ChatRequest {
  agentId: AgentId;
  messages: ChatMessage[];
  mode?: "browser" | "instant" | "deep";
  config?: {
    llmProvider?: string;
    llmKey?: string;
    base44Key?: string;
    base44Endpoint?: string;
  };
  signal?: AbortSignal;
}

export interface ChatStreamHandlers {
  onToken: (token: string) => void;
  onDone: (full: string) => void;
  onError: (error: Error) => void;
}

export function createMessage(
  role: ChatMessage["role"],
  content: string,
  agentId?: AgentId,
): ChatMessage {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    content,
    agentId,
    createdAt: Date.now(),
  };
}

function lastUser(messages: ChatMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].role === "user") return messages[i].content;
  }
  return "";
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

async function emit(
  full: string,
  signal: AbortSignal | undefined,
  handlers: ChatStreamHandlers,
): Promise<void> {
  const tokens = full.match(/\s*\S+/g) ?? [full];
  let emitted = "";
  try {
    for (const token of tokens) {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      emitted += token;
      handlers.onToken(token);
      await sleep(7, signal);
    }
    handlers.onDone(emitted);
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      handlers.onDone(emitted);
      return;
    }
    handlers.onError(error as Error);
  }
}

async function runLiveLlm(
  provider: string,
  apiKey: string,
  system: string,
  messages: ChatMessage[],
  signal?: AbortSignal,
): Promise<string> {
  const response = await fetch("/api/llm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      provider,
      apiKey,
      system,
      messages: messages.slice(-16).map(({ role, content }) => ({ role, content })),
    }),
    signal,
  });
  const data = (await response.json().catch(() => ({}))) as {
    output?: string;
    error?: string;
  };
  if (!response.ok) throw new Error(data.error ?? `AI provider returned HTTP ${response.status}.`);
  if (!data.output?.trim()) throw new Error("The AI provider returned an empty response.");
  return data.output;
}

export async function streamChat(
  request: ChatRequest,
  handlers: ChatStreamHandlers,
): Promise<void> {
  const { agentId, messages, signal, config } = request;
  const agent = getAgent(agentId);
  const question = lastUser(messages);
  const base44Key = config?.base44Key?.trim() ?? "";
  const base44Endpoint = config?.base44Endpoint?.trim() ?? "";
  let base44Error = "";

  if (base44Key || base44Endpoint) {
    try {
      const { output } = await runBase44Agent(
        question,
        agent.systemPrompt,
        messages,
        base44Key,
        base44Endpoint,
      );
      await emit(output, signal, handlers);
      return;
    } catch (error) {
      if (signal?.aborted) return;
      base44Error = `Base44 could not respond: ${(error as Error).message}`;
    }
  }

  if (config?.llmKey?.trim()) {
    try {
      const output = await runLiveLlm(
        config.llmProvider ?? "openai",
        config.llmKey,
        agent.systemPrompt,
        messages,
        signal,
      );
      if (base44Error) handlers.onToken(`> ${base44Error}; using your selected AI provider instead.\n\n`);
      await emit(output, signal, handlers);
      return;
    } catch (error) {
      if ((error as Error).name === "AbortError" || signal?.aborted) return;
      handlers.onError(error as Error);
      return;
    }
  }

  const setupHint =
    "No live AI provider is configured. Open Settings and add an OpenAI, Gemini, Claude, or Base44 key to run this agent.";
  handlers.onError(new Error(base44Error ? `${base44Error}. ${setupHint}` : setupHint));
}

export function buildSystemPrompt(agentId: AgentId): string {
  return getAgent(agentId).systemPrompt;
}
