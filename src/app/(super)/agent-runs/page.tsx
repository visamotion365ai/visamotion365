import Link from "next/link";
import { needSuper } from "@/lib/session";
import { liveDb } from "@/lib/agents";
import { PageHeader, Card, Badge, statusTone, Table, Td, JsonView } from "@/components/ui";
import { Cpu } from "lucide-react";
import { dtt } from "@/lib/format";

export default async function AgentRunsPage() {
  await needSuper();
  const db = liveDb();
  const runs = db.agent_runs;
  const counts = {
    queued: runs.filter((r) => ["QUEUED", "RUNNING"].includes(r.status)).length,
    waiting: runs.filter((r) => r.status === "WAITING_FOR_APPROVAL").length,
    done: runs.filter((r) => r.status === "COMPLETED").length,
    bad: runs.filter((r) => ["FAILED", "CANCELLED"].includes(r.status)).length
  };
  return (
    <div className="fade-up">
      <PageHeader crumb="AI Operations" title="Agent Runs" sub="Every orchestrator execution with input/output payloads. Dry-run outputs never touch external systems." />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {[["Active", counts.queued, "indigo"], ["Waiting approval", counts.waiting, "amber"], ["Completed", counts.done, "emerald"], ["Failed/Cancelled", counts.bad, "red"]].map(([l, v, t]) => (
          <Card key={l as string} className="p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{l}</p>
            <p className={`text-2xl font-black ${t === "emerald" ? "text-emerald-600" : t === "red" ? "text-red-500" : t === "amber" ? "text-amber-600" : "text-indigo-600"}`}>{v}</p>
          </Card>
        ))}
      </div>
      <Card>
        <Table head={["Agent", "Task", "Tenant / Applicant", "Status", "Approval", "Started", "Output"]}>
          {runs.map((r) => {
            const agent = db.ai_agents.find((a) => a.id === r.agent_id);
            const app = db.applicants.find((a) => a.id === r.applicant_id);
            const ap = db.approval_requests.find((x) => x.id === r.approval_id);
            return (
              <tr key={r.id} className="align-top hover:bg-slate-50/60">
                <Td><p className="text-xs font-bold text-slate-800">{agent?.name}</p><p className="text-[10px] text-slate-400">{agent?.agent_code}</p></Td>
                <Td><span className="text-xs font-semibold">{r.task_type.replace(/_/g, " ")}</span></Td>
                <Td><p className="text-xs">{db.tenants.find((t) => t.id === r.tenant_id)?.name.split(" ")[0]}</p>{app && <p className="text-[10px] text-slate-400">{app.first_name} {app.last_name}</p>}</Td>
                <Td><Badge tone={statusTone(r.status)} dot>{r.status.replace(/_/g, " ")}</Badge>{r.human_wait && <p className="text-[10px] text-amber-600 mt-1">pause: {r.human_wait}</p>}</Td>
                <Td>{ap ? <Link href={`/approvals?id=${ap.id}`} className="text-[11px] font-bold text-indigo-600 hover:underline">{ap.status}</Link> : <span className="text-[11px] text-slate-300">—</span>}</Td>
                <Td><span className="text-[11px] text-slate-500">{dtt(r.started_at || r.created_at)}</span></Td>
                <Td>{r.output_payload ? (
                  <details><summary className="text-[11px] font-bold text-indigo-600 cursor-pointer">view payload</summary>
                    <div className="mt-1.5 max-w-sm"><JsonView data={r.output_payload} /></div>
                  </details>
                ) : <span className="text-[11px] text-slate-300">—</span>}</Td>
              </tr>
            );
          })}
        </Table>
      </Card>
    </div>
  );
}
