// -----------------------------------------------------------------------------
// app/api/test/route.ts
// Same-origin proxy used by the Settings modal "Test Connection" buttons.
//
// Provider APIs (OpenAI, Browser Use, Base44) restrict browser CORS, so the
// check has to run server-side. Keys are forwarded per request and never stored.
// -----------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Json = Record<string, unknown>;

function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function redact(text: string, secret: string): string {
  return secret ? text.split(secret).join("[redacted]") : text;
}

async function check(url: string, init: RequestInit, timeoutMs = 15000) {
  try {
    const response = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
    const text = await response.text();
    let data: Json = {};
    try {
      data = text ? (JSON.parse(text) as Json) : {};
    } catch {
      data = { text: text.slice(0, 300) };
    }
    return { ok: response.ok, status: response.status, data };
  } catch {
    return { ok: false, status: 504, data: { error: "Provider could not be reached." } as Json };
  }
}

function messageOf(data: Json, status: number): string {
  const detail =
    (data.error as Json | string | undefined) ?? (data.message as string | undefined) ?? (data.detail as string | undefined);
  if (typeof detail === "string" && detail.trim()) return detail;
  if (detail && typeof detail === "object" && typeof (detail as Json).message === "string") {
    return (detail as Json).message as string;
  }
  return `Provider returned HTTP ${status}.`;
}

export async function POST(request: NextRequest) {
  let body: Json;
  try {
    body = (await request.json()) as Json;
  } catch {
    return fail("Send a JSON body.");
  }

  const provider = String(body.provider ?? "");
  const key = String(body.key ?? "").trim();
  const endpoint = String(body.endpoint ?? "").trim();

  if (!provider) return fail("Missing provider.");
  if (!key) return fail("Enter an API key first.");

  if (provider === "browser-use") {
    const result = await check("https://api.browser-use.com/api/v2/tasks?pageSize=1", {
      method: "GET",
      headers: { "X-Browser-Use-API-Key": key },
    });
    return result.ok
      ? NextResponse.json({ ok: true, detail: "Browser Use Cloud responded successfully." })
      : fail(redact(messageOf(result.data, result.status), key), result.status !== 504 ? result.status : 422);
  }

  if (provider === "openai") {
    const result = await check("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
    });
    return result.ok
      ? NextResponse.json({ ok: true, detail: "OpenAI key is valid." })
      : fail(redact(messageOf(result.data, result.status), key), result.status !== 504 ? result.status : 422);
  }

  if (provider === "gemini") {
    const result = await check(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`,
      { method: "GET" },
    );
    return result.ok
      ? NextResponse.json({ ok: true, detail: "Gemini key is valid." })
      : fail(redact(messageOf(result.data, result.status), key), result.status !== 504 ? result.status : 422);
  }

  if (provider === "anthropic") {
    const result = await check("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-latest",
        max_tokens: 1,
        messages: [{ role: "user", content: "ping" }],
      }),
    });
    return result.ok
      ? NextResponse.json({ ok: true, detail: "Anthropic key is valid." })
      : fail(redact(messageOf(result.data, result.status), key), result.status !== 504 ? result.status : 422);
  }

  if (provider === "base44") {
    if (!/^https:\/\//i.test(endpoint)) return fail("Enter a full HTTPS Base44 workflow endpoint.");
    const result = await check(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(key ? { api_key: key } : {}),
      },
      body: JSON.stringify({ message: "connection check" }),
    });
    return result.ok
      ? NextResponse.json({ ok: true, detail: "Base44 workflow responded." })
      : fail(redact(messageOf(result.data, result.status), key), result.status !== 504 ? result.status : 422);
  }

  return fail("Unsupported provider.");
}
