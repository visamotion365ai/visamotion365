import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createDossierLink } from "@/lib/service";

export async function GET(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("applicant_id") || "";
  try {
    const r = createDossierLink(s, id);
    return NextResponse.json({ ok: true, ...r });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 403 });
  }
}
