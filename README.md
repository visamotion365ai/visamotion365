# VisaMotion365 — Multi-Tenant Visa Operations Platform

Production-grade operating system for visa consultancies and foreign-worker recruitment agencies.
Two demo tenants: **World Vision Consultancy** (WVC_01 — tourist/business/student: Australia, Turkey, Singapore) and **VFS Recruitment Agency** (VFS_02 — work permit/employment/manpower: Serbia, Malaysia, Singapore).

## The 14 modules (all functional in this build)

| # | Module | Where |
|---|--------|-------|
| 1 | Super Admin Master Dashboard | `/dashboard` |
| 2 | 10 AI Agent Control Center | `/agents`, `/agents/[id]`, `/agent-runs` |
| 3 | Browser Use Automation Center | `/browser-sessions` (API V4 adapter: `src/lib/browser-use.ts`) |
| 4 | Applicant/Client Profile | `/applicants/[id]`, `/agency/applicants/[id]` |
| 5 | Passport OCR + Intake | applicant detail → Passport card; `/portal/passport` (real TD3 MRZ parser + checksums) |
| 6 | A4 Visa Dossier Generator & Preview | `/api/dossier?token=…` (vector PDF via pdf-lib + QR vault) |
| 7 | Document Quality / Compliance Check | `src/lib/compliance.ts` (missing, expiry, name & bank-statement arithmetic) |
| 8 | Country-wise Visa Workflow | `/countries` — Australia, Turkey, Serbia, Singapore, Malaysia |
| 9 | Application Pipeline + Live Status | `/applications`, `/agency/applications` (time-based live state) |
| 10 | Billing & Commission | `/finance`, `/agency/billing` |
| 11 | AI Live Inbox / Auto Responder | `/messages`, `/agency/messages`, `/portal/messages` |
| 12 | API Key & Automation Vault | `/credentials` (env-bound refs only — secrets never in DB/UI) |
| 13 | Human Approval → “Approve & Lodge” | `/approvals` (task-bound, 10-min expiry, 15-min execution token, fail closed) |
| 14 | Mobile-first Client/Agent Portal | `/portal` (applicant mobile experience) |

## Quick start

```bash
npm install
npm run seed     # (optional) reseed demo data
npm run test     # 30+ security/logic assertions
npm run dev      # http://localhost:3000
```

### Demo accounts (development only)

| Role | Email | Password |
|------|-------|----------|
| Super Admin (MFA) | superadmin@example.com | SuperAdmin123! |
| WVC Owner | owner.wvc@example.com | Owner123! |
| VFS Owner | owner.vfs@example.com | Owner123! |
| Visa Officer (WVC) | visa.officer@example.com | Officer123! |
| Document Officer (WVC) | document.officer@example.com | Officer123! |
| Applicant portal | demo.applicant@example.com | Applicant123! |

Super Admin MFA is simulated: the one-time code is shown on screen (production sends it by email/phone).
`DEMO_MODE=1` in `.env.local` enables `/api/dev-login` for smoke tests — **remove in production**.

## What is real vs simulated in this demo

**Real (working logic):**
- RBAC (12 roles, permission matrix), tenant isolation enforced in the service layer (WVC↛VFS), fail-closed
- AES-256-GCM passport-number encryption + SHA-256 hash, masked in UI/logs
- ICAO TD3 MRZ parser with genuine 7^i mod 97 checksum validation (build + parse)
- Compliance engine: missing docs, expiry windows, name consistency, bank-statement arithmetic
- A4 vector PDF dossier (pdf-lib) with compliance matrix, MRZ block and **QR → authenticated 15-min vault link**
- Approval workflow: task-bound, 10-min window, short-lived 15-min execution token, expired→cancelled, full audit
- Audit log on every sensitive action; cost/usage tracking; daily limits; hard pause
- Auto-responder with approved templates (never promises visa approval)

**Simulated (documented integration points):**
- Browser Use Cloud — adapter `src/lib/browser-use.ts` implements the V4 surface (`createBrowserTask`, `getBrowserTask`, `waitForBrowserTask`, `pauseForHuman`, `stopBrowserSession`, `saveBrowserEvidence`) with explicit-stop semantics; runs in SIMULATED mode until `BROWSER_USE_API_KEY` is set server-side
- Base44 AI slots — deterministic per-agent processors; production calls `BASE44_API_KEY_SLOT_01..10` (env)
- OCR — deterministic synthetic extraction feeding the real MRZ parser; production path is Tesseract.js → `parseMrz`
- Payments — demo gateway records payments; production uses bKash/bank webhooks (HMAC-signed)
- Backend — in-workspace JSON store mirroring the Supabase schema; production SQL + RLS in `supabase/migrations/`, JWT claims hook in `supabase/auth/hooks/custom-claims.ts`, worker in `scripts/worker.mjs`

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind · pdf-lib · qrcode · lucide-react.
Substitutions vs. spec (noted for transparency): hand-rolled shadcn-style components instead of the shadcn CLI; JSON store stands in for Supabase (SQL/RLS provided); Framer Motion replaced by CSS transitions.

## Security (summary — full checklist in docs/SECURITY.md)

1. No secrets in frontend code or repo; env/secret-manager only. DB stores encrypted references.
2. Super Admin MFA. DB-backed authorization (role/tenant re-read per request; client claims untrusted).
3. Tenant isolation on every access; wrong-tenant read/insert/update rejected (tested).
4. Signed short-lived URLs for documents & vault QR; file type/size/ownership validation.
5. AI output validated; agents cannot escalate their own permissions; blocked-action lists per agent.
6. Irreversible actions (final submit, payment, booking, publish) always pause for human approval.
7. Rate/retry/timeout/usage limits; duplicate-task prevention; explicit browser session stop.
8. Sensitive values masked in logs and UI; retention policies configurable.

## Try the end-to-end story

1. Log in as **visa.officer@example.com** → open Karim Hossain → verify his passport → upload a photo → submit a dispatch request.
2. Log in as **superadmin@example.com** (enter the MFA code shown) → Dispatch Queue → assign Agent 03 → watch the run complete → open **Approvals** → approve Jashim Uddin's FINAL_SUBMIT → his stage becomes **LODGED** → notification to VFS.
3. Generate a **dossier**: open any applicant → A4 Dossier → “Generate dossier + vault link” → open the vault link → download the A4 PDF (contains a fresh QR token).
4. Log in as **demo.applicant@example.com** → mobile portal → send “status” in the inbox → auto-reply; upload a document; pay the demo invoice.

## Docs

- `docs/SUPABASE_SETUP.md` — project, migrations, RLS, auth hook, storage
- `docs/BROWSER_USE_SETUP.md` — API V4 key, header, states, stop semantics, webhooks, costs
- `docs/BASE44_SETUP.md` — 10 slots, dry-run, mapping
- `docs/DEPLOYMENT.md` — Vercel + worker sequence (16 steps)
- `docs/SECURITY.md` — the 20-rule checklist with implementation pointers

## Known limitations

- Demo passwords live in the seed (dev convenience) — production uses Supabase Auth + the JWT claims hook.
- Single-node JSON store: fine for demo; swap in Supabase for concurrent multi-user production.
- Agent “processing” is deterministic simulation; real model latency/cost appears once slots are connected.
- Appointment scanning is simulated (no real portal access — by design: CAPTCHA/login always pauses for a human).
