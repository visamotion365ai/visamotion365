"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import {
  demoPasswordOk, sessionForProfile, createSessionCookie, clearSessionCookie,
  createMfaTicket, getMfaTicket, clearMfaCookie, homeFor
} from "@/lib/session";
import { otp6 } from "@/lib/crypto";
import { logAudit } from "@/lib/audit";
import type { Session } from "@/lib/schema";

export async function loginAction(prev: any, form: FormData) {
  const email = String(form.get("email") || "").trim();
  const password = String(form.get("password") || "");
  if (!email || !password) return { ok: false, error: "Email and password are required." };
  const db = getDb();
  const profile = db.profiles.find((p) => p.email.toLowerCase() === email.toLowerCase());
  if (!profile || !demoPasswordOk(email, password)) {
    return { ok: false, error: "Invalid credentials. Check the demo accounts on the login page." };
  }
  const s = sessionForProfile(db, profile.id);
  if (!s) return { ok: false, error: "No active role for this account." };
  const store = await cookies();
  if (s.role === "SUPER_ADMIN") {
    const otp = otp6();
    store.set(createMfaTicket(s.uid, otp));
    return { ok: true, mfa: true, otp, email: s.email };
  }
  store.set(createSessionCookie(s));
  logAudit(db, { actor_user_id: s.uid, actor_type: "USER", tenant_id: s.tenant_id, action: "AUTH.LOGIN", metadata: { role: s.role } });
  return { ok: true, redirect: homeFor(s) };
}

export async function mfaAction(prev: any, form: FormData) {
  const otp = String(form.get("otp") || "").trim();
  const ticket = await getMfaTicket();
  const store = await cookies();
  if (!ticket) return { ok: false, error: "MFA session expired — please sign in again." };
  if (ticket.otp !== otp) return { ok: false, error: "Incorrect one-time code. Try again." };
  const db = getDb();
  const s = sessionForProfile(db, ticket.uid);
  if (!s || s.role !== "SUPER_ADMIN") return { ok: false, error: "MFA ticket invalid." };
  store.set(createSessionCookie(s));
  store.set(clearMfaCookie());
  logAudit(db, { actor_user_id: s.uid, actor_type: "USER", action: "AUTH.MFA_VERIFIED" });
  return { ok: true, redirect: "/dashboard" };
}

export async function logoutAction() {
  const store = await cookies();
  store.set(clearSessionCookie());
  store.set(clearMfaCookie());
  redirect("/login");
}
