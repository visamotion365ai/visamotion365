import type { DB, Applicant, ClientDocument, VisaRequirement } from "./schema";

export interface ComplianceRow {
  requirement: string; required: boolean;
  status: "VERIFIED" | "PENDING_REVIEW" | "UPLOADED" | "MISSING" | "EXPIRED";
  detail: string;
}
export interface ComplianceReport {
  score: number; rows: ComplianceRow[];
  missing: string[]; pending: string[]; expired: string[];
  warnings: string[];
}

const OK: ClientDocument["verification_status"][] = ["VERIFIED"];
const PARTIAL: ClientDocument["verification_status"][] = ["UPLOADED", "PENDING_REVIEW", "OCR_PROCESSING"];

export function docsFor(db: DB, applicantId: string): ClientDocument[] {
  return db.client_documents.filter((d) => d.applicant_id === applicantId);
}

export function runCompliance(db: DB, app: Applicant): ComplianceReport {
  const program = db.visa_programs.find((p) => p.id === app.visa_program_id);
  const reqs: VisaRequirement[] = program
    ? db.visa_requirements.filter((r) => r.visa_program_id === program.id)
    : [];
  const docs = docsFor(db, app.id);
  const rows: ComplianceRow[] = [];
  const missing: string[] = [];
  const pending: string[] = [];
  const expired: string[] = [];
  const warnings: string[] = [];
  const today = new Date();
  const in6months = new Date(today.getTime() + 180 * 86400000);

  for (const r of reqs) {
    const doc = docs.find((d) => d.document_type === r.document_type);
    let status: ComplianceRow["status"];
    let detail = r.instructions;
    if (!doc) {
      status = "MISSING";
      detail = r.is_required ? "Not uploaded yet" : "Optional — not uploaded";
    } else if (OK.includes(doc.verification_status)) {
      status = "VERIFIED";
      detail = `Verified ${new Date(doc.uploaded_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}`;
      if (r.document_type === "PASSPORT" && app.passport_expiry && new Date(app.passport_expiry) < in6months) {
        status = "EXPIRED";
        detail = "Passport expires in less than 6 months";
      }
      if (["MEDICAL_CERTIFICATE", "POLICE_CLEARANCE"].includes(r.document_type) && doc.expiry_date && new Date(doc.expiry_date) < today) {
        status = "EXPIRED";
        detail = `Document expired ${doc.expiry_date}`;
      }
    } else if (PARTIAL.includes(doc.verification_status)) {
      status = doc.verification_status === "OCR_PROCESSING" ? "UPLOADED" : "PENDING_REVIEW";
      detail = `Uploaded, awaiting officer review`;
    } else {
      status = "MISSING";
      detail = `Document ${doc.verification_status.toLowerCase()} — re-upload required`;
    }

    if (status === "MISSING" && r.is_required) missing.push(r.document_type);
    if (status === "PENDING_REVIEW" || status === "UPLOADED") pending.push(r.document_type);
    if (status === "EXPIRED") expired.push(r.document_type);
    rows.push({ requirement: r.document_type, required: r.is_required, status, detail });
  }

  // Passport validity
  if (app.passport_expiry && new Date(app.passport_expiry) < in6months) {
    warnings.push(`Passport expires ${app.passport_expiry} (< 6 months beyond travel)`);
  }
  // Name consistency across documents with extracted names
  const name = `${(app.passport_data?.surname || app.last_name || "").toUpperCase()} ${(app.passport_data?.given || app.first_name || "").toUpperCase()}`.trim();
  for (const d of docs) {
    const exName = d.extracted_data?.name;
    if (typeof exName === "string" && exName.length > 3 && d.document_type !== "PASSPORT") {
      if (!name.includes(exName.toUpperCase().split(" ")[0]) && !exName.toUpperCase().includes(app.last_name?.toUpperCase() || "")) {
        warnings.push(`Name mismatch on ${d.document_type}: "${exName}" vs passport "${name}"`);
      }
    }
  }
  // Bank statement arithmetic
  const bank = docs.find((d) => d.document_type === "BANK_STATEMENT" && d.extracted_data?.closing != null);
  if (bank) {
    const e = bank.extracted_data;
    const expected = e.opening + e.deposits - e.withdrawals;
    if (Math.abs(expected - e.closing) > 1) {
      warnings.push(`Bank statement arithmetic off by ${(expected - e.closing).toLocaleString()} (opening + deposits − withdrawals ≠ closing)`);
    }
  }

  const requiredRows = rows.filter((r) => r.required);
  const okCount = requiredRows.filter((r) => r.status === "VERIFIED").length;
  const half = requiredRows.filter((r) => r.status === "PENDING_REVIEW" || r.status === "UPLOADED").length;
  const score = requiredRows.length === 0 ? 100 : Math.round(((okCount + half * 0.5) / requiredRows.length) * 100);

  return { score, rows, missing, pending, expired, warnings };
}

/** Agent 04 — financial/document consistency checks (real logic). */
export function consistencyCheck(db: DB, app: Applicant): { checks: { name: string; status: "PASS" | "WARN" | "FAIL"; detail: string }[]; score: number } {
  const docs = docsFor(db, app.id);
  const checks: { name: string; status: "PASS" | "WARN" | "FAIL"; detail: string }[] = [];
  const name = `${(app.passport_data?.surname || app.last_name || "").toUpperCase()} ${(app.passport_data?.given || app.first_name || "").toUpperCase()}`.trim();

  const withNames = docs.filter((d) => typeof d.extracted_data?.name === "string" && d.document_type !== "PASSPORT");
  if (withNames.length === 0) {
    checks.push({ name: "Name consistency", status: "WARN", detail: "No extracted names available to compare (OCR not run on all documents)." });
  } else {
    let mismatch = 0;
    for (const d of withNames) {
      const ex = String(d.extracted_data.name).toUpperCase();
      const first = ex.split(" ").pop() || "";
      const last = ex.split(" ")[0] || "";
      if (!(name.includes(last) || name.includes(first))) mismatch++;
    }
    checks.push({
      name: "Name consistency across documents",
      status: mismatch === 0 ? "PASS" : mismatch === 1 ? "WARN" : "FAIL",
      detail: mismatch === 0 ? `All ${withNames.length} named documents match passport name.` : `${mismatch} document(s) do not clearly match passport name "${name}".`
    });
  }

  const bank = docs.find((d) => d.document_type === "BANK_STATEMENT" && d.extracted_data?.closing != null);
  if (bank) {
    const e = bank.extracted_data;
    const expected = e.opening + e.deposits - e.withdrawals;
    const diff = expected - e.closing;
    checks.push({ name: "Bank statement arithmetic", status: Math.abs(diff) <= 1 ? "PASS" : "FAIL", detail: `Opening ${e.opening.toLocaleString()} + deposits ${e.deposits.toLocaleString()} − withdrawals ${e.withdrawals.toLocaleString()} = ${expected.toLocaleString()} vs closing ${e.closing.toLocaleString()}.` });
    checks.push({ name: "Statement period", status: e.period_months >= 6 ? "PASS" : "WARN", detail: `Statement covers ${e.period_months} months (required: 6).` });
  } else {
    checks.push({ name: "Bank statement arithmetic", status: "WARN", detail: "No bank statement extracted yet." });
  }

  // DOB / passport plausibility
  if (app.date_of_birth) {
    const age = (Date.now() - new Date(app.date_of_birth).getTime()) / (365.25 * 86400000);
    checks.push({ name: "Applicant age plausibility", status: age >= 18 ? "PASS" : "FAIL", detail: `Age ≈ ${Math.floor(age)} years.` });
  }

  const score = Math.round(checks.reduce((a, c) => a + (c.status === "PASS" ? 1 : c.status === "WARN" ? 0.5 : 0), 0) / Math.max(1, checks.length) * 100);
  return { checks, score };
}
