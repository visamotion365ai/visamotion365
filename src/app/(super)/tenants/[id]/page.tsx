import { notFound } from "next/navigation";
import Link from "next/link";
import { needSuper } from "@/lib/session";
import { liveDb } from "@/lib/agents";
import { tenantStats } from "@/lib/service";
import { PageHeader, Card, CardHead, Badge, statusTone, KV, Table, Td, Avatar, Field, Input, Select, Btn } from "@/components/ui";
import { ActionForm } from "@/components/forms";
import { updateTenantAction, addMemberAction } from "@/app/actions/main";
import { STAGE_LABEL } from "@/lib/schema";
import { dt, dtt } from "@/lib/format";

const ROLES = ["TENANT_OWNER", "AGENCY_ADMIN", "VISA_OFFICER", "DOCUMENT_OFFICER", "COMPLIANCE_OFFICER", "HR_MANAGER", "RECRUITMENT_OFFICER", "MARKETING_OFFICER", "FINANCE_OFFICER", "SUPPORT_OFFICER"];

export default async function TenantDetail({ params }: { params: Promise<{ id: string }> }) {
  const s = await needSuper();
  const { id } = await params;
  const db = liveDb();
  const t = db.tenants.find((x) => x.id === id);
  if (!t) notFound();
  const ts = tenantStats(db, t.id);
  const apps = db.applicants.filter((a) => a.tenant_id === t.id);
  const members = db.organization_members.filter((m) => m.tenant_id === t.id);
  const programs = db.visa_programs.filter((p) => p.tenant_id === t.id);
  const runs = db.agent_runs.filter((r) => r.tenant_id === t.id).slice(0, 6);

  return (
    <div className="fade-up">
      <PageHeader crumb="Tenants" title={t.name} sub={`${t.id} • subdomain ${t.subdomain} • created ${dt(t.created_at)}`}
        right={<Badge tone={statusTone(t.status)} dot>{t.status}</Badge>} />
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHead title="Applicants" sub={`${apps.length} in this tenant`} />
            <div className="px-5 pb-5 space-y-2">
              {apps.map((a) => (
                <Link key={a.id} href={`/applicants/${a.id}`} className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3 hover:border-indigo-200">
                  <div className="flex items-center gap-3">
                    <Avatar name={`${a.first_name} ${a.last_name}`} size={32} />
                    <div>
                      <p className="text-sm font-bold text-slate-800">{a.first_name} {a.last_name}</p>
                      <p className="text-[11px] text-slate-400">{a.target_country} • {dt(a.created_at)}</p>
                    </div>
                  </div>
                  <Badge tone={statusTone(a.application_stage)} dot>{STAGE_LABEL[a.application_stage]}</Badge>
                </Link>
              ))}
            </div>
          </Card>
          <Card>
            <CardHead title="Recent agent activity" />
            <div className="px-5 pb-5 space-y-2">
              {runs.length === 0 && <p className="text-xs text-slate-400">No runs.</p>}
              {runs.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-2.5">
                  <p className="text-xs font-semibold text-slate-700">{db.ai_agents.find((x) => x.id === r.agent_id)?.name} <span className="text-slate-400">• {r.task_type.replace(/_/g, " ")}</span></p>
                  <Badge tone={statusTone(r.status)} dot>{r.status.replace(/_/g, " ")}</Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
        <div className="space-y-4">
          <Card>
            <CardHead title="Stats" />
            <div className="px-5 pb-5">
              <KV k="Applicants" v={ts.applicants} />
              <KV k="In Master queue" v={ts.dispatched} />
              <KV k="Lodged / issued" v={ts.lodged} />
              <KV k="Revenue collected" v={money(ts.revenueCollected, t.id === "t_wvc" ? "BDT" : "USD")} />
              <KV k="Outstanding" v={money(ts.outstanding, t.id === "t_wvc" ? "BDT" : "USD")} />
            </div>
          </Card>
          <Card>
            <CardHead title="Branding" sub="Theme used on the agency portal" />
            <div className="px-5 pb-5">
              <ActionForm action={updateTenantAction} submit="Save branding">
                <input type="hidden" name="tenant_id" value={t.id} />
                <Field label="Agency name"><Input name="name" defaultValue={t.name} /></Field>
                <div className="mt-3"><Field label="Primary color"><Input name="primary" type="color" defaultValue={t.theme_config.primary} /></Field></div>
              </ActionForm>
            </div>
          </Card>
          <Card>
            <CardHead title="Members" sub={`${members.length} staff`} />
            <div className="px-5 pb-5 space-y-2">
              {members.map((m) => {
                const p = db.profiles.find((x) => x.id === m.user_id);
                return (
                  <div key={m.id} className="flex items-center gap-2.5 rounded-xl border border-slate-100 px-3 py-2">
                    <Avatar name={p?.full_name || "?"} size={28} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800 truncate">{p?.full_name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{p?.email}</p>
                    </div>
                    <Badge tone="indigo">{m.role.replace(/_/g, " ")}</Badge>
                  </div>
                );
              })}
            </div>
            <div className="px-5 pb-5 border-t border-slate-100 pt-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Invite member</p>
              <ActionForm action={addMemberAction} submit="Invite">
                <input type="hidden" name="tenant_id" value={t.id} />
                <Input name="full_name" placeholder="Full name" className="mb-2" />
                <Input name="email" placeholder="name@agency.com" className="mb-2" />
                <Select name="role" defaultValue="VISA_OFFICER">{ROLES.map((r) => <option key={r}>{r}</option>)}</Select>
              </ActionForm>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
import { money } from "@/lib/format";
