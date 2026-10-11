# Browser Use Cloud — API V4 integration

## Key handling
- Create an API key in your Browser Use project (server-side only).
- Set `BROWSER_USE_API_KEY` in the **server** environment (Vercel env / worker env / secret manager).
- **Never** place it in frontend code, the repo, or the database. The DB stores `env:BROWSER_USE_API_KEY` references only.
- New integrations must use **API V4** with the header:
  ```
  X-Browser-Use-API-Key: <key>
  ```
  (No `Bearer` prefix unless the current docs explicitly require it.)

## Adapter
`src/lib/browser-use.ts` implements the full surface:
- `createBrowserTask()` — POST task (with allowed domains)
- `getBrowserTask()` — poll state
- `waitForBrowserTask()` — bounded polling with timeout; on client timeout it **explicitly stops** the session (a client timeout does not stop the server-side run)
- `pauseForHuman(reason)` — OTP / CAPTCHA / LOGIN / APPROVAL
- `stopBrowserSession()` — **always call explicitly**; disconnecting the CDP connection does not stop the managed browser
- `saveBrowserEvidence()` — screenshot + recording URLs into private storage

## State machine
```
QUEUED → RUNNING → { WAITING_FOR_LOGIN | WAITING_FOR_OTP | WAITING_FOR_CAPTCHA | WAITING_FOR_APPROVAL }
                     → DRAFT_CAPTURED → COMPLETED
any → STOPPED (manual / expired / reconciled)
FAILED / CANCELLED
```
The Master Console (`/browser-sessions`) mirrors these states, shows wait reasons and offers explicit Stop.

## Error handling
timeout · 429 rate limit (honor `retry-after`, bounded single retry) · 409 busy session (back off) · expired 404 · failed login · CAPTCHA (pause, human) · OTP (pause, human) · external site error · duplicate task (idempotency key on `agent_runs.idempotency_key`) · browser still running after client timeout (reconcile + stop).

## Worker
Long browser tasks never run inside a short-lived web request. `scripts/worker.mjs` is the reference background worker: polls the queue, drives V4 calls, reconciles stale sessions (>20 min), expires approvals (fail closed), and verifies webhook signatures (`X-Signature` HMAC-SHA256 of the raw body with `WEBHOOK_SIGNING_SECRET`).

## Costs
Browser Use is pay-as-you-go on browser time, traffic and model usage; keys in a project share project capacity. No subscription is required. The app tracks per-run minutes, estimates cost (demo rate $0.10/min) and enforces budget warnings + hard pause. Check your project's actual usage/billing page — do not assume a fixed plan.

## Webhooks
Set `webhook_url` in Settings → System. The worker verifies `X-Signature` (HMAC, timing-safe) before accepting events; unauthenticated webhooks are dropped.
