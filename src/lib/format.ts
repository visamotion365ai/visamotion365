export function money(n: number, currency = "USD"): string {
  const sym = currency === "BDT" ? "৳" : currency === "USD" ? "$" : currency + " ";
  return sym + Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 });
}
export function dt(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
export function dtt(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}
export function timeAgo(iso?: string): string {
  if (!iso) return "—";
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
export function ago(days: number, hours = 0): string {
  return new Date(Date.now() - days * 86400000 - hours * 3600000).toISOString();
}
export function ahead(days: number, hours = 0): string {
  return new Date(Date.now() + days * 86400000 + hours * 3600000).toISOString();
}
export function ageMs(iso: string): number {
  return Date.now() - new Date(iso).getTime();
}
