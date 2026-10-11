# Deployment

## Prerequisites
- Supabase project (see SUPABASE_SETUP.md)
- Browser Use API key (see BROWSER_USE_SETUP.md)
- Base44 slot keys (see BASE44_SETUP.md)
- Domain + subdomains (worldvision.yourdomain.com, vfsrecruitment.yourdomain.com)
- Email / WhatsApp provider decided

## Environment (server-side only)
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
BROWSER_USE_API_KEY
BROWSER_USE_BASE_URL
BASE44_API_KEY_SLOT_01 … BASE44_API_KEY_SLOT_10
SESSION_SECRET            (64+ random chars)
STORAGE_ENCRYPTION_KEY    (32+ bytes)
APPROVAL_SIGNING_SECRET
WEBHOOK_SIGNING_SECRET
EMAIL_PROVIDER_KEY / WHATSAPP_PROVIDER_KEY / SMS_PROVIDER_KEY
```
Never commit `.env`. `DEMO_MODE` must be `0`/unset in production.

## Sequence
1. Create Supabase project.
2. Apply database migrations (`supabase/migrations/*.sql`).
3. Enable RLS (included in 0002) — verify each policy.
4. Configure Auth (providers, password policies, invite flow).
5. Configure the Custom Access Token Hook (claims: role, tenant_id, applicant_id).
6. Create storage buckets (`documents`, private) + storage policies.
7. Add development users via Supabase Auth (no plaintext passwords).
8. Add Browser Use API key **server-side only**.
9. Add Base44 credentials **server-side only**.
10. Deploy frontend to Vercel (App Router, Node runtime).
11. Deploy background worker (Vercel cron → `/api/cron/tick` or a small VM/Fly.io process running `scripts/worker.mjs`).
12. Configure webhook URLs (Settings → Webhooks); verify signature handling.
13. Run RLS tests (tenant-isolation matrix in `scripts/test.ts`).
14. Run Agent dry runs per agent from the Agent Control Center.
15. Test with synthetic data only — no real passports.
16. Enable production actions **only after** human-approval tests pass (approve/reject/expiry/reuse cases).

## Backup & recovery
- Supabase PITR + dailypg_dump (schedule in Supabase settings).
- `data/` (demo) is disposable; in production the database is the source of truth.
- Document storage: enable versioning; restore = bucket restore + re-issue signed URLs (old signed URLs expire by design).
- Approval tokens & vault links are stateless (HMAC) — no recovery needed.

## Rollback
Keep the previous Vercel deployment pinned; migrations are additive — roll back app code first, schema after.
