import type { Session, Applicant, Role } from "./schema";

export const STAFF_ROLES: Role[] = [
  "SUPER_ADMIN", "TENANT_OWNER", "AGENCY_ADMIN", "VISA_OFFICER", "DOCUMENT_OFFICER",
  "COMPLIANCE_OFFICER", "HR_MANAGER", "RECRUITMENT_OFFICER", "MARKETING_OFFICER",
  "FINANCE_OFFICER", "SUPPORT_OFFICER"
];

const MATRIX: Record<Role, string[]> = {
  SUPER_ADMIN: ["*"],
  TENANT_OWNER: [
    "tenant.read", "tenant.update", "applicant.read", "applicant.create", "applicant.update",
    "document.read", "document.upload", "document.verify", "application.read", "application.update",
    "dispatch.create", "agent.read", "run.read", "run.execute", "browser.read", "browser.stop",
    "payment.read", "payment.create", "message.read", "message.write", "notification.read",
    "audit.read", "lead.read", "finance.read"
  ],
  AGENCY_ADMIN: [
    "tenant.read", "applicant.read", "applicant.create", "applicant.update",
    "document.read", "document.upload", "document.verify", "application.read", "application.update",
    "dispatch.create", "agent.read", "run.read", "payment.read", "message.read", "message.write",
    "notification.read", "lead.read", "finance.read"
  ],
  VISA_OFFICER: [
    "applicant.read", "applicant.create", "applicant.update", "document.read", "document.upload",
    "document.verify", "application.read", "application.update", "dispatch.create",
    "message.read", "message.write", "notification.read", "lead.read"
  ],
  DOCUMENT_OFFICER: ["applicant.read", "document.read", "document.upload", "document.verify", "message.read", "notification.read"],
  COMPLIANCE_OFFICER: ["applicant.read", "document.read", "document.verify", "application.read", "notification.read", "audit.read"],
  HR_MANAGER: ["applicant.read", "applicant.create", "applicant.update", "message.read", "message.write", "notification.read"],
  RECRUITMENT_OFFICER: ["applicant.read", "applicant.create", "message.read", "message.write", "lead.read", "notification.read"],
  MARKETING_OFFICER: ["lead.read", "notification.read", "finance.read"],
  FINANCE_OFFICER: ["payment.read", "payment.create", "applicant.read", "notification.read", "finance.read"],
  SUPPORT_OFFICER: ["message.read", "message.write", "applicant.read", "notification.read"],
  APPLICANT: ["applicant.self.read", "document.self.upload", "message.self.write", "payment.self.read"]
};

export function hasPerm(s: Session, perm: string): boolean {
  if (s.role === "SUPER_ADMIN") return true;
  return (MATRIX[s.role] || []).includes(perm);
}

/** Fail-closed tenant check: staff users may only touch their own tenant. */
export function canAccessTenant(s: Session, tenantId: string): boolean {
  if (s.role === "SUPER_ADMIN") return true;
  return s.tenant_id === tenantId;
}

/** Applicant users see exactly one applicant (their own); staff see their tenant. */
export function canAccessApplicant(s: Session, app: Applicant): boolean {
  if (s.role === "APPLICANT") return s.applicant_id === app.id && canAccessTenant(s, app.tenant_id);
  return s.role !== "APPLICANT" && canAccessTenant(s, app.tenant_id);
}

export function isStaff(s: Session): boolean {
  return STAFF_ROLES.includes(s.role);
}
