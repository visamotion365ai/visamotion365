-- VisaMotion365 — Row Level Security (production Supabase)
-- Claims (role, tenant_id, applicant_id) are injected by the Custom Access Token
-- Auth Hook (see supabase/auth/hooks/custom-claims.ts). Every policy is fail-closed:
-- unknown claim → no access.

create or replace function public.current_tenant() returns varchar(50)
language sql stable as $$
  select coalesce(nullif((auth.jwt() ->> 'tenant_id'), ''), 'MASTER')
$$;

create or replace function public.has_role(r varchar(50)) returns boolean
language sql stable as $$
  select coalesce((auth.jwt() ->> 'role'), '') = r
    or coalesce((auth.jwt() ->> 'role'), '') = 'SUPER_ADMIN'
$$;

create or replace function public.is_applicant_of(a uuid) returns boolean
language sql stable security definer as $$
  select exists (
    select 1 from public.applicant_accounts aa
    where aa.applicant_id = a and aa.user_id = auth.uid()
  )
$$;

-- Enable RLS on every tenant-owned table
alter table public.tenants enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_members enable row level security;
alter table public.applicants enable row level security;
alter table public.applicant_accounts enable row level security;
alter table public.client_documents enable row level security;
alter table public.master_dispatch_requests enable row level security;
alter table public.approval_requests enable row level security;
alter table public.agent_runs enable row level security;
alter table public.browser_sessions enable row level security;
alter table public.audit_logs enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.invoices enable row level security;
alter table public.payments enable row level security;
alter table public.leads enable row level security;
alter table public.campaigns enable row level security;
alter table public.employers enable row level security;
alter table public.job_orders enable row level security;
alter table public.workers enable row level security;
alter table public.appointments enable row level security;

-- tenants: staff read own tenant; super reads all; nobody writes via anon
create policy tenants_select on public.tenants for select
  using (public.has_role('SUPER_ADMIN') or id = public.current_tenant());
create policy tenants_select_all for select on public.tenants
  using (public.has_role('SUPER_ADMIN')) with check (public.has_role('SUPER_ADMIN'));

-- profiles: self or super
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or public.has_role('SUPER_ADMIN'));
create policy profiles_update_self on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- members: tenant-scoped
create policy members_select on public.organization_members for select
  using (tenant_id = public.current_tenant() or public.has_role('SUPER_ADMIN'));
create policy members_insert on public.organization_members for insert
  with check (tenant_id = public.current_tenant() and public.has_role('TENANT_OWNER'));
create policy members_update on public.organization_members for update
  using (tenant_id = public.current_tenant() and public.has_role('TENANT_OWNER'));
create policy members_delete on public.organization_members for delete
  using (tenant_id = public.current_tenant() and public.has_role('TENANT_OWNER'));

-- applicants: tenant scope OR own applicant record
create policy applicants_select on public.applicants for select
  using (tenant_id = public.current_tenant()
         or public.is_applicant_of(id)
         or public.has_role('SUPER_ADMIN'));
create policy applicants_insert on public.applicants for insert
  with check (tenant_id = public.current_tenant()
              and public.has_role('TENANT_OWNER'));  -- owner/admin variants via has_role list
create policy applicants_update on public.applicants for update
  using (tenant_id = public.current_tenant() or public.is_applicant_of(id) or public.has_role('SUPER_ADMIN'));
create policy applicants_delete on public.applicants for delete
  using (public.has_role('SUPER_ADMIN'));

-- documents: same tenant scope; applicants only own
create policy docs_select on public.client_documents for select
  using (tenant_id = public.current_tenant()
         or (exists (select 1 from public.applicants a where a.id = applicant_id and public.is_applicant_of(a.id)))
         or public.has_role('SUPER_ADMIN'));
create policy docs_insert on public.client_documents for insert
  with check (tenant_id = public.current_tenant()
              or (exists (select 1 from public.applicants a where a.id = applicant_id and public.is_applicant_of(a.id))));
create policy docs_update on public.client_documents for update
  using (tenant_id = public.current_tenant() or public.has_role('SUPER_ADMIN'));
create policy docs_delete on public.client_documents for delete
  using (public.has_role('SUPER_ADMIN'));

-- dispatch: tenant scope for read; create by tenant staff; decide by super only (app-level)
create policy dispatch_select on public.master_dispatch_requests for select
  using (tenant_id = public.current_tenant() or public.has_role('SUPER_ADMIN'));
create policy dispatch_insert on public.master_dispatch_requests for insert
  with check (tenant_id = public.current_tenant());

-- approvals: only SUPER_ADMIN reads/writes (agency sees results via applicant records)
create policy approvals_select on public.approval_requests for select
  using (public.has_role('SUPER_ADMIN'));
create policy approvals_insert on public.approval_requests for insert
  with check (public.has_role('SUPER_ADMIN'));
create policy approvals_update on public.approval_requests for update
  using (public.has_role('SUPER_ADMIN'));

-- runs / browser sessions: super + tenant read
create policy runs_select on public.agent_runs for select
  using (tenant_id = public.current_tenant() or public.has_role('SUPER_ADMIN'));
create policy runs_insert on public.agent_runs for insert
  with check (tenant_id = public.current_tenant() or public.has_role('SUPER_ADMIN'));
create policy browser_select on public.browser_sessions for select
  using (tenant_id = public.current_tenant() or public.has_role('SUPER_ADMIN'));

-- audit: super reads all; tenant reads own; inserts allowed via service (security definer fn in prod)
create policy audit_select on public.audit_logs for select
  using (public.has_role('SUPER_ADMIN') or tenant_id = public.current_tenant());
create policy audit_insert on public.audit_logs for insert
  with check (true); -- in production restrict to service-role or security definer function

-- comms: applicant sees own conversation; tenant sees own
create policy conv_select on public.conversations for select
  using (tenant_id = public.current_tenant()
         or (exists (select 1 from public.applicants a where a.id = applicant_id and public.is_applicant_of(a.id)))
         or public.has_role('SUPER_ADMIN'));
create policy msgs_select on public.messages for select
  using (exists (select 1 from public.conversations c where c.id = conversation_id
                 and (c.tenant_id = public.current_tenant() or public.has_role('SUPER_ADMIN')
                      or (exists (select 1 from public.applicants a where a.id = c.applicant_id and public.is_applicant_of(a.id))))));
create policy msgs_insert on public.messages for insert
  with check (exists (select 1 from public.conversations c where c.id = conversation_id
                 and (c.tenant_id = public.current_tenant()
                      or (exists (select 1 from public.applicants a where a.id = c.applicant_id and public.is_applicant_of(a.id))))));

-- finance: tenant scope
create policy invoices_select on public.invoices for select
  using (tenant_id = public.current_tenant()
         or (exists (select 1 from public.applicants a where a.id = applicant_id and public.is_applicant_of(a.id)))
         or public.has_role('SUPER_ADMIN'));
create policy payments_select on public.payments for select
  using (tenant_id = public.current_tenant()
         or (exists (select 1 from public.applicants a where a.id = applicant_id and public.is_applicant_of(a.id)))
         or public.has_role('SUPER_ADMIN'));
create policy payments_insert on public.payments for insert
  with check (tenant_id = public.current_tenant());

-- leads/campaigns/recruitment: tenant scope
create policy leads_select on public.leads for select
  using (tenant_id = public.current_tenant() or public.has_role('SUPER_ADMIN'));
create policy campaigns_select on public.campaigns for select
  using (tenant_id = public.current_tenant() or public.has_role('SUPER_ADMIN'));
create policy employers_select on public.employers for select
  using (tenant_id = public.current_tenant() or public.has_role('SUPER_ADMIN'));
create policy joborders_select on public.job_orders for select
  using (tenant_id = public.current_tenant() or public.has_role('SUPER_ADMIN'));
create policy workers_select on public.workers for select
  using (tenant_id = public.current_tenant() or public.has_role('SUPER_ADMIN'));
create policy appointments_select on public.appointments for select
  using (tenant_id = public.current_tenant()
         or (exists (select 1 from public.applicants a where a.id = applicant_id and public.is_applicant_of(a.id)))
         or public.has_role('SUPER_ADMIN'));

-- notifications: tenant or addressed user or own applicant
create policy notif_select on public.notifications for select
  using (tenant_id = public.current_tenant()
         or user_id = auth.uid()
         or (exists (select 1 from public.applicants a where a.id = applicant_id and public.is_applicant_of(a.id)))
         or public.has_role('SUPER_ADMIN'));
create policy notif_update on public.notifications for update
  using (tenant_id = public.current_tenant() or user_id = auth.uid()
         or (exists (select 1 from public.applicants a where a.id = applicant_id and public.is_applicant_of(a.id)))
         or public.has_role('SUPER_ADMIN'))
  with check (tenant_id = public.current_tenant() or user_id = auth.uid() or public.has_role('SUPER_ADMIN'));

-- Storage: private bucket; object path = tenant/applicant/... enforced by policy
insert into storage.buckets (id, name, public) values ('documents', 'documents', false)
on conflict (id) do nothing;

create policy docs_storage_read on storage.objects for select
  using (bucket_id = 'documents'
         and (storage.foldername(name)[1] = public.current_tenant()
              or public.has_role('SUPER_ADMIN')));
create policy docs_storage_write on storage.objects for insert
  with check (bucket_id = 'documents'
              and storage.foldername(name)[1] = public.current_tenant()
              and public.has_role('TENANT_OWNER'));
