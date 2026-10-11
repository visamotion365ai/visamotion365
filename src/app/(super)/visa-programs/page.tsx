import Link from "next/link";
import { needSuper } from "@/lib/session";
import { liveDb } from "@/lib/agents";
import { PageHeader, Card, CardHead, Badge, statusTone, Table, Td, LinkBtn } from "@/components/ui";
import { BookOpenCheck, ArrowRight } from "lucide-react";

export default async function VisaProgramsPage() {
  await needSuper();
  const db = liveDb();
  return (
    <div className="fade-up">
      <PageHeader crumb="Catalog" title="Visa Programs & Requirements" sub="Checklist source of truth for Agent 03. Requirements are re-verified against official sources on schedule." />
      <Card>
        <Table head={["Program", "Country", "Tenant", "Category", "Required docs", "Status", ""]}>
          {db.visa_programs.map((p) => {
            const c = db.countries.find((x) => x.id === p.country_id);
            const t = db.tenants.find((x) => x.id === p.tenant_id);
            const reqs = db.visa_requirements.filter((r) => r.visa_program_id === p.id);
            const reqCount = reqs.filter((r) => r.is_required).length;
            return (
              <tr key={p.id} className="hover:bg-slate-50/60">
                <Td>
                  <p className="text-xs font-bold text-slate-800">{p.name}</p>
                  <p className="text-[10px] text-slate-400">{p.description}</p>
                </Td>
                <Td><span className="text-sm">{c?.flag} {c?.name}</span></Td>
                <Td><span className="text-xs font-semibold" style={{ color: t?.theme_config.primary }}>{t?.name.split(" ")[0]}</span></Td>
                <Td><Badge tone="slate">{p.category}</Badge></Td>
                <Td><span className="text-xs font-bold text-slate-700">{reqCount}</span> <span className="text-[10px] text-slate-400">required</span></Td>
                <Td><Badge tone={statusTone(p.status)} dot>{p.status}</Badge></Td>
                <Td>
                  <details>
                    <summary className="text-[11px] font-bold text-indigo-600 cursor-pointer">view checklist</summary>
                    <ul className="mt-1.5 space-y-0.5 max-w-xs">
                      {reqs.map((r) => (
                        <li key={r.id} className="text-[10px] text-slate-500 flex items-center gap-1.5">
                          <CheckCircle2 size={10} className={r.is_required ? "text-emerald-500" : "text-slate-300"} />
                          {r.document_type.replace(/_/g, " ")} {!r.is_required && <span className="text-slate-300">(optional)</span>}
                        </li>
                      ))}
                    </ul>
                  </details>
                </Td>
              </tr>
            );
          })}
        </Table>
      </Card>
    </div>
  );
}
import { CheckCircle2 } from "lucide-react";
