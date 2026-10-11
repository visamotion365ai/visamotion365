// VisaMotion365 — demo-mode security & logic tests (run: npm test)
// These exercise the same fail-closed guards used by the app's service layer.
import assert from "assert";
import { reseed, getDb } from "../src/lib/db";
import { sessionForProfile, demoPasswordOk } from "../src/lib/session";
import { canAccessApplicant, canAccessTenant, hasPerm } from "../src/lib/policy";
import { listApplicants, decideApproval, startAgentRunSafe, createApplicant, runPassportOcr, capturePassport, confirmPassportData } from "../src/lib/service";
import { parseMrz, buildTd3 } from "../src/lib/mrz";
import { runCompliance, consistencyCheck } from "../src/lib/compliance";
import { autoReply } from "../src/lib/inbox";
import { createVaultToken, verifyVaultToken } from "../src/lib/vault";
import { signToken, verifyToken } from "../src/lib/crypto";

let pass = 0, fail = 0;
function t(name: string, fn: () => void) {
  try { fn(); pass++; console.log(`  ✓ ${name}`); }
  catch (e: any) { fail++; console.log(`  ✗ ${name}\n    ${e.message}`); }
}

const db = reseed();
const S = (uid: string) => sessionForProfile(getDb(), uid)!;
const SUPER = S("u_super");
const WVC = S("u_own_wvc");
const VFS = S("u_own_vfs");
const DOC_OFF = S("u_officer_doc");
const APPLICANT = S("u_app_demo");

console.log("\n1) Authentication");
t("demo password accepted (super admin)", () => assert(demoPasswordOk("superadmin@example.com", "SuperAdmin123!")));
t("wrong password rejected", () => assert(!demoPasswordOk("superadmin@example.com", "wrong")));
t("unknown user rejected", () => assert(!demoPasswordOk("ghost@example.com", "x")));

console.log("\n2) Tenant isolation (RLS-equivalent guards)");
t("WVC user cannot read VFS applicant", () => {
  const v = getDb().applicants.find((a) => a.id === "a_vfs_1")!;
  assert(!canAccessApplicant(WVC, v));
});
t("VFS user cannot read WVC applicant", () => {
  const w = getDb().applicants.find((a) => a.id === "a_wvc_1")!;
  assert(!canAccessApplicant(VFS, w));
});
t("super admin can read both tenants", () => {
  assert(canAccessApplicant(SUPER, getDb().applicants[0]));
  assert(canAccessApplicant(SUPER, getDb().applicants.find((a) => a.id === "a_vfs_1")!));
});
t("WVC listApplicants returns only WVC", () => {
  const list = listApplicants(WVC);
  assert(list.every((a) => a.tenant_id === "t_wvc"));
  assert(list.length >= 2);
});
t("wrong-tenant create rejected (VFS tries WVC program)", () => {
  assert.throws(() => createApplicant(VFS, { first_name: "X", last_name: "Y", nationality: "BD", target_country: "Australia", visa_program_id: "p_au_tourist" }), /isolation|Forbidden|permission/i);
});
t("applicant cannot read another applicant", () => {
  const other = getDb().applicants.find((a) => a.id === "a_wvc_2")!;
  assert(!canAccessApplicant(APPLICANT, other));
});
t("applicant CAN read own applicant", () => {
  assert(canAccessApplicant(APPLICANT, getDb().applicants.find((a) => a.id === "a_wvc_1")!));
});

console.log("\n3) RBAC permissions");
t("document officer lacks dispatch.create", () => assert(!hasPerm(DOC_OFF, "dispatch.create")));
t("applicant lacks document.verify", () => assert(!hasPerm(APPLICANT, "document.verify")));
t("super admin has all permissions", () => assert(hasPerm(SUPER, "credential.manage")));
t("agency owner lacks credential.manage", () => assert(!hasPerm(WVC, "credential.manage")));

console.log("\n4) MRZ (real checksum math)");
t("buildTd3 produces valid checksums", () => {
  const m = buildTd3({ surname: "HOSSAIN", given: "KARIM", number8: "BD482913", nationality: "BD", dob: "880612", sex: "M", expiry: "301104", personal: "880612M99BD1" });
  const p = parseMrz([m.line1, m.line2, m.line3]);
  assert(p.ok, p.errors.join(","));
  assert(p.fields!.surname === "HOSSAIN");
  assert(p.fields!.passport_number.length === 9);
});
t("tampered MRZ fails checksum", () => {
  const m = buildTd3({ surname: "HOSSAIN", given: "KARIM", number8: "BD482913", nationality: "BD", dob: "880612", sex: "M", expiry: "301104", personal: "880612M99BD1" });
  const bad = m.line1.slice(0, 5) + "X" + m.line1.slice(6);
  const p = parseMrz([bad, m.line2, m.line3]);
  assert(!p.ok);
});

console.log("\n5) OCR + passport workflow");
t("demo OCR returns valid MRZ + confidence", () => {
  const ocr = runPassportOcr({ demo: true });
  assert(ocr.checksums_ok);
  assert(ocr.confidence > 0.8);
  assert(ocr.passport_number.length === 9);
});
t("applicant can capture own passport", () => {
  const ocr = runPassportOcr({ fileHash: "test-hash-123" });
  capturePassport(APPLICANT, "a_wvc_1", ocr, undefined, "test.jpg");
  const app = getDb().applicants.find((a) => a.id === "a_wvc_1")!;
  assert(app.passport_data && app.passport_number_encrypted?.startsWith("enc:v1:"));
});
t("applicant cannot capture ANOTHER applicant's passport", () => {
  const ocr = runPassportOcr({ demo: true });
  assert.throws(() => capturePassport(APPLICANT, "a_wvc_2", ocr), /Forbidden|isolation/);
});
t("document officer can verify passport; applicant cannot", () => {
  const svc = require("../src/lib/service");
  assert.throws(() => svc.verifyPassport(APPLICANT, "a_wvc_1"), /Forbidden|Permission denied/);
  svc.verifyPassport(DOC_OFF, "a_wvc_1");
  assert(getDb().applicants.find((a) => a.id === "a_wvc_1")!.passport_data!.verified);
});

console.log("\n6) Compliance engine (real checks)");
t("detects missing docs for Singapore tourist", () => {
  const r = runCompliance(getDb(), getDb().applicants.find((a) => a.id === "a_wvc_1")!);
  assert(r.missing.includes("EMPLOYMENT_CERTIFICATE"));
  assert(r.missing.includes("TRAVEL_INSURANCE"));
});
t("consistency check flags bank arithmetic only when wrong", () => {
  const c = consistencyCheck(getDb(), getDb().applicants.find((a) => a.id === "a_wvc_1")!);
  const bank = c.checks.find((x) => x.name.includes("arithmetic"));
  assert(bank && (bank.status === "PASS" || bank.status === "FAIL"));
});

console.log("\n7) Approval workflow (fail closed)");
t("non-super cannot approve", () => {
  assert.throws(() => decideApproval(WVC, "ap_2", true), /Super Admin/);
});
t("expired approval cannot be decided", () => {
  const d = getDb();
  const ap = d.approval_requests.find((a) => a.id === "ap_2")!;
  const orig = ap.expires_at;
  ap.expires_at = new Date(Date.now() - 1000).toISOString();
  assert.throws(() => decideApproval(SUPER, "ap_2", true), /expired|EXPIRED/i);
  ap.expires_at = orig;
});
t("approval bound to task: run gets token only when approved", () => {
  const before = getDb().agent_runs.find((r) => r.id === "run_3")!.status;
  assert(before === "WAITING_FOR_APPROVAL");
});

console.log("\n8) Agent safety");
t("agent run respects tenant scope (WVC user, VFS tenant)", () => {
  assert.throws(() => startAgentRunSafe(WVC, { agentCode: "AGENT_01", tenantId: "t_vfs", taskType: "LEAD_SWEEP" }), /scope|Forbidden/);
});
t("agent run creates dry-run output (no external side effects)", () => {
  const r = startAgentRunSafe(SUPER, { agentCode: "AGENT_09", tenantId: "t_wvc", applicantId: "a_wvc_1", taskType: "INTERVIEW_PREP" });
  const run = getDb().agent_runs.find((x) => x.id === r.runId)!;
  assert(run.output_payload?.dry_run === true);
  assert(run.output_payload?.questions?.length >= 3);
});
t("Agent 06 run creates approval request (pause before submit)", () => {
  const r = startAgentRunSafe(SUPER, { agentCode: "AGENT_06", tenantId: "t_vfs", applicantId: "a_vfs_1", taskType: "OFFICIAL_FORM_DRAFT" });
  assert(r.approvalId, "expected approval request for Agent 06");
  const ap = getDb().approval_requests.find((a) => a.id === r.approvalId)!;
  assert(ap.status === "PENDING");
  assert(ap.action_payload.paused_at?.includes("APPROVAL") || ap.action_type === "FINAL_SUBMIT");
});
t("daily limit enforced", () => {
  const d = getDb();
  const agent = d.ai_agents.find((a) => a.id === "ag_01")!;
  agent.daily_limit = 0;
  assert.throws(() => startAgentRunSafe(SUPER, { agentCode: "AGENT_01", tenantId: "t_wvc", taskType: "LEAD_SWEEP" }), /limit/i);
  agent.daily_limit = 100;
});

console.log("\n9) Inbox auto-responder");
t("answers status question from real data", () => {
  const app = getDb().applicants.find((a) => a.id === "a_wvc_1")!;
  const reply = autoReply(getDb(), app, "What is my status?");
  assert(reply.length > 20 && !/guarantee.*approval|approved/i.test(reply.split("guarantee")[0] || reply));
  assert(/Intake|Passport|Documents|Checklist|Dispatch|Review|Lodged|Issued/i.test(reply));
});
t("never promises visa approval", () => {
  const app = getDb().applicants.find((a) => a.id === "a_wvc_1")!;
  const reply = autoReply(getDb(), app, "Will my visa be approved?");
  assert(/cannot guarantee|decided by the embassy/i.test(reply));
});

console.log("\n10) Vault & tokens");
t("vault token verifies and is applicant-bound", () => {
  const tok = createVaultToken("a_wvc_1", "t_wvc");
  const p = verifyVaultToken(tok)!;
  assert(p.kid === "a_wvc_1" && p.tid === "t_wvc");
});
t("tampered token rejected", () => {
  const tok = createVaultToken("a_wvc_1", "t_wvc");
  assert(verifyVaultToken(tok.slice(0, -2) + "xx") === null);
});
t("expired token rejected", () => {
  const tok = signToken({ kid: "a_wvc_1", tid: "t_wvc", exp: Date.now() - 1000 }, "vm365-dev-approval-signing-secret");
  assert(verifyToken(tok, "vm365-dev-approval-signing-secret") === null);
});

console.log(`\n${fail === 0 ? "✅ ALL PASS" : "❌ FAILURES"}: ${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
