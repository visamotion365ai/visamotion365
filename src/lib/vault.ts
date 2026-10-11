import { signToken, verifyToken, approvalSecret } from "./crypto";

const TTL_MS = 15 * 60 * 1000; // 15 minutes

export function createVaultToken(applicantId: string, tenantId: string): string {
  return signToken({ kid: applicantId, tid: tenantId, exp: Date.now() + TTL_MS }, approvalSecret());
}
export function verifyVaultToken(token: string): { kid: string; tid: string } | null {
  const p = verifyToken(token, approvalSecret());
  if (!p || !p.kid || !p.tid) return null;
  return { kid: p.kid, tid: p.tid };
}
