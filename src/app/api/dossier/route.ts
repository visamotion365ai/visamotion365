import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { verifyVaultToken } from "@/lib/vault";
import { buildDossierPdf, type PdfRuntime } from "@/lib/dossier";

export const dynamic = "force-dynamic";

declare const require: (id: string) => any;

// Load the CJS deps with a real Node require (these are in serverExternalPackages,
// so webpack keeps them external). The bundled copy inside lib files gets its
// named exports mangled, so we hand the genuine modules to the builder.
function pdfRuntime(): PdfRuntime {
  const pdf = require("pdf-lib");
  const qr = require("qrcode");
  if (!pdf?.PDFDocument || !pdf?.StandardFonts) throw new Error("pdf-lib failed to load");
  if (typeof qr?.toBuffer !== "function") throw new Error("qrcode failed to load");
  return { pdf, qr };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || "";
  const payload = token ? verifyVaultToken(token) : null;
  if (!payload) {
    return NextResponse.json({ ok: false, error: "Invalid or expired vault token" }, { status: 403 });
  }
  const db = getDb();
  const app = db.applicants.find((a) => a.id === payload.kid && a.tenant_id === payload.tid);
  if (!app) return NextResponse.json({ ok: false, error: "Applicant not found" }, { status: 404 });
  try {
    const origin = req.headers.get("x-forwarded-host") ? `https://${req.headers.get("x-forwarded-host")}` : req.url.replace(/\/api\/dossier.*$/, "");
    // fresh 15-min QR token so the printed QR stays short-lived
    const { createVaultToken } = await import("@/lib/vault");
    const pdf = await buildDossierPdf(db, app, origin, createVaultToken(app.id, app.tenant_id), pdfRuntime());
    return new NextResponse(Buffer.from(pdf as unknown as ArrayBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="dossier_${app.id}.pdf"`,
        "Cache-Control": "no-store"
      }
    });
  } catch (e: any) {
    console.error("DOSSIER PDF ERROR:", e?.message, "\n", e?.stack);
    return NextResponse.json({ ok: false, error: e.message || "PDF generation failed" }, { status: 500 });
  }
}
