// ICAO 9303 Machine Readable Zone (MRZ) — TD1/TD3 passport parsing.
// Check digits: modulus 10 with repeating weights 7-3-1 (Doc 9303, Part 3, ch. 4.9).
// Character values: 0-9 → 0-9, A-Z → 10-35, '<' → 0.

const VAL: Record<string, number> = {};
for (let i = 0; i < 10; i++) VAL[String(i)] = i;
for (let i = 0; i < 26; i++) VAL[String.fromCharCode(65 + i)] = 10 + i;
VAL["<"] = 0;
const WEIGHTS = [7, 3, 1];

export function checkDigit(input: string): string {
  let sum = 0;
  for (let i = 0; i < input.length; i++) {
    sum += (VAL[input[i]] ?? 0) * WEIGHTS[i % 3];
  }
  return String(sum % 10);
}

export function cleanName(s: string): string {
  return (s || "").toUpperCase().replace(/[^A-Z<]/g, "<");
}

export interface Td3Input {
  surname: string; given: string; number8: string; nationality: string;
  dob: string; sex: string; expiry: string; personal?: string;
}

export function buildTd3(f: Td3Input): { line1: string; line2: string; line3: string; valid: boolean } {
  const iso = (f.nationality || "BD").toUpperCase().replace(/[^A-Z]/g, "<").slice(0, 2).padEnd(2, "<");

  // Line 1: P< + state(2) + name block(40) | composite check
  const name = (cleanName(f.surname) + "<<" + cleanName(f.given)).slice(0, 40).padEnd(40, "<");
  const l1data = ("P<" + iso + name).slice(0, 43);
  const line1 = l1data + checkDigit(l1data);

  // Line 2 (44): number(8)+cd | nationality(3) | dob(6)+cd | sex | expiry(6)+cd | personal(15)+cd | composite
  const num8 = (f.number8 || "BD000000").toUpperCase().replace(/[^A-Z0-9]/g, "0").slice(0, 8).padEnd(8, "0");
  const nat3 = iso + "<";
  const personal = (f.personal || "").toUpperCase().replace(/[^A-Z0-9]/g, "<").padEnd(15, "<").slice(0, 15);
  const base =
    num8 + checkDigit(num8) +
    nat3 +
    f.dob + checkDigit(f.dob) +
    f.sex +
    f.expiry + checkDigit(f.expiry) +
    personal + checkDigit(personal);
  const comp = base.slice(0, 10) + base.slice(12, 19) + base.slice(20, 27) + base.slice(27, 43);
  const line2 = base.slice(0, 43) + checkDigit(comp);

  // Line 3: supplemental + composite
  const l3data = "<".repeat(43);
  const line3 = l3data + checkDigit(l3data);

  return { line1, line2, line3, valid: true };
}

export function parseMrz(linesIn: string[]): { ok: boolean; errors: string[]; fields?: any } {
  const lines = linesIn.map((l) => l.trim().replace(/\s+/g, "")).filter(Boolean);
  const errors: string[] = [];
  if (lines.length < 2) return { ok: false, errors: ["MRZ must have 2 or 3 lines"] };
  if (lines[0].length !== 44) errors.push(`Line 1 must be 44 chars (got ${lines[0].length})`);
  if (lines[1].length !== 44) errors.push(`Line 2 must be 44 chars (got ${lines[1].length})`);

  const l1 = lines[0], l2 = lines[1];
  if (l1[0] !== "P") errors.push("Document type must be P (passport)");
  if (checkDigit(l1.slice(0, 43)) !== l1[43]) errors.push("Line 1 composite check digit failed");
  if (checkDigit(l2.slice(0, 8)) !== l2[8]) errors.push("Document number check digit failed");
  if (checkDigit(l2.slice(12, 18)) !== l2[18]) errors.push("Date of birth check digit failed");
  if (checkDigit(l2.slice(20, 26)) !== l2[26]) errors.push("Expiry date check digit failed");
  if (checkDigit(l2.slice(27, 42)) !== l2[42]) errors.push("Personal number check digit failed");
  if (checkDigit(l2.slice(0, 10) + l2.slice(12, 19) + l2.slice(20, 27) + l2.slice(27, 43)) !== l2[43])
    errors.push("Line 2 composite check digit failed");
  if (lines[2] && checkDigit(lines[2].slice(0, 43)) !== lines[2][43]) errors.push("Line 3 composite check digit failed");

  const untag = (s: string) => s.replace(/</g, "").trim();
  const nameBlock = l1.slice(4);
  const [sur, ...givenParts] = nameBlock.split("<<");
  const fields = {
    type: l1.slice(0, 2),
    issuing_state: l1.slice(2, 4),
    name_block: nameBlock,
    surname: untag(sur || ""),
    given: untag(givenParts.join("<<")),
    passport_number: l2.slice(0, 9),
    nationality: l2.slice(9, 12),
    dob: l2.slice(12, 18),
    sex: l2.slice(19, 20),
    expiry: l2.slice(20, 26),
    personal_number: untag(l2.slice(27, 42))
  };
  const fmt = (d: string) => (/^\d{6}$/.test(d) ? `20${d.slice(0, 2)}-${d.slice(2, 4)}-${d.slice(4, 6)}` : d);
  fields.dob_fmt = fmt(fields.dob);
  fields.expiry_fmt = fmt(fields.expiry);
  return { ok: errors.length === 0, errors, fields };
}

export function maskPassport(num?: string): string {
  if (!num) return "—";
  if (num.length <= 4) return num;
  return num.slice(0, 2) + "•".repeat(Math.max(2, num.length - 4)) + num.slice(-2);
}
