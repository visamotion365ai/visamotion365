import { needSuper } from "@/lib/session";
import { liveDb } from "@/lib/agents";
import { PageHeader, Card, CardHead, Toggle, Field, Input, Callout, KV, Badge } from "@/components/ui";
import { ActionForm } from "@/components/forms";
import { updateSettingsAction, setAgentProductionAction } from "@/app/actions/main";
import { ShieldCheck, Zap, HardDrive, Bell } from "lucide-react";

export default async function SettingsPage() {
  const s = await needSuper();
  const db = liveDb();
  const st = db.settings;
  return (
    <div className="fade-up">
      <PageHeader crumb="System" title="System Settings" sub="Global safety switches. Super Admin only. Every change is audit-logged." />
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHead title="Execution mode" sub="The platform default is dry-run: no external side effects." />
          <div className="px-5 pb-5 space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3">
              <div>
                <p className="text-sm font-bold text-slate-900">Global dry-run</p>
                <p className="text-[11px] text-slate-400">OFF only makes sense when per-agent production gates are set carefully.</p>
              </div>
              <ActionForm action={updateSettingsAction} hideSubmit>
                <input type="hidden" name="dry_run" value={st.dry_run ? "0" : "1"} />
                <input type="hidden" name="hard_pause" value={st.hard_pause ? "1" : "0"} />
                <input type="hidden" name="budget" value={st.monthly_budget_usd} />
                <input type="hidden" name="warn_at" value={st.warn_at} />
                <input type="hidden" name="webhook_url" value={st.webhook_url} />
                <Toggle on={st.dry_run} />
              </ActionForm>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3">
              <div>
                <p className="text-sm font-bold text-slate-900">Hard pause (emergency)</p>
                <p className="text-[11px] text-slate-400">Suspends all approval-required agents immediately.</p>
              </div>
              <ActionForm action={updateSettingsAction} hideSubmit>
                <input type="hidden" name="dry_run" value={st.dry_run ? "1" : "0"} />
                <input type="hidden" name="hard_pause" value={st.hard_pause ? "0" : "1"} />
                <input type="hidden" name="budget" value={st.monthly_budget_usd} />
                <input type="hidden" name="warn_at" value={st.warn_at} />
                <input type="hidden" name="webhook_url" value={st.webhook_url} />
                <Toggle on={st.hard_pause} disabled />
              </ActionForm>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Per-agent production gates (requires dry-run OFF to take effect)</p>
              <div className="grid grid-cols-2 gap-2">
                {db.ai_agents.map((a) => (
                  <ActionForm key={a.id} action={setAgentProductionAction} hideSubmit>
                    <input type="hidden" name="agent_id" value={a.id} />
                    <input type="hidden" name="on" value={st.production_agents[a.id] ? "0" : "1"} />
                    <div className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                      <span className="text-[11px] font-semibold text-slate-700 truncate">{a.name}</span>
                      <Toggle on={!!st.production_agents[a.id]} />
                    </div>
                  </ActionForm>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHead title="Cost controls" />
            <div className="px-5 pb-5">
              <ActionForm action={updateSettingsAction} submit="Save cost controls">
                <input type="hidden" name="dry_run" value={st.dry_run ? "1" : "0"} />
                <input type="hidden" name="hard_pause" value={st.hard_pause ? "1" : "0"} />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Monthly budget (USD)"><Input name="budget" type="number" defaultValue={st.monthly_budget_usd} /></Field>
                  <Field label="Warn threshold (0–1)"><Input name="warn_at" type="number" step="0.05" defaultValue={st.warn_at} /></Field>
                </div>
              </ActionForm>
              <div className="mt-3 text-[11px] text-slate-400">Plus: per-agent daily limits, per-task timeout, max retries, max browser minutes, duplicate-task prevention — see Agent Control Center.</div>
            </div>
          </Card>
          <Card>
            <CardHead title="Webhooks & notifications" />
            <div className="px-5 pb-5 space-y-3">
              <ActionForm action={updateSettingsAction} submit="Save webhook URL">
                <input type="hidden" name="dry_run" value={st.dry_run ? "1" : "0"} />
                <input type="hidden" name="hard_pause" value={st.hard_pause ? "1" : "0"} />
                <input type="hidden" name="budget" value={st.monthly_budget_usd} />
                <input type="hidden" name="warn_at" value={st.warn_at} />
                <Field label="Worker webhook URL (HMAC-signed with WEBHOOK_SIGNING_SECRET)">
                  <Input name="webhook_url" defaultValue={st.webhook_url} placeholder="https://your-worker.example/hooks/visamotion" />
                </Field>
              </ActionForm>
              <div className="flex gap-2">
                {(["email", "whatsapp", "sms"] as const).map((ch) => (
                  <Badge key={ch} tone={st.channels[ch] ? "emerald" : "slate"} dot>{ch}{st.channels[ch] ? "" : " (off)"}</Badge>
                ))}
              </div>
              <p className="text-[11px] text-slate-400">Outbound comms use approved templates only and never promise visa approval.</p>
            </div>
          </Card>
          <Card>
            <CardHead title="Data retention & deletion" />
            <div className="px-5 pb-5">
              <KV k="Applicant documents" v={`${st.retention_days_docs} days after case close`} />
              <KV k="Audit logs" v={`${st.retention_days_logs} days`} />
              <KV k="Browser recordings" v="90 days, private storage" />
              <KV k="Passport numbers" v="AES-256-GCM at rest; hash for lookup; masked in UI/logs" />
              <KV k="Deletion" v="On request — cascades documents, recordings, runs; audit entry kept minimal" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
