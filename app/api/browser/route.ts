// -----------------------------------------------------------------------------
// app/api/browser/route.ts
// Same-origin proxy for Browser Use Cloud.
//
// Why this exists: the Browser Use API applies a CORS allow-list, so calling it
// directly from a deployed site is blocked by the browser. Routing through this
// Next.js Route Handler makes the call genuinely functional from any origin.
//
// The user's key is forwarded per-request from `visamotion_config`; it is never
// stored, logged or written to disk here.
// -----------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BU_BASE = "https://api.browser-use.com";

type Json = Record<string, unknown>;

function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function pick(data: Json): { id?: string; status?: string; liveUrl?: string } {
  const id = (data.id ?? data.taskId ?? data.task_id ?? data.runId) as string | undefined;
  const liveUrl = (data.liveUrl ?? data.live_url ?? data.url) as string | undefined;
  return { id, status: (data.status ?? data.state) as string | undefined, liveUrl };
}

function redact(text: string, secret: string): string {
  return secret ? text.split(secret).join("[redacted]") : text;
}

function detailOf(data: Json, status: number): string {
  const detail =
    (data.error as Json | string | undefined) ?? (data.message as string | undefined) ?? (data.detail as string | undefined);
  if (typeof detail === "string" && detail.trim()) return detail;
  if (detail && typeof detail === "object" && typeof (detail as Json).message === "string") {
    return (detail as Json).message as string;
  }
  return `Browser Use returned HTTP ${status}.`;
}

async function forward(
  url: string,
  init: RequestInit,
  key: string,
  timeoutMs = 30000,
): Promise<{ ok: boolean; status: number; data: Json }> {
  try {
    const response = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
    const text = await response.text();
    let data: Json = {};
    try {
      data = text ? (JSON.parse(text) as Json) : {};
    } catch {
      data = { text: text.slice(0, 500) };
    }
    return { ok: response.ok, status: response.status, data };
  } catch {
    return { ok: false, status: 504, data: { error: "Browser Use could not be reached." } };
  }
}

export async function POST(request: NextRequest) {
  let body: Json;
  try {
    body = (await request.json()) as Json;
  } catch {
    return fail("Send a JSON body.");
  }

  const apiKey = String(body.apiKey ?? "").trim();
  const task = String(body.task ?? "").trim();
  const proxyCountryCode = String(body.proxyCountryCode ?? "us");

  if (!apiKey) return fail("Add your Browser Use API key in Settings first.", 401);
  if (task.length < 8 || task.length > 2000) {
    return fail("Task must be between 8 and 2000 characters.");
  }

  const headers = {
    "Content-Type": "application/json",
    "X-Browser-Use-API-Key": apiKey,
    Authorization: `Bearer ${apiKey}`,
  };

  // v4 runs endpoint first.
  const v4 = await forward(
    `${BU_BASE}/api/v4/runs`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        task,
        proxy_country_code: proxyCountryCode,
        llm: body.llm,
        start_url: body.startUrl,
        allowed_domains: body.allowedDomains,
        max_steps: typeof body.maxSteps === "number" ? body.maxSteps : 20,
      }),
    },
    apiKey,
  );

  const v4picked = pick(v4.data);
  if (v4.ok && v4picked.id) {
    return NextResponse.json({ id: v4picked.id, status: v4picked.status ?? "created", liveUrl: v4picked.liveUrl });
  }

  // Fall back to the v2 tasks endpoint when v4 is not exposed.
  if ([404, 405, 501].includes(v4.status)) {
    const v2 = await forward(
      `${BU_BASE}/api/v2/tasks`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Browser-Use-API-Key": apiKey,
        },
        body: JSON.stringify({
          task,
          llm: typeof body.llm === "string" ? body.llm : "browser-use-2.0",
          startUrl: body.startUrl,
          allowedDomains: body.allowedDomains,
          maxSteps: typeof body.maxSteps === "number" ? body.maxSteps : 20,
          proxyCountryCode,
        }),
      },
      apiKey,
    );
    const v2picked = pick(v2.data);
    if (v2.ok && v2picked.id) {
      return NextResponse.json({ id: v2picked.id, status: v2picked.status ?? "created", liveUrl: v2picked.liveUrl });
    }
    return fail(redact(detailOf(v2.data, v2.status), apiKey), v2.status && v2.status !== 504 ? v2.status : 422);
  }

  return fail(redact(detailOf(v4.data, v4.status), apiKey), v4.status && v4.status !== 504 ? v4.status : 422);
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const taskId = params.get("taskId") ?? "";
  const apiKey = (params.get("apiKey") ?? "").trim();

  if (!apiKey) return fail("Missing Browser Use API key.", 401);
  if (!taskId) return fail("Missing taskId.");

  const headers = {
    "X-Browser-Use-API-Key": apiKey,
    Authorization: `Bearer ${apiKey}`,
  };

  let result = await forward(
    `${BU_BASE}/api/v4/runs/${encodeURIComponent(taskId)}`,
    { method: "GET", headers },
    apiKey,
    20000,
  );

  if (!result.ok) {
    result = await forward(
      `${BU_BASE}/api/v2/tasks/${encodeURIComponent(taskId)}`,
      { method: "GET", headers },
      apiKey,
      20000,
    );
  }

  if (!result.ok) {
    return fail(redact(detailOf(result.data, result.status), apiKey), result.status !== 504 ? result.status : 422);
  }

  const data = result.data;
  return NextResponse.json({
    id: taskId,
    status: String(data.status ?? data.state ?? "started"),
    output:
      typeof data.output === "string"
        ? (data.output as string).slice(0, 20000)
        : typeof data.result === "string"
          ? (data.result as string).slice(0, 20000)
          : "",
    isSuccess: (data.isSuccess as boolean | undefined) ?? null,
  });
}
