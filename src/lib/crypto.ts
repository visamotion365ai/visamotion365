import crypto from "crypto";

const enc = new TextEncoder();

export function sha256(s: string): string {
  return crypto.createHash("sha256").update(enc.encode(s)).digest("hex");
}
export function hmac(s: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(enc.encode(s)).digest("hex");
}
export function randomId(prefix = "id"): string {
  return `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
}
export function otp6(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// ---------- AES-256-GCM field encryption (passport numbers etc.) ----------
const KEY_CACHE: Record<string, Buffer> = {};
function getKey(keyMaterial: string): Buffer {
  if (KEY_CACHE[keyMaterial]) return KEY_CACHE[keyMaterial];
  let k = Buffer.from(keyMaterial, "utf8");
  if (k.length < 32) k = Buffer.concat([k, Buffer.alloc(32 - k.length)]);
  const key = crypto.createHash("sha256").update(k).digest(); // 32 bytes
  KEY_CACHE[keyMaterial] = key;
  return key;
}
export const storageKey = () => process.env.STORAGE_ENCRYPTION_KEY || "vm365-dev-storage-key-32bytes!!";

export function encryptText(plain: string): string {
  const key = getKey(storageKey());
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc:v1:${iv.toString("base64")}.${tag.toString("base64")}.${data.toString("base64")}`;
}
export function decryptText(payload: string): string | null {
  try {
    const [_, , ivB64, tagB64, dataB64] = payload.split(":");
    const key = getKey(storageKey());
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

// ---------- Signed short-lived tokens (vault links, approval tokens) ----------
export function signToken(payload: Record<string, any>, secret: string): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${hmac(body, secret)}`;
}
export function verifyToken(token: string, secret: string): Record<string, any> | null {
  try {
    const [body, sig] = token.split(".");
    if (!body || !sig) return null;
    if (hmac(body, secret) !== sig) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}
export const sessionSecret = () => process.env.SESSION_SECRET || "vm365-dev-session-secret";
export const approvalSecret = () => process.env.APPROVAL_SIGNING_SECRET || "vm365-dev-approval-secret";
