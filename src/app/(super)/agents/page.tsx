import Link from "next/link";
import { needSuper } from "@/lib/session";
import { liveDb, usageSummary } from "@/lib/agents";
import { PageHeader, Card, Badge, statusTone, Toggle, Progress } from "@/components/ui";
import { Bot, ShieldCheck, Play, Cpu } from "lucide-react";
import { setAgentProductionAction } from "@/app/actions/main";
import { ActionForm } from "@/components/forms";

export default async function AgentsPage() {
  const s = await needSuper();
  const db = liveDb();
  const usage = usageSummary(db);
  return (
    <div className="fade-up">
      <PageHeader crumb="AI Operations" title="10 AI Agent Control Center"
        sub="Each agent is an independent configuration with its own slots, limits, allowed/blocked tools and a production gate. Nothing runs outside dry-run until you enable it."
        right={<Badge tone={db.settings.dry_run ? "indigo" : "red"} dot>{db.settings.dry_run ? "GLOBAL DRY-RUN ON" : "GLOBAL DRY-RUN OFF"}</Badge>} />
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
        {db.ai_agents.map((a) => {
          const u = usage.perAgent.find((x) => x.agent.id === a.id)!;
          const production = db.settings.production_agents[a.id] === true;
          const pendingRuns = db.agent_runs.filter((r) => r.agent_id === a.id && r.status === "WAITING_FOR_APPROVAL").length;
          return (
            <Card key={a.id} className="p-4 flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center shrink-0"><Bot size={16} /></div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{a.agent_code.slice(-2)} • {a.name}</p>
                    <p className="text-[10px] text-slate-400">{a.provider}</p>
                  </div>
                </div>
                <Badge tone={statusTone(a.status)} dot>{a.status}</Badge>
              </div>
              <p className="text-[11px] text-slate-500 mt-2.5 leading-relaxed line-clamp-2">{a.description}</p>
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-medium">Today / limit</span>
                  <span className="font-bold text-slate-700">{u.today}/{a.daily_limit}</span>
                </div>
                <Progress value={(u.today / a.daily_limit) * 100} tone={u.today / a.daily_limit > 0.8 ? "amber" : "indigo"} />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {a.requires_human_approval && <Badge tone="amber" dot><ShieldCheck size={10} /> approval required</Badge>}
                {pendingRuns > 0 && <Badge tone="red">{pendingRuns} waiting</Badge>}
                <Badge tone="slate">{u.total} total runs</Badge>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Production mode</p>
                  <p className="text-[10px] text-slate-400">{production ? "enabled per-tool gate" : "dry-run only"}</p>
                </div>
                <ActionForm action={setAgentProductionAction} hideSubmit className="flex items-center">
                  <input type="hidden" name="agent_id" value={a.id} />
                  <input type="hidden" name="on" value={production ? "0" : "1"} />
                  <Toggle on={production} />
                </ActionForm>
              </div>
              <Link href={`/agents/${a.id}`} className="mt-3 text-center rounded-xl bg-slate-900 text-white text-xs font-bold py-2.5 hover:bg-slate-800">
                Open control panel →
              </Link>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
