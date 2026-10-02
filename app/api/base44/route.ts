// -----------------------------------------------------------------------------
// app/api/base44/route.ts
// Same-origin proxy for a Base44 AI-agent / superagent workflow endpoint.
//
// Base44 workflow endpoints restrict browser CORS and accept a superset payload,
// so the call runs server-side. The key may come from the request (visamotion_config
// in localStorage) or, when absent, from the BASE44_API_KEY / BASE44_ENDPOINT env
// vars configured on the host. Nothing is stored or logged.
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

/** Pull the assistant text out of the many shapes agent endpoints return. */
function extractOutput(data: Json): string {
  const direct = [data.output, data.result, data.message, data.response, data.answer, data.text];
  for (const value of direct) {
    if (typeof value === "string" && value.trim()) return value;
  }
  const choices = data.choices as Array<{ message?: { content?: string } }> | undefined;
  if (choices?.[0]?.message?.content) return choices[0].message.content;
  if (data.data) {
    if (typeof data.data === "string") return data.data;
    const nested = extractOutput(data.data as Json);
    if (nested) return nested;
  }
  return "";
}

export async function POST(request: NextRequest) {
  let body: Json;
  try {
    body = (await request.json()) as Json;
  } catch {
    return fail("Send a JSON body.");
  }

  const apiKey =
    String(body.apiKey ?? "").trim() || (process.env.BASE44_API_KEY ?? "").trim();
  const endpoint =
    String(body.endpoint ?? "").trim() || (process.env.BASE44_ENDPOINT ?? "").trim();
  const message = String(body.message ?? "").trim();
  const system = String(body.system ?? "").trim();
  const history = Array.isArray(body.history) ? body.history : [];

  if (!endpoint) {
    return fail("Add your Base44 workflow endpoint in Settings, or set BASE44_ENDPOINT.", 400);
  }
  if (!/^https:\/\//i.test(endpoint)) return fail("Base44 endpoint must be a full HTTPS URL.");
  if (!message) return fail("Message is required.");

  const payload = {
    message,
    prompt: message,
    system,
    agent_prompt: system,
    history,
    api_key: apiKey,
    apiKey,
  };

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(apiKey ? { "X-API-Key": apiKey, Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(60000),
    });
  } catch {
    return fail("Base44 could not be reached.", 504);
  }

  const text = await response.text();
  let data: Json = {};
  try {
    data = text ? (JSON.parse(text) as Json) : {};
  } catch {
    data = { output: text.slice(0, 20000) };
  }

  if (!response.ok) {
    const detail =
      (data.error as string | undefined) ??
      (data.message as string | undefined) ??
      `Base44 returned HTTP ${response.status}.`;
    return fail(redact(detail, apiKey), response.status !== 504 ? response.status : 422);
  }

  const output = extractOutput(data);
  if (!output) return fail("Base44 responded without any text output.", 502);
  return NextResponse.json({ output });
}
