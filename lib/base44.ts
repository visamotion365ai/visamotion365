// -----------------------------------------------------------------------------
// lib/base44.ts
// Client for a Base44 AI-agent / superagent workflow, called through the
// same-origin /api/base44 proxy so it works on any deployed origin.
// -----------------------------------------------------------------------------

import type { ChatMessage } from "./chat";

export class Base44Error extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "Base44Error";
    this.status = status;
  }
}

export interface Base44Result {
  output: string;
}

/**
 * Run the Base44 agent. The key/endpoint may be empty when the server has
 * BASE44_API_KEY / BASE44_ENDPOINT configured.
 */
export async function runBase44Agent(
  message: string,
  system: string,
  history: ChatMessage[],
  apiKey: string,
  endpoint: string,
): Promise<Base44Result> {
  const trimmedEndpoint = (endpoint || "").trim();
  if (trimmedEndpoint && !/^https:\/\//i.test(trimmedEndpoint)) {
    throw new Base44Error("Base44 endpoint must be a full HTTPS URL.");
  }

  const response = await fetch("/api/base44", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apiKey: (apiKey || "").trim(),
      endpoint: trimmedEndpoint,
      message,
      system,
      history: history.slice(-12).map((item) => ({ role: item.role, content: item.content })),
    }),
  });

  const text = await response.text();
  let data: { output?: string; error?: string } = {};
  try {
    data = text ? (JSON.parse(text) as { output?: string; error?: string }) : {};
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Base44Error(
      data.error ?? `Base44 request failed with HTTP ${response.status}.`,
      response.status,
    );
  }
  if (!data.output) throw new Base44Error("Base44 responded without any text output.");
  return { output: data.output };
}
