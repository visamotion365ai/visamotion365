import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Provider = "openai" | "gemini" | "anthropic";
type Message = { role: "user" | "assistant"; content: string };
type Json = Record<string, unknown>;

const MODELS: Record<Provider, string> = {
  openai: "gpt-4o-mini",
  gemini: "gemini-2.5-flash",
  anthropic: "claude-haiku-4-5-20251001",
};

function textFrom(value: unknown): string {
  if (typeof value === "string") return value;
  if (!Array.isArray(value)) return "";
  return value
    .map((part) =>
      part && typeof part === "object" && "text" in part && typeof part.text === "string"
        ? part.text
        : "",
    )
    .filter(Boolean)
    .join("\n");
}

function errorMessage(data: Json, status: number, key: string): string {
  const error = data.error;
  const detail =
    typeof error === "string"
      ? error
      : error && typeof error === "object" && "message" in error
        ? String(error.message)
        : typeof data.message === "string"
          ? data.message
          : `The provider returned HTTP ${status}.`;
  return detail.split(key).join("[redacted]").slice(0, 500);
}

async function readJson(response: Response): Promise<Json> {
  return (await response.json().catch(() => ({}))) as Json;
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Cross-origin requests are not allowed." }, { status: 403 });
  }

  let body: Json;
  try {
    body = (await request.json()) as Json;
  } catch {
    return NextResponse.json({ error: "Send a JSON body." }, { status: 400 });
  }

  const provider = String(body.provider ?? "") as Provider;
  if (!Object.prototype.hasOwnProperty.call(MODELS, provider)) {
    return NextResponse.json({ error: "Choose OpenAI, Gemini, or Anthropic in Settings." }, { status: 400 });
  }

  const envKey =
    provider === "openai"
      ? process.env.OPENAI_API_KEY
      : provider === "gemini"
        ? process.env.GEMINI_API_KEY
        : process.env.ANTHROPIC_API_KEY;
  const apiKey = String(body.apiKey ?? "").trim() || envKey?.trim() || "";
  if (!apiKey) {
    return NextResponse.json({ error: "Add an API key in Settings or configure it on the server." }, { status: 401 });
  }

  const system = String(body.system ?? "").trim().slice(0, 8000);
  const rawMessages = Array.isArray(body.messages) ? body.messages.slice(-16) : [];
  const messages: Message[] = rawMessages.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const role = "role" in item ? item.role : "";
    const content = "content" in item ? item.content : "";
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") return [];
    return content.trim() ? [{ role, content: content.slice(0, 8000) }] : [];
  });

  if (!messages.some((message) => message.role === "user")) {
    return NextResponse.json({ error: "Add a message before starting the agent." }, { status: 400 });
  }
  if (messages.reduce((size, message) => size + message.content.length, system.length) > 48000) {
    return NextResponse.json({ error: "This conversation is too long. Start a new case and try again." }, { status: 413 });
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  let url: string;
  let payload: Json;

  if (provider === "openai") {
    url = "https://api.openai.com/v1/chat/completions";
    headers.Authorization = `Bearer ${apiKey}`;
    payload = {
      model: MODELS.openai,
      temperature: 0.3,
      max_tokens: 1400,
      messages: [...(system ? [{ role: "system", content: system }] : []), ...messages],
    };
  } else if (provider === "gemini") {
    url = `https://generativelanguage.googleapis.com/v1beta/models/${MODELS.gemini}:generateContent`;
    headers["x-goog-api-key"] = apiKey;
    payload = {
      ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
      contents: messages.map((message) => ({
        role: message.role === "assistant" ? "model" : "user",
        parts: [{ text: message.content }],
      })),
      generationConfig: { temperature: 0.3, maxOutputTokens: 1400 },
    };
  } else {
    url = "https://api.anthropic.com/v1/messages";
    headers["x-api-key"] = apiKey;
    headers["anthropic-version"] = "2023-06-01";
    payload = {
      model: MODELS.anthropic,
      max_tokens: 1400,
      ...(system ? { system } : {}),
      messages,
    };
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(60000),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: "The AI provider could not be reached. Check your connection and try again." }, { status: 504 });
  }

  const data = await readJson(response);
  if (!response.ok) {
    return NextResponse.json(
      { error: errorMessage(data, response.status, apiKey) },
      { status: response.status === 429 ? 429 : 502 },
    );
  }

  const choices = data.choices as Array<{ message?: { content?: unknown } }> | undefined;
  const candidates = data.candidates as Array<{ content?: { parts?: unknown[] } }> | undefined;
  const output =
    provider === "openai"
      ? textFrom(choices?.[0]?.message?.content)
      : provider === "gemini"
        ? textFrom(candidates?.[0]?.content?.parts)
        : textFrom(data.content);

  if (!output.trim()) {
    return NextResponse.json({ error: "The AI provider returned no text. Try again or select a different model provider." }, { status: 502 });
  }

  return NextResponse.json({ output: output.split(apiKey).join("[redacted]").slice(0, 16000) });
}
