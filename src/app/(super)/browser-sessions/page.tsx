import { needSuper } from "@/lib/session";
import { liveDb, isSimulated } from "@/lib/agents";
import { PageHeader, Card, CardHead, Badge, statusTone, Table, Td, Btn, Callout } from "@/components/ui";
import { ActionForm } from "@/components/forms";
import { stopBrowserAction } from "@/app/actions/main";
import { MonitorPlay, Square, Video, Image as ImageIcon } from "lucide-react";
import { dtt, timeAgo } from "@/lib/format";

export default async function BrowserSessionsPage() {
  const s = await needSuper();
  const db = liveDb();
  const sessions = db.browser_sessions;
  const active = sessions.filter((b) => !["STOPPED", "COMPLETED"].includes(b.status));
  const minutes = sessions.reduce((a, b) => a + b.minutes, 0);

  return (
    <div className="fade-up">
      <PageHeader crumb="AI Operations" title="Browser Use Automation Center"
        sub={isSimulated() ? "SIMULATED mode — set BROWSER_USE_API_KEY (server-side, header X-Browser-Use-API-Key, API V4) to drive real cloud browsers." : "Connected to Browser Use Cloud API V4."}
        right={<Badge tone={active.length ? "amber" : "emerald"} dot>{active.length} active sessions</Badge>} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {[["Active", active.length, "text-amber-600"], ["Waiting human", sessions.filter((b) => b.status.startsWith("WAITING")).length, "text-amber-600"], ["Stopped", sessions.filter((b) => b.status === "STOPPED").length, "text-slate-500"], ["Browser minutes", minutes, "text-indigo-600"]].map(([l, v, c]) => (
          <Card key={l as string} className="p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{l}</p>
            <p className={`text-2xl font-black ${c}`}>{v}</p>
          </Card>
        ))}
      </div>
      <Callout tone="warn">
        <b>Lifecycle rule:</b> disconnecting a CDP connection does NOT stop the managed browser. Every session here is explicitly stopped (auto on completion/expiry, manual below). Unused sessions are reconciled by the worker.
      </Callout>
      <div className="mt-4">
        <Card>
          <Table head={["Session", "Agent / Task", "Tenant", "Status", "Evidence", "Started", "Min", "Action"]}>
            {sessions.map((b) => {
              const run = db.agent_runs.find((r) => r.id === b.agent_run_id);
              const agent = db.ai_agents.find((a) => a.id === run?.agent_id);
              return (
                <tr key={b.id} className="hover:bg-slate-50/60">
                  <Td><span className="font-mono text-[11px] font-bold text-slate-700">{b.external_session_id}</span>{b.simulated && <p className="text-[9px] text-slate-400">simulated</p>}</Td>
                  <Td><p className="text-xs font-semibold">{agent?.name}</p><p className="text-[10px] text-slate-400">{run?.task_type.replace(/_/g, " ")}</p></Td>
                  <Td><span className="text-xs">{db.tenants.find((t) => t.id === b.tenant_id)?.name.split(" ")[0]}</span></Td>
                  <Td><Badge tone={statusTone(b.status)} dot>{b.status.replace(/_/g, " ")}</Badge></Td>
                  <Td>
                    <div className="flex gap-2">
                      <span title={b.recording_url || ""} className="text-slate-400 hover:text-indigo-600 cursor-help"><Video size={14} /></span>
                      <span title={b.screenshot_url || ""} className="text-slate-400 hover:text-indigo-600 cursor-help"><ImageIcon size={14} /></span>
                    </div>
                  </Td>
                  <Td><span className="text-[11px] text-slate-500">{dtt(b.started_at)} <span className="text-slate-300">({timeAgo(b.started_at)})</span></span></Td>
                  <Td><span className="text-xs font-bold">{b.minutes}</span></Td>
                  <Td>
                    {!["STOPPED", "COMPLETED"].includes(b.status) ? (
                      <ActionForm action={stopBrowserAction} hideSubmit>
                        <input type="hidden" name="id" value={b.id} />
                        <button type="submit" className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 text-[11px] font-bold px-2.5 py-1.5 hover:bg-red-100">
                          <Square size={11} /> Stop
                        </button>
                      </ActionForm>
                    ) : <span className="text-[10px] text-slate-300 font-semibold">stopped {b.stopped_at ? dtt(b.stopped_at) : ""}</span>}
                  </Td>
                </tr>
              );
            })}
          </Table>
        </Card>
      </div>
    </div>
  );
}
