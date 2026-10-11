import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { runPassportOcr } from "@/lib/service";

export async function POST(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  try {
    const body = await req.json().catch(() => ({}));
    const ocr = runPassportOcr({ fileHash: body.file_hash || undefined, demo: true });
    return NextResponse.json({ ok: true, ocr });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || "OCR failed" }, { status: 500 });
  }
}
