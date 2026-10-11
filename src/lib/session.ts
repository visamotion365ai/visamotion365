import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import type { DB, Session } from "./schema";
import { getDb } from "./db";
import { hmac, sessionSecret, sha256 } from "./crypto";
import { isStaff } from "./policy";

const COOKIE = "vm365";
const MFA_COOKIE = "vm365_mfa";
const PASS_SALT = "vm365-demo-salt";

export function demoPasswordOk(email: string, password: string): boolean {
  const db = getDb();
  const p = db.profiles.find((x) => x.email.toLowerCase() === email.toLowerCase());
  return !!p && !!p.password_hash && p.password_hash === sha256(password + PASS_SALT);
}

export function sessionForProfile(db: DB, profileId: string): Session | null {
  const p = db.profiles.find((x) => x.id === profileId);
  if (!p) return null;
  const m = db.organization_members.find((x) => x.user_id === profileId && x.is_active);
  if (m) {
    return {
      uid: profileId, name: p.full_name, email: p.email,
      role: m.role, tenant_id: m.tenant_id === "MASTER" ? null : m.tenant_id, applicant_id: null
    };
  }
  const acc = db.applicant_accounts.find((x) => x.user_id === profileId);
  if (acc) {
    const app = db.applicants.find((x) => x.id === acc.applicant_id);
    if (app) {
      return {
        uid: profileId, name: `${app.first_name} ${app.last_name}`, email: p.email,
        role: "APPLICANT", tenant_id: app.tenant_id, applicant_id: app.id
      };
    }
  }
  return null;
}

function signPayload(body: string): string {
  return body + "." + hmac(body, sessionSecret());
}
function parseSigned(token: string): Record<string, any> | null {
  try {
    const dot = token.lastIndexOf(".");
    const body = token.slice(0, dot);
    const sig = token.slice(dot + 1);
    if (hmac(body, sessionSecret()) !== sig) return null;
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

/** Current verified session (DB-backed: role/tenant re-read from database). */
export async function getSession(): Promise<Session | null> {
  const store = (await cookies()).get(COOKIE);
  if (!store?.value) return null;
  const payload = parseSigned(store.value);
  if (!payload) return null;
  if (payload.exp && Date.now() > payload.exp) return null;
  const db = getDb();
  return sessionForProfile(db, payload.uid);
}

export function createSessionCookie(session: Session): { name: string; value: string; options: any } {
  const body = Buffer.from(JSON.stringify({ uid: session.uid, exp: Date.now() + 1000 * 60 * 60 * 12 })).toString("base64url");
  return {
    name: COOKIE,
    value: signPayload(body),
    options: { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 12 }
  };
}

export function clearSessionCookie(): { name: string; value: string; options: any } {
  return { name: COOKIE, value: "", options: { httpOnly: true, path: "/", maxAge: 0 } };
}

// ---------- MFA (Super Admin). Demo transport: OTP shown on screen. ----------
export function createMfaTicket(uid: string, otp: string): { name: string; value: string; options: any } {
  const body = Buffer.from(JSON.stringify({ uid, otp, exp: Date.now() + 5 * 60 * 1000 })).toString("base64url");
  return { name: MFA_COOKIE, value: signPayload(body), options: { httpOnly: true, sameSite: "lax", path: "/", maxAge: 5 * 60 } };
}
export async function getMfaTicket(): Promise<{ uid: string; otp: string } | null> {
  const store = (await cookies()).get(MFA_COOKIE);
  if (!store?.value) return null;
  const p = parseSigned(store.value);
  if (!p || (p.exp && Date.now() > p.exp)) return null;
  return { uid: p.uid, otp: p.otp };
}
export function clearMfaCookie(): { name: string; value: string; options: any } {
  return { name: MFA_COOKIE, value: "", options: { httpOnly: true, path: "/", maxAge: 0 } };
}

// ---------- Route guards (fail closed) ----------
export async function needSession(): Promise<Session> {
  const s = await getSession();
  if (!s) redirect("/login");
  return s;
}
export async function needSuper(): Promise<Session> {
  const s = await needSession();
  if (s.role !== "SUPER_ADMIN") notFound();
  return s;
}
export async function needStaff(): Promise<Session> {
  const s = await needSession();
  if (!isStaff(s)) redirect(s.role === "APPLICANT" ? "/portal" : "/login");
  return s;
}
export async function needPortal(): Promise<Session> {
  const s = await needSession();
  if (s.role !== "APPLICANT") redirect(isStaff(s) ? "/agency/dashboard" : "/dashboard");
  return s;
}
export function homeFor(s: Session): string {
  if (s.role === "SUPER_ADMIN") return "/dashboard";
  if (s.role === "APPLICANT") return "/portal";
  return "/agency/dashboard";
}
