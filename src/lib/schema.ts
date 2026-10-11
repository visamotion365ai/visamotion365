// VisaMotion365 — core data schema (mirrors supabase/migrations/0001_schema.sql)

export type Role =
  | "SUPER_ADMIN" | "TENANT_OWNER" | "AGENCY_ADMIN" | "VISA_OFFICER"
  | "DOCUMENT_OFFICER" | "COMPLIANCE_OFFICER" | "HR_MANAGER"
  | "RECRUITMENT_OFFICER" | "MARKETING_OFFICER" | "FINANCE_OFFICER"
  | "SUPPORT_OFFICER" | "APPLICANT";

export const STAGES = [
  "INTAKE_STARTED", "PASSPORT_CAPTURED", "DOCUMENTS_UPLOADED", "CHECKLIST_COMPLETE",
  "DISPATCH_REQUESTED", "MASTER_REVIEW", "DOSSIER_APPROVED", "APPROVED_FOR_SUBMISSION",
  "LODGED", "UNDER_REVIEW", "VISA_ISSUED"
] as const;
export type Stage = (typeof STAGES)[number] | "REJECTED" | "CLOSED";

export const DOC_TYPES = [
  "PASSPORT", "NATIONAL_ID", "PHOTOGRAPH", "BANK_STATEMENT", "TAX_DOCUMENT",
  "EMPLOYMENT_CERTIFICATE", "EDUCATIONAL_CERTIFICATE", "POLICE_CLEARANCE",
  "MEDICAL_CERTIFICATE", "INSURANCE", "INVITATION", "EMPLOYMENT_CONTRACT",
  "A4_DOSSIER", "TRAVEL_INSURANCE", "FLIGHT_BOOKING", "HOTEL_BOOKING",
  "BUSINESS_LICENSE", "QUALIFICATION_CERT", "EMPLOYER_LICENSE", "SOP", "EXPERIENCE_CERTIFICATE"
] as const;
export type DocType = (typeof DOC_TYPES)[number] | string;

export const DOC_STATUS = [
  "REQUESTED", "UPLOADED", "OCR_PROCESSING", "PENDING_REVIEW", "VERIFIED",
  "CORRECTION_REQUIRED", "REJECTED", "EXPIRED", "ARCHIVED"
] as const;

export interface Tenant {
  id: string; name: string; subdomain: string; logo_url?: string;
  theme_config: { primary: string; background: string };
  services: string[]; countries: string[];
  status: string; created_at: string;
}
export interface Profile {
  id: string; full_name: string; email: string; phone?: string; avatar_url?: string;
  password_hash?: string; status: string; created_at: string;
}
export interface Membership {
  id: string; tenant_id: string; user_id: string; role: Role; is_active: boolean; created_at: string;
}
export interface PassportData {
  surname: string; given: string; passport_number: string; nationality: string;
  dob: string; sex: string; expiry: string; mrz: string[];
  ocr_engine: string; ocr_confidence: number;
  verified: boolean; confirmed_by_applicant: boolean; captured_at?: string;
}
export interface Applicant {
  id: string; tenant_id: string; account_user_id?: string;
  first_name: string; last_name: string; nationality: string;
  date_of_birth?: string; gender?: string;
  passport_number_encrypted?: string; passport_number_hash?: string; passport_expiry?: string;
  target_country: string; visa_program_id?: string;
  application_stage: Stage; status: string;
  passport_data?: PassportData; dossier_version?: string;
  feedback_note?: string; created_at: string; updated_at: string;
}
export interface ApplicantAccount {
  id: string; applicant_id: string; user_id: string;
  invitation_status: string; email_verified: boolean; created_at: string;
}
export interface Country { id: string; name: string; code: string; flag: string; is_active: boolean }
export interface VisaProgram {
  id: string; country_id: string; tenant_id: string | null; name: string;
  category: string; description: string; status: string; created_at: string;
}
export interface VisaRequirement {
  id: string; visa_program_id: string; document_type: DocType; is_required: boolean;
  instructions: string; source_url?: string; last_verified_at?: string; verified_by?: string;
}
export interface ClientDocument {
  id: string; tenant_id: string; applicant_id: string; document_type: DocType;
  storage_path?: string; file_name?: string; mime_type?: string; file_size?: number;
  verification_status: string; extracted_data?: any; audit_notes?: string;
  expiry_date?: string; version: number; uploaded_by?: string; uploaded_at: string;
}
export interface DispatchRequest {
  id: string; tenant_id: string; applicant_id: string; request_type: string;
  submitted_by: string; priority: string; status: string;
  decision?: string; agency_note: string; master_note?: string;
  submitted_at: string; reviewed_at?: string;
}
export interface ApprovalRequest {
  id: string; tenant_id: string; applicant_id?: string; agent_run_id?: string;
  agent_code?: string; action_type: string; action_payload: any;
  requested_by?: string; approved_by?: string; status: string;
  expires_at: string; approved_at?: string; note?: string; created_at: string;
}
export interface AiAgent {
  id: string; agent_code: string; name: string; provider: string; description: string;
  status: string; system_prompt: string; allowed_tools: string[]; blocked_actions: string[];
  requires_human_approval: boolean; daily_limit: number; max_retries: number; created_at: string;
}
export interface AgentSlot {
  id: string; agent_id: string; provider: "BASE44" | "BROWSER_USE"; slot_code: string;
  credential_ref: string; tenant_scope: string[]; status: string; concurrency_limit: number; created_at: string;
}
export interface AgentRun {
  id: string; agent_id: string; slot_id?: string; tenant_id: string; applicant_id?: string;
  task_type: string; input_payload: any; output_payload?: any;
  status: string; error_message?: string; retry_count: number;
  needs_approval: boolean; approval_id?: string; human_wait?: string;
  started_at?: string; completed_at?: string; created_at: string;
}
export interface BrowserSession {
  id: string; agent_run_id: string; tenant_id: string; external_session_id: string;
  status: string; recording_url?: string; screenshot_url?: string;
  simulated: boolean; minutes: number; started_at: string; stopped_at?: string;
}
export interface AuditLog {
  id: string; actor_user_id?: string; actor_type: string; tenant_id?: string;
  action: string; resource_type?: string; resource_id?: string;
  metadata?: any; ip_address?: string; user_agent?: string; created_at: string;
}
export interface Conversation {
  id: string; tenant_id: string; applicant_id: string; channel: string;
  auto_responder: boolean; created_at: string;
}
export interface Message {
  id: string; conversation_id: string; sender: "APPLICANT" | "STAFF" | "AUTO";
  sender_name: string; body: string; created_at: string;
}
export interface Notification {
  id: string; tenant_id: string | null; user_id: string | null; applicant_id: string | null;
  type: string; title: string; body: string; read: boolean; created_at: string;
}
export interface Invoice {
  id: string; tenant_id: string; applicant_id: string; number: string;
  items: { desc: string; amount: number }[]; total: number; currency: string;
  status: string; issue_date: string; due_date: string;
}
export interface Payment {
  id: string; tenant_id: string; applicant_id: string; invoice_id: string;
  amount: number; currency: string; method: string; status: string;
  reference?: string; paid_at?: string; created_at: string;
}
export interface CredentialRow {
  id: string; provider: string; slot_code: string; secret_ref: string;
  status: string; last_rotated_at: string; created_at: string;
}
export interface Lead {
  id: string; tenant_id: string; source: string; name: string; phone?: string;
  email?: string; country: string; purpose: string; score: number; status: string; created_at: string;
}
export interface Campaign {
  id: string; tenant_id: string; name: string; channel: string; status: string;
  budget: number; spend: number; leads: number; created_at: string;
}
export interface Employer { id: string; tenant_id: string; name: string; country: string; contact?: string }
export interface JobOrder {
  id: string; tenant_id: string; employer_id: string; role: string; count: number;
  destination: string; fee_per_worker: number; commission_rate: number; status: string;
}
export interface Worker { id: string; tenant_id: string; applicant_id: string; job_order_id: string; status: string }
export interface Appointment {
  id: string; tenant_id: string; applicant_id: string; country: string; purpose: string;
  date: string; time: string; location: string; status: string; created_at: string;
}
export interface AppSettings {
  dry_run: boolean; production_agents: Record<string, boolean>;
  monthly_budget_usd: number; warn_at: number; hard_pause: boolean;
  retention_days_docs: number; retention_days_logs: number;
  channels: { email: boolean; whatsapp: boolean; sms: boolean };
  webhook_url: string;
}
export interface DB {
  tenants: Tenant[]; profiles: Profile[]; organization_members: Membership[];
  applicants: Applicant[]; applicant_accounts: ApplicantAccount[];
  countries: Country[]; visa_programs: VisaProgram[]; visa_requirements: VisaRequirement[];
  client_documents: ClientDocument[]; master_dispatch_requests: DispatchRequest[];
  approval_requests: ApprovalRequest[]; ai_agents: AiAgent[]; agent_slots: AgentSlot[];
  agent_runs: AgentRun[]; browser_sessions: BrowserSession[]; audit_logs: AuditLog[];
  conversations: Conversation[]; messages: Message[]; notifications: Notification[];
  invoices: Invoice[]; payments: Payment[]; credential_vault: CredentialRow[];
  leads: Lead[]; campaigns: Campaign[]; employers: Employer[]; job_orders: JobOrder[];
  workers: Worker[]; appointments: Appointment[]; settings: AppSettings;
}

export type Session = {
  uid: string; name: string; email: string; role: Role;
  tenant_id: string | null; applicant_id: string | null;
};

export const STAGE_LABEL: Record<string, string> = {
  INTAKE_STARTED: "Intake Started", PASSPORT_CAPTURED: "Passport Captured",
  DOCUMENTS_UPLOADED: "Documents Uploaded", CHECKLIST_COMPLETE: "Checklist Complete",
  DISPATCH_REQUESTED: "Dispatch Requested", MASTER_REVIEW: "Master Review",
  DOSSIER_APPROVED: "Dossier Approved", APPROVED_FOR_SUBMISSION: "Approved for Submission",
  LODGED: "Lodged", UNDER_REVIEW: "Under Review", VISA_ISSUED: "Visa Issued",
  REJECTED: "Rejected", CLOSED: "Closed"
};
export const RUN_STATUS: Record<string, string> = {
  QUEUED: "Queued", RUNNING: "Running", WAITING_FOR_APPROVAL: "Waiting for Approval",
  WAITING_FOR_OTP: "Waiting for OTP", WAITING_FOR_CAPTCHA: "Waiting for CAPTCHA",
  WAITING_FOR_LOGIN: "Waiting for Login", DRAFT_CAPTURED: "Draft Captured",
  COMPLETED: "Completed", FAILED: "Failed", CANCELLED: "Cancelled"
};
