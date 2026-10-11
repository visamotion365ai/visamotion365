-- VisaMotion365 — schema (production Supabase)
-- Apply with: supabase db push  (or paste into SQL editor)

create extension if not exists pgcrypto;

create table public.tenants (
  id varchar(50) primary key,
  name varchar(255) not null,
  subdomain varchar(100) unique not null,
  logo_url text,
  theme_config jsonb default '{"primary":"#0F172A","background":"#FFFFFF"}',
  status varchar(30) default 'ACTIVE',
  created_at timestamptz default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  avatar_url text,
  status varchar(30) default 'ACTIVE',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  tenant_id varchar(50) not null references public.tenants(id),
  user_id uuid not null references public.profiles(id),
  role varchar(50) not null,
  is_active boolean default true,
  created_at timestamptz default now(),
  unique(tenant_id, user_id)
);

create table public.applicants (
  id uuid primary key default gen_random_uuid(),
  tenant_id varchar(50) not null references public.tenants(id),
  account_user_id uuid references public.profiles(id),
  first_name text not null,
  last_name text not null,
  nationality text,
  date_of_birth date,
  gender text,
  passport_number_encrypted text,      -- AES-256-GCM, key in secret manager
  passport_number_hash text,           -- sha256 for lookup
  passport_expiry date,
  target_country text not null,
  visa_program_id uuid,
  application_stage varchar(80) default 'INTAKE_STARTED',
  status varchar(40) default 'ACTIVE',
  passport_data jsonb,                 -- verified=false until human verifies
  dossier_version text,
  feedback_note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.applicant_accounts (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references public.applicants(id) on delete cascade,
  user_id uuid references public.profiles(id),
  invitation_status varchar(30) default 'PENDING',
  email_verified boolean default false,
  created_at timestamptz default now()
);

create table public.countries (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  code text,
  flag text,
  is_active boolean default true
);

create table public.visa_programs (
  id uuid primary key default gen_random_uuid(),
  country_id uuid not null references public.countries(id),
  tenant_id varchar(50) references public.tenants(id),
  name text not null,
  category text not null,
  description text,
  status varchar(30) default 'ACTIVE',
  created_at timestamptz default now()
);

create table public.visa_requirements (
  id uuid primary key default gen_random_uuid(),
  visa_program_id uuid not null references public.visa_programs(id) on delete cascade,
  document_type text not null,
  is_required boolean default true,
  instructions text,
  source_url text,
  last_verified_at timestamptz,
  verified_by uuid references public.profiles(id)
);

create table public.official_sources (
  id uuid primary key default gen_random_uuid(),
  country text not null,
  source_name text not null,
  source_url text not null,
  source_type text,
  is_active boolean default true,
  last_checked_at timestamptz
);

create table public.client_documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id varchar(50) not null references public.tenants(id),
  applicant_id uuid not null references public.applicants(id) on delete cascade,
  document_type text not null,
  storage_path text not null,
  file_name text,
  mime_type text,
  file_size bigint,
  verification_status varchar(30) default 'PENDING_REVIEW',
  extracted_data jsonb default '{}',
  audit_notes text,
  expiry_date date,
  version int default 1,
  uploaded_by uuid references public.profiles(id),
  uploaded_at timestamptz default now()
);

create table public.master_dispatch_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id varchar(50) not null references public.tenants(id),
  applicant_id uuid not null references public.applicants(id) on delete cascade,
  request_type text not null,
  submitted_by uuid references public.profiles(id),
  priority varchar(20) default 'NORMAL',
  status varchar(40) default 'PENDING_MASTER_REVIEW',
  decision varchar(40),
  agency_note text,
  master_note text,
  submitted_at timestamptz default now(),
  reviewed_at timestamptz
);

create table public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id varchar(50) not null references public.tenants(id),
  applicant_id uuid references public.applicants(id),
  agent_run_id uuid,
  agent_code text,
  action_type text not null,
  action_payload jsonb not null,
  requested_by uuid references public.profiles(id),
  approved_by uuid references public.profiles(id),
  status varchar(30) default 'PENDING',
  note text,
  expires_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz default now()
);

create table public.ai_agents (
  id uuid primary key default gen_random_uuid(),
  agent_code text unique not null,
  name text not null,
  provider text not null,
  description text,
  status varchar(30) default 'ACTIVE',
  system_prompt text not null,
  allowed_tools jsonb default '[]',
  blocked_actions jsonb default '[]',
  requires_human_approval boolean default true,
  daily_limit integer default 100,
  max_retries integer default 2,
  created_at timestamptz default now()
);

create table public.agent_slots (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.ai_agents(id) on delete cascade,
  provider text not null,
  slot_code text not null,
  credential_ref text not null,          -- e.g. env:BASE44_API_KEY_SLOT_01 (NO secrets in DB)
  tenant_scope jsonb default '[]',
  status varchar(30) default 'ACTIVE',
  concurrency_limit integer default 1,
  created_at timestamptz default now(),
  unique(provider, slot_code)
);

create table public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.ai_agents(id),
  slot_id uuid references public.agent_slots(id),
  tenant_id varchar(50) not null references public.tenants(id),
  applicant_id uuid references public.applicants(id),
  task_type text not null,
  input_payload jsonb not null,
  output_payload jsonb,
  status varchar(40) default 'QUEUED',
  error_message text,
  retry_count integer default 0,
  needs_approval boolean default false,
  approval_id uuid,
  human_wait text,
  idempotency_key text unique,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now()
);

create table public.browser_sessions (
  id uuid primary key default gen_random_uuid(),
  agent_run_id uuid not null references public.agent_runs(id) on delete cascade,
  tenant_id varchar(50) not null references public.tenants(id),
  external_session_id text,
  status varchar(30) default 'CREATED',
  recording_url text,
  screenshot_url text,
  simulated boolean default false,
  minutes numeric(6,1) default 0,
  started_at timestamptz,
  stopped_at timestamptz
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles(id),
  actor_type text not null,
  tenant_id varchar(50),
  action text not null,
  resource_type text,
  resource_id text,
  metadata jsonb default '{}',
  ip_address inet,
  user_agent text,
  created_at timestamptz default now()
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  tenant_id varchar(50) not null references public.tenants(id),
  applicant_id uuid not null references public.applicants(id) on delete cascade,
  channel text default 'WHATSAPP',
  auto_responder boolean default true,
  created_at timestamptz default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender varchar(20) not null,           -- APPLICANT | STAFF | AUTO
  sender_name text,
  body text not null,
  created_at timestamptz default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  tenant_id varchar(50) references public.tenants(id),
  user_id uuid references public.profiles(id),
  applicant_id uuid references public.applicants(id),
  type text not null,
  title text not null,
  body text,
  read boolean default false,
  created_at timestamptz default now()
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  tenant_id varchar(50) not null references public.tenants(id),
  applicant_id uuid not null references public.applicants(id) on delete cascade,
  number text not null unique,
  items jsonb not null default '[]',
  total numeric(12,2) not null,
  currency varchar(10) default 'USD',
  status varchar(30) default 'DRAFT',
  issue_date timestamptz,
  due_date timestamptz
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id varchar(50) not null references public.tenants(id),
  applicant_id uuid not null references public.applicants(id) on delete cascade,
  invoice_id uuid references public.invoices(id),
  amount numeric(12,2) not null,
  currency varchar(10) default 'USD',
  method text,
  status varchar(30) default 'DUE',
  reference text,
  paid_at timestamptz,
  created_at timestamptz default now()
);

create table public.credential_vault (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  slot_code text not null,
  secret_ref text not null,              -- env reference only, never the secret
  status varchar(30) default 'MISSING',
  last_rotated_at timestamptz,
  created_at timestamptz default now()
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  tenant_id varchar(50) not null references public.tenants(id),
  source text,
  name text,
  phone text,
  email text,
  country text,
  purpose text,
  score int default 0,
  status varchar(30) default 'NEW',
  created_at timestamptz default now()
);

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  tenant_id varchar(50) not null references public.tenants(id),
  name text not null,
  channel text,
  status varchar(30) default 'ACTIVE',
  budget numeric(12,2),
  spend numeric(12,2) default 0,
  leads int default 0,
  created_at timestamptz default now()
);

create table public.employers (
  id uuid primary key default gen_random_uuid(),
  tenant_id varchar(50) not null references public.tenants(id),
  name text not null,
  country text,
  contact text
);

create table public.job_orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id varchar(50) not null references public.tenants(id),
  employer_id uuid references public.employers(id),
  role text,
  count int default 1,
  destination text,
  fee_per_worker numeric(12,2),
  commission_rate numeric(5,2) default 0,
  status varchar(30) default 'ACTIVE'
);

create table public.workers (
  id uuid primary key default gen_random_uuid(),
  tenant_id varchar(50) not null references public.tenants(id),
  applicant_id uuid references public.applicants(id),
  job_order_id uuid references public.job_orders(id),
  status varchar(30) default 'IN_PROCESS'
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  tenant_id varchar(50) not null references public.tenants(id),
  applicant_id uuid not null references public.applicants(id) on delete cascade,
  country text,
  purpose text,
  date date,
  time text,
  location text,
  status varchar(30) default 'CONFIRMED',
  created_at timestamptz default now()
);

create table public.agent_usage (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references public.ai_agents(id),
  tenant_id varchar(50),
  run_id uuid references public.agent_runs(id),
  cost_usd numeric(10,4) default 0,
  browser_minutes numeric(6,1) default 0,
  created_at timestamptz default now()
);

create table public.app_settings (
  key varchar(50) primary key,
  value jsonb not null,
  updated_at timestamptz default now()
);

create index idx_applicants_tenant on public.applicants(tenant_id);
create index idx_documents_tenant on public.client_documents(tenant_id, applicant_id);
create index idx_runs_agent on public.agent_runs(agent_id, created_at);
create index idx_approvals_status on public.approval_requests(status, expires_at);
create index idx_audit_tenant on public.audit_logs(tenant_id, created_at desc);
create index idx_messages_conv on public.messages(conversation_id, created_at);
