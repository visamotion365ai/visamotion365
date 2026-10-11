import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { sessionForProfile, createSessionCookie, homeFor } from "@/lib/session";

// DEMO-ONLY convenience for local smoke testing. Gated by DEMO_MODE=1.
// Remove DEMO_MODE in production.
export async function POST(req: Request) {
  if (process.env.DEMO_MODE !== "1") {
    return NextResponse.json({ ok: false, error: "dev-login disabled" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "");
  const db = getDb();
  const p = db.profiles.find((x) => x.email.toLowerCase() === email.toLowerCase());
  if (!p) return NextResponse.json({ ok: false, error: "unknown user" }, { status: 404 });
  const s = sessionForProfile(db, p.id);
  if (!s) return NextResponse.json({ ok: false, error: "no role" }, { status: 403 });
  const store = await cookies();
  store.set(createSessionCookie(s));
  return NextResponse.json({ ok: true, role: s.role, redirect: homeFor(s) });
}
