// -----------------------------------------------------------------------------
// lib/browserUse.ts
// Browser Use Cloud client for VisaMotion 365.
//
// The Browser Use API applies a CORS allow-list, so a direct browser call from a
// deployed origin is blocked. This module therefore calls the same-origin proxy
// at `/api/browser` (see app/api/browser/route.ts) and transparently falls back
// to a direct call when the proxy is not present (e.g. static hosting or
// `npm run dev` without route handlers).
//
// The key travels from `visamotion_config` (localStorage) on every request and is
// never stored server-side.
// -----------------------------------------------------------------------------

export const BROWSER_USE_BASE = "https://api.browser-use.com";
const PROXY_PATH = "/api/browser";

export class BrowserUseError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "BrowserUseError";
    this.status = status;
  }
}

export interface BrowserTaskOptions {
  proxyCountryCode?: string;
  llm?: string;
  startUrl?: string;
  allowedDomains?: string[];
  maxSteps?: number;
  timeoutMs?: number;
}

export interface BrowserTask {
  id: string;
  status: string;
  liveUrl?: string;
}

export interface BrowserTaskResult {
  id: string;
  status: string;
  output: string;
  isSuccess: boolean | null;
}

const DEFAULT_TIMEOUT = 30_000;
/** Proxy responses that mean "no route handler here — go direct". */
const PROXY_MISSING = [404, 405, 501, 502, 503];

function assertKey(apiKey: string): string {
  const key = (apiKey || "").trim();
  if (!key) throw new BrowserUseError("Add your Browser Use API key in Settings first.");
  if (!key.startsWith("bu_")) {
    // eslint-disable-next-line no-console
    console.warn("Browser Use key does not start with 'bu_' — continuing anyway.");
  }
  return key;
}

function redact(text: string, secret: string): string {
  return secret ? text.split(secret).join("[redacted]") : text;
}

function normalize(data: Record<string, unknown>): BrowserTask | null {
  const id = (data.id ?? data.taskId ?? data.task_id ?? data.runId) as string | undefined;
  if (!id) return null;
  return {
    id,
    status: String(data.status ?? data.state ?? "created"),
    liveUrl: (data.liveUrl ?? data.live_url ?? data.url) as string | undefined,
  };
}

async function parse(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { text: text.slice(0, 400) };
  }
}

function describe(data: Record<string, unknown>, status: number): string {
  const detail =
    (data.error as { message?: string } | string | undefined) ??
    (data.message as string | undefined) ??
    (data.detail as string | undefined);
  if (typeof detail === "string" && detail.trim()) return detail;
  if (detail && typeof detail === "object" && detail.message) return detail.message;
  if (typeof data.text === "string" && data.text.trim()) return data.text;
  return `Browser Use request failed with HTTP ${status}.`;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<{ response: Response; data: Record<string, unknown> } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const contentType = response.headers.get("content-type") ?? "";
    // A static host answers unknown paths with index.html; treat that as "no proxy".
    if (!contentType.includes("application/json")) return null;
    return { response, data: await parse(response) };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** POST through the same-origin proxy. Returns null when no proxy is available. */
async function viaProxy(
  payload: Record<string, unknown>,
  timeoutMs: number,
): Promise<{ response: Response; data: Record<string, unknown> } | null> {
  return fetchWithTimeout(
    PROXY_PATH,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    timeoutMs,
  );
}

/** Direct call to Browser Use (works only where CORS permits). */
async function directCreate(
  key: string,
  task: string,
  options: BrowserTaskOptions,
): Promise<BrowserTask> {
  const headers = {
    "Content-Type": "application/json",
    "X-Browser-Use-API-Key": key,
    Authorization: `Bearer ${key}`,
  };
  const timeout = options.timeoutMs ?? DEFAULT_TIMEOUT;

  const v4 = await fetchWithTimeout(
    `${BROWSER_USE_BASE}/api/v4/runs`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        task,
        proxy_country_code: options.proxyCountryCode ?? "us",
        llm: options.llm,
        start_url: options.startUrl,
        allowed_domains: options.allowedDomains,
        max_steps: options.maxSteps ?? 20,
      }),
    },
    timeout,
  );

  if (v4?.response.ok) {
    const normalized = normalize(v4.data);
    if (normalized) return normalized;
  }

  if (!v4 || [404, 405, 501].includes(v4.response.status)) {
    const v2 = await fetchWithTimeout(
      `${BROWSER_USE_BASE}/api/v2/tasks`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Browser-Use-API-Key": key },
        body: JSON.stringify({
          task,
          llm: options.llm ?? "browser-use-2.0",
          startUrl: options.startUrl,
          allowedDomains: options.allowedDomains,
          maxSteps: options.maxSteps ?? 20,
          proxyCountryCode: options.proxyCountryCode ?? "us",
        }),
      },
      timeout,
    );
    if (v2?.response.ok) {
      const normalized = normalize(v2.data);
      if (normalized) return normalized;
    }
    if (v2) throw new BrowserUseError(redact(describe(v2.data, v2.response.status), key), v2.response.status);
  }

  if (v4) throw new BrowserUseError(redact(describe(v4.data, v4.response.status), key), v4.response.status);
  throw new BrowserUseError(
    "Browser Use is unreachable from the browser. Deploy with the /api/browser route handler for production use.",
  );
}

/** Launch an autonomous Browser Use Cloud task. */
export async function createBrowserTask(
  task: string,
  apiKey: string,
  options: BrowserTaskOptions = {},
): Promise<BrowserTask> {
  const key = (apiKey || "").trim();
  if (!task || task.trim().length < 8) {
    throw new BrowserUseError("Describe the browser task in at least 8 characters.");
  }

  const throughProxy = await viaProxy(
    {
      apiKey: key,
      task: task.trim(),
      proxyCountryCode: options.proxyCountryCode ?? "us",
      llm: options.llm,
      startUrl: options.startUrl,
      allowedDomains: options.allowedDomains,
      maxSteps: options.maxSteps ?? 20,
    },
    options.timeoutMs ?? DEFAULT_TIMEOUT,
  );

  if (throughProxy) {
    const { response, data } = throughProxy;
    if (response.ok) {
      const normalized = normalize(data);
      if (normalized) return normalized;
      throw new BrowserUseError("Browser Use returned a response without a task id.");
    }
    if (!PROXY_MISSING.includes(response.status)) {
      throw new BrowserUseError(redact(describe(data, response.status), key), response.status);
    }
    // else: fall through to a direct attempt
  }

  return directCreate(assertKey(key), task.trim(), options);
}

/** Poll a running task. */
export async function getBrowserTaskStatus(
  taskId: string,
  apiKey: string,
  timeoutMs = 20_000,
): Promise<BrowserTaskResult> {
  const key = (apiKey || "").trim();
  if (!taskId) throw new BrowserUseError("Missing Browser Use task id.");

  // Proxy first (the server may hold the key via BROWSER_USE_API_KEY).
  const proxied = await fetchWithTimeout(
    `${PROXY_PATH}/status`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, apiKey: key }),
    },
    timeoutMs,
  );
  if (proxied) {
    const { response, data } = proxied;
    if (response.ok) {
      return {
        id: taskId,
        status: String(data.status ?? "started"),
        output: typeof data.output === "string" ? (data.output as string).slice(0, 20000) : "",
        isSuccess: (data.isSuccess as boolean | undefined) ?? null,
      };
    }
    if (!PROXY_MISSING.includes(response.status)) {
      throw new BrowserUseError(redact(describe(data, response.status), key), response.status);
    }
  }

  // Direct fallback.
  const directKey = assertKey(key);
  const headers = { "X-Browser-Use-API-Key": directKey, Authorization: `Bearer ${directKey}` };
  let direct = await fetchWithTimeout(
    `${BROWSER_USE_BASE}/api/v4/runs/${encodeURIComponent(taskId)}`,
    { method: "GET", headers },
    timeoutMs,
  );
  if (!direct || !direct.response.ok) {
    direct = await fetchWithTimeout(
      `${BROWSER_USE_BASE}/api/v2/tasks/${encodeURIComponent(taskId)}`,
      { method: "GET", headers },
      timeoutMs,
    );
  }
  if (!direct) throw new BrowserUseError("Browser Use is unreachable from the browser.");
  if (!direct.response.ok) {
    throw new BrowserUseError(redact(describe(direct.data, direct.response.status), key), direct.response.status);
  }
  const data = direct.data;
  return {
    id: taskId,
    status: String(data.status ?? data.state ?? "started"),
    output:
      typeof data.output === "string"
        ? (data.output as string).slice(0, 20000)
        : typeof data.result === "string"
          ? (data.result as string).slice(0, 20000)
          : "",
    isSuccess: (data.isSuccess as boolean | undefined) ?? null,
  };
}

/** Connectivity check used by Settings. Prefers the /api/test proxy. */
export async function testBrowserUseKey(apiKey: string): Promise<{ ok: true; detail: string }> {
  const key = assertKey(apiKey);

  const proxied = await fetchWithTimeout(
    "/api/test",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "browser-use", key }),
    },
    20_000,
  );
  if (proxied) {
    const { response, data } = proxied;
    if (response.ok) {
      return { ok: true, detail: String(data.detail ?? "Browser Use Cloud responded successfully.") };
    }
    throw new BrowserUseError(redact(describe(data, response.status), key), response.status);
  }

  // Direct fallback.
  const direct = await fetchWithTimeout(
    `${BROWSER_USE_BASE}/api/v2/tasks?pageSize=1`,
    { method: "GET", headers: { "X-Browser-Use-API-Key": key } },
    15_000,
  );
  if (!direct) throw new BrowserUseError("Browser Use is unreachable from the browser.");
  if (!direct.response.ok) {
    throw new BrowserUseError(redact(describe(direct.data, direct.response.status), key), direct.response.status);
  }
  return { ok: true, detail: "Browser Use Cloud responded successfully." };
}
