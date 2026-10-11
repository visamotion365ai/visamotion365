"use server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import * as svc from "@/lib/service";

async function s() {
  const session = await getSession();
  if (!session) return { error: "Not signed in." } as any;
  return { session };
}
function allPaths() {
  for (const p of ["/dashboard", "/agency/dashboard", "/portal", "/applicants", "/agency/applicants", "/applications", "/agency/applications", "/documents", "/agency/documents", "/dispatch-queue", "/agency/dispatch-requests", "/agent-runs", "/approvals", "/browser-sessions", "/finance", "/agency/billing", "/messages", "/agency/messages", "/portal/documents", "/portal/application", "/portal/messages", "/portal/payments", "/portal/passport", "/portal/checklist"]) revalidatePath(p);
}
type R = { ok: boolean; error?: string; id?: string };

export async function createApplicantAction(_p: any, f: FormData): Promise<R> {
  try {
    const g = await s(); if ("error" in g && g.error) return g as any;
    const id = svc.createApplicant(g.session!, {
      first_name: String(f.get("first_name") || ""), last_name: String(f.get("last_name") || ""),
      nationality: String(f.get("nationality") || "Bangladesh"), date_of_birth: String(f.get("date_of_birth") || "") || undefined,
      gender: String(f.get("gender") || "") || undefined, target_country: String(f.get("target_country") || ""),
      visa_program_id: String(f.get("visa_program_id") || "")
    });
    allPaths();
    return { ok: true, id };
  } catch (e: any) { return { ok: false, error: e.message }; }
}

export async function capturePassportAction(_p: any, f: FormData): Promise<R & { hash?: string }> {
  try {
    const g = await s(); if ("error" in g && g.error) return g as any;
    const applicantId = String(f.get("applicant_id") || "");
    const fileHash = String(f.get("file_hash") || "") || undefined;
    const demo = f.get("demo") === "1";
    const ocr = svc.runPassportOcr({ fileHash, demo });
    svc.capturePassport(g.session!, applicantId, ocr, fileHash ? `uploads/cap_${applicantId}_${Date.now()}.bin` : undefined, demo ? "demo_passport.jpg" : undefined);
    allPaths();
    return { ok: true, id: applicantId };
  } catch (e: any) { return { ok: false, error: e.message }; }
}

export async function confirmPassportAction(_p: any, f: FormData): Promise<R> {
  try {
    const g = await s(); if ("error" in g && g.error) return g as any;
    svc.confirmPassportData(g.session!, String(f.get("applicant_id") || ""), {
      surname: String(f.get("surname") || ""), given: String(f.get("given") || ""),
      passport_number: String(f.get("passport_number") || ""), dob: String(f.get("dob") || ""),
      sex: String(f.get("sex") || ""), expiry: String(f.get("expiry") || "")
    });
    allPaths();
    return { ok: true };
  } catch (e: any) { return { ok: false, error: e.message }; }
}

export async function verifyPassportAction(_p: any, f: FormData): Promise<R> {
  try {
    const g = await s(); if ("error" in g && g.error) return g as any;
    svc.verifyPassport(g.session!, String(f.get("applicant_id") || ""));
    allPaths();
    return { ok: true };
  } catch (e: any) { return { ok: false, error: e.message }; }
}

export async function addDocumentAction(_p: any, f: FormData): Promise<R> {
  try {
    const g = await s(); if ("error" in g && g.error) return g as any;
    svc.addDocument(g.session!, String(f.get("applicant_id") || ""), {
      document_type: String(f.get("document_type") || "PHOTOGRAPH"),
      storage_path: String(f.get("storage_path") || "") || undefined,
      file_name: String(f.get("file_name") || "") || undefined,
      mime_type: String(f.get("mime_type") || "") || undefined,
      file_size: Number(f.get("file_size") || 0) || undefined
    });
    allPaths();
    return { ok: true };
  } catch (e: any) { return { ok: false, error: e.message }; }
}

export async function setDocumentStatusAction(_p: any, f: FormData): Promise<R> {
  try {
    const g = await s(); if ("error" in g && g.error) return g as any;
    svc.setDocumentStatus(g.session!, String(f.get("doc_id") || ""), String(f.get("status") || "PENDING_REVIEW"), String(f.get("note") || "") || undefined);
    allPaths();
    return { ok: true };
  } catch (e: any) { return { ok: false, error: e.message }; }
}

export async function createDispatchAction(_p: any, f: FormData): Promise<R> {
  try {
    const g = await s(); if ("error" in g && g.error) return g as any;
    svc.createDispatch(g.session!, String(f.get("applicant_id") || ""), {
      request_type: String(f.get("request_type") || "DOSSIER_REVIEW"),
      agency_note: String(f.get("agency_note") || ""),
      priority: String(f.get("priority") || "NORMAL")
    });
    allPaths();
    return { ok: true };
  } catch (e: any) { return { ok: false, error: e.message }; }
}

export async function decideDispatchAction(_p: any, f: FormData): Promise<R & { runId?: string }> {
  try {
    const g = await s(); if ("error" in g && g.error) return g as any;
    const r = svc.decideDispatch(g.session!, String(f.get("id") || ""), {
      decision: String(f.get("decision") || "CORRECTION") as any,
      master_note: String(f.get("master_note") || "") || undefined,
      agentId: String(f.get("agent_id") || "") || undefined
    });
    allPaths();
    return { ok: true, runId: r.runId };
  } catch (e: any) { return { ok: false, error: e.message }; }
}

export async function runAgentAction(_p: any, f: FormData): Promise<R & { runId?: string; approvalId?: string }> {
  try {
    const g = await s(); if ("error" in g && g.error) return g as any;
    const r = svc.startAgentRunSafe(g.session!, {
      agentCode: String(f.get("agent_code") || ""),
      tenantId: String(f.get("tenant_id") || ""),
      applicantId: String(f.get("applicant_id") || "") || undefined,
      taskType: String(f.get("task_type") || "MANUAL")
    });
    allPaths();
    return { ok: true, runId: r.runId, approvalId: r.approvalId };
  } catch (e: any) { return { ok: false, error: e.message }; }
}

export async function decideApprovalAction(_p: any, f: FormData): Promise<R> {
  try {
    const g = await s(); if ("error" in g && g.error) return g as any;
    const r = svc.decideApproval(g.session!, String(f.get("id") || ""), f.get("approve") === "1", String(f.get("note") || "") || undefined);
    if (!r.ok) return { ok: false, error: r.error || "Decision failed" };
    allPaths();
    return { ok: true };
  } catch (e: any) { return { ok: false, error: e.message }; }
}

export async function stopBrowserAction(_p: any, f: FormData): Promise<R> {
  try {
    const g = await s(); if ("error" in g && g.error) return g as any;
    svc.stopBrowserSession(g.session!, String(f.get("id") || ""));
    allPaths();
    return { ok: true };
  } catch (e: any) { return { ok: false, error: e.message }; }
}

export async function sendMessageAction(_p: any, f: FormData): Promise<R> {
  try {
    const g = await s(); if ("error" in g && g.error) return g as any;
    svc.sendMessage(g.session!, {
      conversationId: String(f.get("conversation_id") || "") || undefined,
      applicantId: String(f.get("applicant_id") || "") || undefined,
      body: String(f.get("body") || "")
    });
    allPaths();
    return { ok: true };
  } catch (e: any) { return { ok: false, error: e.message }; }
}

export async function markNotifsReadAction(): Promise<void> {
  try { const g = await s(); if ("error" in g && g.error) return; svc.markNotificationsRead(g.session!); allPaths(); } catch { /* noop */ }
}

export async function payInvoiceAction(_p: any, f: FormData): Promise<R> {
  try {
    const g = await s(); if ("error" in g && g.error) return g as any;
    svc.payInvoice(g.session!, String(f.get("invoice_id") || ""), String(f.get("method") || "Online (demo)"));
    allPaths();
    return { ok: true };
  } catch (e: any) { return { ok: false, error: e.message }; }
}

export async function updateTenantAction(_p: any, f: FormData): Promise<R> {
  try {
    const g = await s(); if ("error" in g && g.error) return g as any;
    svc.updateTenant(g.session!, String(f.get("tenant_id") || ""), {
      name: String(f.get("name") || "") || undefined,
      logo_url: String(f.get("logo_url") || "") || undefined,
      primary: String(f.get("primary") || "") || undefined
    });
    allPaths();
    return { ok: true };
  } catch (e: any) { return { ok: false, error: e.message }; }
}

export async function addMemberAction(_p: any, f: FormData): Promise<R> {
  try {
    const g = await s(); if ("error" in g && g.error) return g as any;
    svc.addMember(g.session!, String(f.get("tenant_id") || ""), {
      email: String(f.get("email") || ""), full_name: String(f.get("full_name") || ""), role: String(f.get("role") || "VISA_OFFICER") as any
    });
    allPaths();
    return { ok: true };
  } catch (e: any) { return { ok: false, error: e.message }; }
}

export async function updateSettingsAction(_p: any, f: FormData): Promise<R> {
  try {
    const g = await s(); if ("error" in g && g.error) return g as any;
    svc.updateSettings(g.session!, {
      dry_run: f.get("dry_run") === "1",
      hard_pause: f.get("hard_pause") === "1",
      monthly_budget_usd: Number(f.get("budget") || 250),
      warn_at: Number(f.get("warn_at") || 0.8),
      webhook_url: String(f.get("webhook_url") || "")
    });
    allPaths();
    return { ok: true };
  } catch (e: any) { return { ok: false, error: e.message }; }
}

export async function setAgentProductionAction(_p: any, f: FormData): Promise<R> {
  try {
    const g = await s(); if ("error" in g && g.error) return g as any;
    svc.setAgentProduction(g.session!, String(f.get("agent_id") || ""), f.get("on") === "1");
    allPaths();
    return { ok: true };
  } catch (e: any) { return { ok: false, error: e.message }; }
}

export async function rotateCredentialAction(_p: any, f: FormData): Promise<R> {
  try {
    const g = await s(); if ("error" in g && g.error) return g as any;
    svc.rotateCredential(g.session!, String(f.get("id") || ""));
    allPaths();
    return { ok: true };
  } catch (e: any) { return { ok: false, error: e.message }; }
}

export async function createDossierLinkAction(_p: any, f: FormData): Promise<R & { url?: string }> {
  try {
    const g = await s(); if ("error" in g && g.error) return g as any;
    const r = svc.createDossierLink(g.session!, String(f.get("applicant_id") || ""));
    return { ok: true, url: r.url };
  } catch (e: any) { return { ok: false, error: e.message }; }
}
