# Security checklist (the 20 rules → where implemented)

| # | Rule | Implementation |
|---|------|----------------|
| 1 | Never expose API keys in frontend | All keys read from `process.env` in server code only; vault stores `env:` refs |
| 2 | No secrets in public repos | `.gitignore` excludes `.env*`; DB seed stores password hashes for demo users only |
| 3 | Credentials in env / secret manager | `.env.example` documents every secret; worker takes them from env |
| 4 | DB stores encrypted secret references | `credential_vault.secret_ref` = `env:NAME`; passport numbers AES-256-GCM (`src/lib/crypto.ts`) |
| 5 | Super Admin MFA | `loginAction` → MFA ticket (5 min) → verify; production sends OTP out-of-band |
| 6 | Tenant-aware authorization on every protected request | `needStaff/needSuper/needPortal` + `canAccessTenant/Applicant` in `src/lib/policy.ts`, called by every service op |
| 7 | RLS on every tenant-owned table | `supabase/migrations/0002_rls.sql` (production); demo enforces the same rules in the service layer |
| 8 | Separate SELECT/INSERT/UPDATE/DELETE policies | Written per operation in 0002 |
| 9 | `WITH CHECK` tenant validation | On all INSERT/UPDATE policies |
| 10 | Audit logs for sensitive actions | `logAudit()` on login, MFA, capture, verify, dispatch, decision, approval, payment, rotation, settings |
| 11 | Signed URLs with expiry for private documents | Vault links 15 min (HMAC); production: Supabase signed URLs |
| 12 | File type/size/extension/ownership validation | `/api/upload` (10MB, pdf/jpg/png/webp, session-scoped) |
| 13 | Don't trust AI output | Outputs validated (MRZ checksums, arithmetic, schema) and shown for human review; never auto-published |
| 14 | Agents cannot escalate permissions | Per-agent `allowed_tools`/`blocked_actions`; orchestrator checks `run.execute` for the human requester; no self-modify path |
| 15 | No cross-tenant data access | Tested in `scripts/test.ts` (WVC↛VFS both directions, wrong-tenant insert) |
| 16 | Fail closed | Unknown role/tenant → deny; expired approval → cancel run + stop browser; missing claim → zero rows |
| 17 | Rate/retry/timeout/usage limits | Daily per-agent limits, max_retries, task timeouts, budget warnings, hard pause, duplicate prevention (idempotency) |
| 18 | No sensitive values in plain logs | Passport numbers stored encrypted + masked (`maskPassport`); audit metadata masked |
| 19 | Masking in UI | Passport number always masked in tables, PDFs, MRZ previews |
| 20 | Retention & deletion | Settings → retention periods; cascade delete documented (DEPLOYMENT.md) |

## Human-in-the-loop (non-negotiable)
Final visa submission · payment · OTP entry · CAPTCHA · legal declaration · contract acceptance · appointment booking · public campaign publish → **always** create an `approval_request`, show a human-readable preview (tenant, applicant, agent, target system, fields, docs, amount, risks, screenshot, confidence, history), and execute only with a **task-bound 15-minute token**. A general "approved" flag never authorizes unrelated future actions.

## Demo caveats (remove before production)
- `DEMO_MODE=1` + `/api/dev-login` — disable.
- Demo passwords in seed — use Supabase Auth.
- In-process JSON store — use Supabase.
- Simulated OCR — use Tesseract.js + real MRZ.
- Simulated payments — use a real gateway with signed webhooks.
