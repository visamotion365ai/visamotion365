import fs from "fs";
import path from "path";
import type { DB } from "./schema";
import { makeSeed } from "./seed-data";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

let cache: DB | null = null;

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(path.join(DATA_DIR, "uploads"))) fs.mkdirSync(path.join(DATA_DIR, "uploads"), { recursive: true });
}

export function getDb(): DB {
  if (cache) return cache;
  ensureDir();
  if (!fs.existsSync(DB_FILE)) {
    const seed = makeSeed();
    fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2));
    cache = seed;
    return seed;
  }
  try {
    cache = JSON.parse(fs.readFileSync(DB_FILE, "utf8")) as DB;
  } catch {
    const seed = makeSeed();
    fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2));
    cache = seed;
  }
  return cache;
}

export function writeDb(db: DB) {
  cache = db;
  ensureDir();
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

/** Apply a mutation to the db and persist. */
export function mutate<T>(fn: (db: DB) => T): T {
  const db = getDb();
  const result = fn(db);
  writeDb(db);
  return result;
}

export function reseed(): DB {
  const seed = makeSeed();
  writeDb(seed);
  return seed;
}

export function dataPath(rel: string): string {
  return path.join(DATA_DIR, rel);
}
