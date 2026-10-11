// Reference background worker (production).
// Polls agent_runs / browser_sessions, drives Browser Use Cloud (API V4),
// reconciles timeouts, and stops unused browser sessions.
// The demo app advances state in-process; this is the real long-running worker.
//
// Run:  WEBHOOK_SIGNING_SECRET=... BROWSER_USE_API_KEY=... node scripts/worker.mjs

import crypto from "crypto";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BROWSER_KEY = process.env.BROWSER_USE_API_KEY;
const BROWSER_BASE = process.env.BROWSER_USE_BASE_URL || "https://api.browser-use.com/cloud/v4";

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (service role, server-side only).");
  process.exit(1);
}

const sb = {
  async query(sql, params = []) {
    const res = await fetch(`${SUPABASE_URL}/pg/query`, {
      method: "POST",
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: sql, params }),
    });
    if (!res.ok) throw new Error(`pg ${res.status}: ${await res.text()}`);
    return res.json();
  }
};

async function browserCall(path, init = {}) {
  const res = await fetch(`${BROWSER_BASE}${path}`, {
    ...init,
    headers: { "X-Browser-Use-API-Key": BROWSER_KEY, "Content-Type": "application/json", ...(init.headers || {}) },
  });
  if (res.status === 429) {
    const ra = Number(res.headers.get("retry-after") || 2);
    await new Promise((r) => setTimeout(r, ra * 1000));
    return browserCall(path, init); // bounded retry (rate limit, not concurrency)
  }
  if (res.status === 409) return { conflict: true }; // session busy — back off
  if (!res.ok) throw new Error(`browser ${res.status}: ${await res.text()}`);
  return res.json();
}

const STOP_STATES = new Set(["COMPLETED", "FAILED", "CANCELLED", "STOPPED"]);

async function tick() {
  // 1) advance queued runs (bounded concurrency)
  const { rows: queued } = await sb.query(
    `update agent_runs set status='RUNNING', started_at=now()
     where id in (select id from agent_runs where status='QUEUED' order by created_at limit 3)
     returning id, agent_run_id`
  ).catch(() => ({ rows: [] }));

  // 2) reconcile browser sessions: anything RUNNING > 20 min without progress → stop
  const stale = await sb.query(
    `select id, external_session_id from browser_sessions
     where status in ('RUNNING','WAITING_FOR_OTP','WAITING_FOR_CAPTCHA')
     and started_at < now() - interval '20 minutes'`
  );
  for (const s of stale?.rows || []) {
    if (BROWSER_KEY && s.external_session_id) {
      // explicit stop — CDP disconnect does NOT stop the managed browser
      await browserCall(`/tasks/${s.external_session_id}/stop`).catch(() => {});
    }
    await sb.query(`update browser_sessions set status='STOPPED', stopped_at=now(), minutes=minutes + extract(epoch from (now() - started_at))/60 where id=$1`, [s.id]);
    console.log("reconciled stale session", s.id);
  }

  // 3) expired approvals → cancel runs (fail closed)
  await sb.query(
    `update approval_requests set status='EXPIRED' where status='PENDING' and expires_at < now()`
  );
  await sb.query(
    `update agent_runs set status='CANCELLED', completed_at=now(), error_message='approval window expired'
     where id in (select agent_run_id from approval_requests where status='EXPIRED' and agent_run_id is not null) and status='WAITING_FOR_APPROVAL'`
  );
}

console.log("worker started (5s poll)");
setInterval(() => tick().catch((e) => console.error("tick error", e.message)), 5000);
tick();

export function verifyWebhook(req) {
  // Webhook authenticity: HMAC-SHA256 of raw body with WEBHOOK_SIGNING_SECRET
  const sig = req.headers["x-signature"];
  const expected = crypto.createHmac("sha256", process.env.WEBHOOK_SIGNING_SECRET).update(req.rawBody).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(sig || ""), Buffer.from(expected));
}
