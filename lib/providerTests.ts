// -----------------------------------------------------------------------------
// lib/providerTests.ts
// Connection checks for the Settings modal. Calls the same-origin /api/test proxy
// (which avoids provider CORS limits) and falls back to a direct browser call
// when the proxy is not available.
// -----------------------------------------------------------------------------

export type TestProvider = "browser-use" | "openai" | "gemini" | "anthropic" | "base44";

export interface TestResult {
  ok: true;
  detail: string;
}

async function readError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error ?? `Provider returned HTTP ${response.status}.`;
  } catch {
    return `Provider returned HTTP ${response.status}.`;
  }
}

async function viaProxy(
  provider: TestProvider,
  key: string,
  endpoint: string,
): Promise<{ response: Response; isJson: boolean } | null> {
  try {
    const response = await fetch("/api/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, key, endpoint }),
    });
    return { response, isJson: (response.headers.get("content-type") ?? "").includes("application/json") };
  } catch {
    return null;
  }
}

export async function testConnection(
  provider: TestProvider,
  key: string,
  endpoint = "",
): Promise<TestResult> {
  if (!key.trim()) throw new Error("Enter an API key first.");

  const proxied = await viaProxy(provider, key.trim(), endpoint);
  if (proxied) {
    if (proxied.response.ok && proxied.isJson) {
      const data = (await proxied.response.json()) as { detail?: string };
      return { ok: true, detail: data.detail ?? "Connected." };
    }
    if (proxied.isJson) throw new Error(await readError(proxied.response));
    // Non-JSON means there is no route handler here — fall through to direct.
  }

  // --- Direct fallbacks (only reached without the proxy) --------------------
  if (provider === "browser-use") {
    const res = await fetch("https://api.browser-use.com/api/v2/tasks?pageSize=1", {
      headers: { "X-Browser-Use-API-Key": key.trim() },
    });
    if (!res.ok) throw new Error(`Browser Use returned HTTP ${res.status}.`);
    return { ok: true, detail: "Browser Use Cloud responded successfully." };
  }
  if (provider === "openai") {
    const res = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${key.trim()}` },
    });
    if (!res.ok) throw new Error(`OpenAI returned HTTP ${res.status}.`);
    return { ok: true, detail: "OpenAI key is valid." };
  }
  if (provider === "gemini") {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key.trim())}`,
    );
    if (!res.ok) throw new Error(`Gemini returned HTTP ${res.status}.`);
    return { ok: true, detail: "Gemini key is valid." };
  }
  if (provider === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key.trim(),
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-latest",
        max_tokens: 1,
        messages: [{ role: "user", content: "ping" }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic returned HTTP ${res.status}.`);
    return { ok: true, detail: "Anthropic key is valid." };
  }

  // base44
  if (!/^https:\/\//i.test(endpoint)) throw new Error("Enter a full HTTPS workflow endpoint.");
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", api_key: key.trim() },
    body: JSON.stringify({ message: "connection check" }),
  });
  if (!res.ok) throw new Error(`Base44 endpoint returned HTTP ${res.status}.`);
  return { ok: true, detail: "Base44 workflow responded." };
}
