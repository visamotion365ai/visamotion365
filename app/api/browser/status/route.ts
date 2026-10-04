import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BU_BASE = "https://api.browser-use.com";
type Json = Record<string, unknown>;

function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

function detailOf(data: Json, status: number, key: string) {
  const error = data.error;
  const detail =
    typeof error === "string"
      ? error
      : error && typeof error === "object" && "message" in error
        ? String(error.message)
        : typeof data.message === "string"
          ? data.message
          : `Browser Use returned HTTP ${status}.`;
  return detail.split(key).join("[redacted]").slice(0, 500);
}

async function forward(url: string, headers: HeadersInit) {
  try {
    const response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(20000),
      cache: "no-store",
    });
    const body = await response.json().catch(() => ({}));
    return { response, body: body as Json };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).origin !== new URL(request.url).origin) {
    return fail("Cross-origin requests are not allowed.", 403);
  }

  let body: Json;
  try {
    body = (await request.json()) as Json;
  } catch {
    return fail("Send a JSON body.");
  }

  const taskId = String(body.taskId ?? "").trim();
  const apiKey = String(body.apiKey ?? "").trim() || (process.env.BROWSER_USE_API_KEY ?? "").trim();
  if (!apiKey) return fail("Add your Browser Use API key in Settings, or configure it on the server.", 401);
  if (!taskId || taskId.length > 200) return fail("A valid task ID is required.");

  const headers = {
    "X-Browser-Use-API-Key": apiKey,
    Authorization: `Bearer ${apiKey}`,
  };
  let result = await forward(`${BU_BASE}/api/v4/runs/${encodeURIComponent(taskId)}`, headers);
  if (!result?.response.ok) {
    result = await forward(`${BU_BASE}/api/v2/tasks/${encodeURIComponent(taskId)}`, headers);
  }
  if (!result) return fail("Browser Use could not be reached. Check your connection and try again.", 504);
  if (!result.response.ok) {
    return fail(detailOf(result.body, result.response.status, apiKey), 502);
  }

  const data = result.body;
  const output =
    typeof data.output === "string"
      ? data.output
      : typeof data.result === "string"
        ? data.result
        : "";
  return NextResponse.json(
    {
      id: taskId,
      status: String(data.status ?? data.state ?? "started"),
      output: output.split(apiKey).join("[redacted]").slice(0, 20000),
      isSuccess: (data.isSuccess as boolean | undefined) ?? null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
