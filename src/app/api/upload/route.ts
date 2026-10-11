import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { getSession } from "@/lib/session";
import { isStaff } from "@/lib/policy";
import { dataPath } from "@/lib/db";

const MAX = 10 * 1024 * 1024; // 10 MB
const OK_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const OK_EXT = new Set([".pdf", ".jpg", ".jpeg", ".png", ".webp"]);

export async function POST(req: Request) {
  try {
    const s = await getSession();
    if (!s) return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
    const fd = await req.formData();
    const file = fd.get("file") as File | null;
    if (!file) return NextResponse.json({ ok: false, error: "No file" }, { status: 400 });
    if (file.size > MAX) return NextResponse.json({ ok: false, error: "File exceeds 10 MB limit" }, { status: 413 });
    const ext = path.extname(file.name).toLowerCase();
    if (!OK_TYPES.has(file.type) && !OK_EXT.has(ext)) return NextResponse.json({ ok: false, error: "Unsupported file type (pdf/jpg/png/webp only)" }, { status: 415 });

    const dir = dataPath("uploads");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const name = `${Date.now()}_${crypto.randomBytes(4).toString("hex")}${ext}`;
    const buf = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(path.join(dir, name), buf);
    return NextResponse.json({
      ok: true,
      storage_path: `uploads/${name}`,
      file_name: file.name,
      mime_type: file.type || "application/octet-stream",
      file_size: file.size,
      file_hash: crypto.createHash("sha256").update(buf).digest("hex").slice(0, 16)
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || "Upload failed" }, { status: 500 });
  }
}
