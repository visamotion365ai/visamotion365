import type { PDFFont } from "pdf-lib";
import type { DB, Applicant } from "./schema";
import { runCompliance } from "./compliance";
import { maskPassport } from "./mrz";

// pdf-lib & qrcode are CommonJS and listed in next.config's serverExternalPackages.
// pdf-lib draws only accept real Color objects, so we pull rgb() from the runtime
// (loaded via a genuine Node require() in the API route) and build colors there.
export interface PdfRuntime {
  pdf: { PDFDocument: any; StandardFonts: any; rgb: (r: number, g: number, b: number) => any };
  qr: { toBuffer: (text: string, opts: any) => Promise<Buffer> };
}

function wrap(font: PDFFont, text: string, width: number, size: number): string[] {
  const words = String(text).split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? cur + " " + w : w;
    if (font.widthOfTextAtSize(test, size) > width && cur) { lines.push(cur); cur = w; }
    else cur = test;
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

export async function buildDossierPdf(db: DB, app: Applicant, origin: string, vaultToken: string, runtime: PdfRuntime): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = runtime.pdf;
  if (!PDFDocument?.create || !StandardFonts?.Helvetica) throw new Error("pdf-lib runtime not loaded by caller");
  const NAVY = rgb(0.06, 0.09, 0.16);      // #0F172A
  const SLATE = rgb(0.39, 0.45, 0.55);     // #64748B
  const LINE = rgb(0.89, 0.91, 0.94);      // #E2E8F0
  const GREEN = rgb(0.02, 0.59, 0.41);     // emerald
  const AMBER = rgb(0.85, 0.47, 0.02);     // amber
  const RED = rgb(0.86, 0.15, 0.15);       // red
  const INDIGO = rgb(0.29, 0.22, 0.78);
  const LIGHT = rgb(0.95, 0.96, 0.98);
  const doc = await PDFDocument.create();
  doc.setTitle(`Visa Dossier — ${app.first_name} ${app.last_name}`);
  doc.setAuthor("VisaMotion365");
  const page = doc.addPage([595.28, 841.89]); // A4
  // pdf-lib caches: calling embedFont twice with the same font returns the same handle
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const mono = await doc.embedFont(StandardFonts.Courier);
  const M = 42;
  const W = 595.28 - M * 2;
  let y = 841.89 - 30;

  // Header band
  page.drawRectangle({ x: 0, y: 841.89 - 74, width: 595.28, height: 74, color: NAVY });
  page.drawText("VISAMOTION365", { x: M, y: 841.89 - 34, size: 13, font: bold, color: rgb(0.9, 0.9, 1) });
  const tenant = db.tenants.find((t) => t.id === app.tenant_id);
  page.drawText(`${tenant?.name || "Agency"} — Visa Operations`, { x: M, y: 841.89 - 52, size: 9, font, color: rgb(0.65, 0.7, 0.8) });
  page.drawText("VISA APPLICATION DOSSIER", { x: 595.28 - M, y: 841.89 - 40, size: 15, font: bold, color: rgb(1, 1, 1), align: "right" });
  page.drawText(`Version ${app.dossier_version || "v1.0.0"}  •  ${new Date().toUTCString()}`, { x: 595.28 - M, y: 841.89 - 58, size: 8, font, color: rgb(0.7, 0.75, 0.85), align: "right" });
  y = 841.89 - 96;

  const section = (title: string) => {
    y -= 8;
    page.drawText(title.toUpperCase(), { x: M, y, size: 10.5, font: bold, color: NAVY });
    page.drawRectangle({ x: M, y: y - 5, width: W, height: 1.2, color: INDIGO });
    y -= 18;
  };
  const kv = (k: string, v: string) => {
    page.drawText(k, { x: M, y, size: 9, font, color: SLATE });
    page.drawText(String(v).slice(0, 80), { x: M + 150, y, size: 9.5, font, color: NAVY });
    y -= 15;
  };
  const para = (text: string, size = 9, color = SLATE, indent = 0) => {
    for (const line of wrap(font, text, W - indent, size)) {
      page.drawText(line, { x: M + indent, y, size, font, color });
      y -= size + 4;
    }
  };

  // 1. Applicant
  section("1 • Applicant Summary");
  kv("Full name", `${app.first_name} ${app.last_name}`);
  kv("Date of birth", app.date_of_birth || "—");
  kv("Nationality", app.nationality || "—");
  kv("Gender", app.gender || "—");
  kv("Passport", app.passport_data ? maskPassport(app.passport_data.passport_number) + " (AES-256-GCM at rest)" : "Not captured");
  kv("Passport expiry", app.passport_expiry || "—");
  kv("Target country", app.target_country);
  const program = db.visa_programs.find((p) => p.id === app.visa_program_id);
  kv("Visa program", program ? `${program.name} (${program.category})` : "—");
  kv("Case status", app.application_stage.replace(/_/g, " "));
  kv("Agency reference", app.id.toUpperCase());

  // 2. Passport
  section("2 • Passport (OCR + MRZ verified)");
  const pd = app.passport_data;
  if (pd) {
    kv("Surname / Given", `${pd.surname} / ${pd.given}`);
    kv("Expiry", pd.expiry + (new Date(pd.expiry) > new Date(Date.now() + 180 * 86400000) ? "  (valid 6+ months)" : "  (WARNING: < 6 months)"));
    kv("MRZ checksums", pd.mrz ? (pd.mrz.length >= 3 ? "L1 ok  L2 ok  L3 ok (parser-validated)" : "partial") : "—");
    kv("OCR engine / confidence", `${pd.ocr_engine} / ${(pd.ocr_confidence * 100).toFixed(0)}%`);
    for (const line of pd.mrz || []) {
      page.drawText(line, { x: M, y, size: 8.5, font: mono, color: NAVY });
      y -= 12;
    }
    kv("Verified by", pd.verified ? "Document Officer (approved)" : "PENDING — human verification required");
  } else {
    para("Passport not captured yet.");
  }

  // 3. Document index
  section("3 • Document Index");
  const docs = db.client_documents.filter((d) => d.applicant_id === app.id);
  page.drawRectangle({ x: M, y: y - 8, width: W, height: 16, color: LIGHT });
  ["TYPE", "STATUS", "VERSION", "UPLOADED"].forEach((h, i) => {
    const x = [M + 6, M + 210, M + 330, M + 390][i];
    page.drawText(h, { x, y: y - 7, size: 7.5, font: bold, color: SLATE });
  });
  y -= 24;
  for (const d of docs.slice(0, 12)) {
    page.drawText(d.document_type, { x: M + 6, y, size: 8.5, font, color: NAVY });
    const tone = d.verification_status === "VERIFIED" ? GREEN : d.verification_status === "PENDING_REVIEW" || d.verification_status === "UPLOADED" || d.verification_status === "OCR_PROCESSING" ? AMBER : RED;
    page.drawText(d.verification_status, { x: M + 210, y, size: 8.5, font: bold, color: tone });
    page.drawText(`v${d.version}`, { x: M + 330, y, size: 8.5, font, color: SLATE });
    page.drawText(new Date(d.uploaded_at).toLocaleDateString("en-GB"), { x: M + 390, y, size: 8.5, font, color: SLATE });
    y -= 14;
    page.drawLine({ start: { x: M, y: y + 8 }, end: { x: M + W, y: y + 8 }, thickness: 0.5, color: LINE });
  }
  if (!docs.length) { para("No documents on file."); y += 8; }

  // 4. Compliance matrix
  section("4 • Compliance Matrix");
  const report = runCompliance(db, app);
  for (const r of report.rows.slice(0, 16)) {
    const label = (r.required ? "" : "(opt) ") + r.requirement;
    page.drawText(label, { x: M + 6, y, size: 8.5, font, color: NAVY });
    const tone = r.status === "VERIFIED" ? GREEN : ["PENDING_REVIEW", "UPLOADED"].includes(r.status) ? AMBER : r.status === "EXPIRED" ? RED : RED;
    page.drawText(r.status, { x: M + 210, y, size: 8.5, font: bold, color: tone });
    page.drawText(wrap(font, r.detail, 190, 8)[0] || "", { x: M + 300, y, size: 8, font, color: SLATE });
    y -= 14;
  }
  y -= 4;
  para(`Compliance score: ${report.score}/100`, 10, NAVY);
  y -= 14;

  // 5. Missing
  section("5 • Missing / Attention Items");
  const missing = [...report.missing.map((m) => `• ${m}`), ...report.expired.map((m) => `• ${m} (expired)`), ...report.warnings.map((w) => `• ${w}`)];
  if (missing.length) missing.slice(0, 8).forEach((m) => para(m, 9, RED, 4));
  else para("None. All required documents are on file and verified.", 9, GREEN);
  y -= 10;

  // 6. Review notes + QR
  section("6 • Review Notes & Private Vault");
  para(app.feedback_note || "No officer notes yet.", 9);
  y -= 6;
  let qrBytes: Uint8Array | null = null;
  try {
    qrBytes = await runtime.qr.toBuffer(`${origin}/vault/${vaultToken}`, { width: 440, margin: 1, color: { dark: "#0F172A", light: "#FFFFFF" } });
  } catch { /* QR optional */ }
  if (qrBytes) {
    const png = await doc.embedPng(qrBytes as unknown as Buffer);
    const s = 108;
    page.drawImage(png, { x: 595.28 - M - s, y: y - s, width: s, height: s });
    page.drawText("Scan with agency credentials —", { x: M, y: y - 14, size: 8.5, font, color: SLATE });
    page.drawText("authenticated vault link, expires in 15 minutes.", { x: M, y: y - 26, size: 8.5, font, color: SLATE });
  }

  // Footer
  page.drawRectangle({ x: 0, y: 0, width: 595.28, height: 26, color: LIGHT });
  page.drawText("CONFIDENTIAL — contains encrypted passport reference. Do not share. Generated by VisaMotion365 (demo data).", { x: M, y: 10, size: 7, font, color: SLATE });
  page.drawText("Page 1/1", { x: 595.28 - M, y: 10, size: 7, font, color: SLATE, align: "right" });

  return doc.save();
}
