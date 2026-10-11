// Browser Use Cloud API V4 adapter (server-side only).
// Auth header: X-Browser-Use-API-Key (no Bearer prefix for V4).
// When BROWSER_USE_API_KEY is not set, the adapter runs in SIMULATED mode
// so the full lifecycle can be exercised in the demo without external calls.

import { randomId } from "./crypto";

export type BrowserState =
  | "QUEUED" | "RUNNING" | "WAITING_FOR_LOGIN" | "WAITING_FOR_OTP" | "WAITING_FOR_CAPTCHA"
  | "WAITING_FOR_APPROVAL" | "DRAFT_CAPTURED" | "COMPLETED" | "FAILED" | "CANCELLED" | "STOPPED";

const BASE = () => process.env.BROWSER_USE_BASE_URL || "https://api.browser-use.com/cloud/v4";
const KEY = () => process.env.BROWSER_USE_API_KEY || "";
export const isSimulated = () => !KEY();

async function call(path: string, init: RequestInit = {}) {
  const res = await fetch(`${BASE()}${path}`, {
    ...init,
    headers: { "X-Browser-Use-API-Key": KEY(), "Content-Type": "application/json", ...(init.headers || {}) }
  });
  if (res.status === 429) {
    const ra = res.headers.get("retry-after");
    const ms = ra ? Number(ra) * 1000 : 2000;
    await new Promise((r) => setTimeout(r, Math.min(ms, 15000)));
    return call(path, init); // bounded single retry
  }
  if (!res.ok) throw new Error(`Browser Use API ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function createBrowserTask(t: { agentCode: string; tenantId: string; instruction: string; allowedDomains?: string[] }) {
  if (isSimulated()) {
    return { external_session_id: "bsc_sim_" + randomId("").slice(3), simulated: true, status: "QUEUED" as BrowserState };
  }
  const j: any = await call("/tasks", { method: "POST", body: JSON.stringify({ agent: { code: t.agentCode }, tenantId: t.tenantId, instruction: t.instruction, allowedDomains: t.allowedDomains || [] }) });
  return { external_session_id: j.id || j.session_id, simulated: false, status: (j.status || "QUEUED") as BrowserState };
}

export async function getBrowserTask(externalSessionId: string): Promise<{ status: BrowserState; error?: string }> {
  if (isSimulated()) return { status: "RUNNING" };
  try {
    const j: any = await call(`/tasks/${externalSessionId}`);
    return { status: (j.status || "RUNNING") as BrowserState, error: j.error_message };
  } catch (e: any) {
    if (String(e?.message || e).includes("404")) return { status: "FAILED", error: "expired session" };
    throw e;
  }
}

export async function waitForBrowserTask(externalSessionId: string, opts: { timeoutMs?: number; pollMs?: number; onState?: (s: BrowserState) => void }) {
  const timeout = opts.timeoutMs || 120000;
  const poll = opts.pollMs || 3000;
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const st = await getBrowserTask(externalSessionId);
    opts.onState?.(st.status);
    if (["COMPLETED", "FAILED", "CANCELLED", "STOPPED"].includes(st.status)) return st;
    if (["WAITING_FOR_LOGIN", "WAITING_FOR_OTP", "WAITING_FOR_CAPTCHA", "WAITING_FOR_APPROVAL"].includes(st.status)) return st;
    await new Promise((r) => setTimeout(r, poll));
  }
  // Client timeout: the server-side run may still be active — explicit stop required.
  await stopBrowserSession(externalSessionId);
  return { status: "FAILED" as BrowserState, error: "client timeout — session stopped server-side" };
}

export async function pauseForHuman(externalSessionId: string, reason: "OTP" | "CAPTCHA" | "LOGIN" | "APPROVAL") {
  if (isSimulated()) return { ok: true, simulated: true };
  return call(`/tasks/${externalSessionId}/pause`, { method: "POST", body: JSON.stringify({ reason }) });
}

export async function stopBrowserSession(externalSessionId: string) {
  // IMPORTANT: disconnecting the CDP connection does not stop the managed
  // browser — always call an explicit stop.
  if (isSimulated()) return { ok: true, simulated: true };
  return call(`/tasks/${externalSessionId}/stop`, { method: "POST" });
}

export async function saveBrowserEvidence(externalSessionId: string): Promise<{ screenshot_url?: string; recording_url?: string }> {
  if (isSimulated()) return { screenshot_url: `evidence/${externalSessionId}.png (simulated)`, recording_url: `recordings/${externalSessionId}.mp4 (simulated)` };
  const j: any = await call(`/tasks/${externalSessionId}/evidence`);
  return { screenshot_url: j.screenshot_url, recording_url: j.recording_url };
}
