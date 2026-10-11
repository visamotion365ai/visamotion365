# Supabase Setup (production backend)

## 1. Project
1. Create a Supabase project.
2. Note `Project URL`, `anon key`, `service_role key`.
3. Create storage bucket **`documents`** (private).

## 2. Migrations
Apply in order:
```
supabase/migrations/0001_schema.sql
supabase/migrations/0002_rls.sql
```
- All tenant-owned tables carry `tenant_id` and RLS.
- Policies are written per operation (SELECT/INSERT/UPDATE/DELETE) with `WITH CHECK` tenant validation.
- `current_tenant()` / `has_role()` / `is_applicant_of()` read **JWT claims only** — never client params.
- Unknown claim → empty tenant → zero rows (fail closed).

## 3. Custom Access Token Auth Hook (RBAC claims)
1. Deploy `supabase/auth/hooks/custom-claims.ts` (Supabase → Authentication → Hooks → Custom Access Token).
2. It resolves, per signed-in user:
   - `organization_members` → `role` + `tenant_id` (SUPER_ADMIN mapped via tenant MASTER)
   - otherwise `applicant_accounts` → `role=APPLICANT`, `applicant_id`, `tenant_id`
3. These claims power every RLS policy and every service-layer check.
**Never trust a role sent by the client.**

## 4. Seed
Run the seed against Supabase (or paste):
- 2 tenants (`WVC_01`/`worldvision`, `VFS_02`/`vfsrecruitment`)
- 5 countries, 10 visa programs + requirements
- 6 demo users (via Supabase Auth, not plaintext)
- 2 applicants per tenant with synthetic (non-real) passport data

## 5. Verification
```sql
-- as a WVC_01 service token:
select count(*) from applicants;              -- WVC rows only
-- as a VFS_02 token:
select * from applicants where id='<wvc applicant>';  -- must return 0 rows
```
Also run the tenant-isolation test matrix in `scripts/test.ts` against the live service layer.

## 6. Service layer
Point the app at Supabase by replacing `src/lib/db.ts` internals with `createClient(url, anonKey)` calls — the service functions (`src/lib/service.ts`) keep their guards as a second layer (defense in depth: RLS + app check).
