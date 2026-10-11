import { needStaff } from "@/lib/session";
import { getDb } from "@/lib/db";
import { hasPerm } from "@/lib/policy";
import { PageHeader, Card, CardHead, KV, Badge, Avatar, Callout } from "@/components/ui";
import { ActionForm } from "@/components/forms";
import { updateTenantAction } from "@/app/actions/main";
import { dt } from "@/lib/format";

export default async function AgencySettingsPage() {
  const s = await needStaff();
  const db = getDb();
  const t = db.tenants.find((x) => x.id === s.tenant_id);
  const members = db.organization_members.filter((m) => m.tenant_id === s.tenant_id);
  const canEdit = hasPerm(s, "tenant.update");

  return (
    <div className="fade-up">
      <PageHeader crumb="Agency" title="Agency Settings" sub="Branding and your team. Global system configuration is Master-only (never visible to agencies)." />
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="space-y-4">
          <Card>
            <CardHead title="Agency profile" />
            <div className="px-5 pb-5">
              <KV k="Tenant ID" v={t.id} mono />
              <KV k="Subdomain" v={`${t.subdomain}.vm365.app (demo)`} mono />
              <KV k="Services" v={t.services.join(", ")} />
              <KV k="Countries" v={t.countries.join(", ")} />
              <KV k="Status" v={t.status} />
              <KV k="Created" v={dt(t.created_at)} />
            </div>
          </Card>
          {canEdit ? (
            <Card>
              <CardHead title="Branding" sub="Used on your portal" />
              <div className="px-5 pb-5">
                <ActionForm action={updateTenantAction} submit="Save branding">
                  <input type="hidden" name="tenant_id" value={t.id} />
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Agency name</label>
                      <input name="name" defaultValue={t.name} className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30" /></div>
                    <div><label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Primary color</label>
                      <input name="primary" type="color" defaultValue={t.theme_config.primary} className="w-full h-[42px] rounded-xl border border-slate-200 px-2" /></div>
                  </div>
                </ActionForm>
              </div>
            </Card>
          ) : <Callout tone="info">Branding editing requires the tenant.update permission (Owner / Agency Admin).</Callout>}
        </div>
        <Card>
          <CardHead title="Team members" sub={`${members.length} staff in your tenant`} />
          <div className="px-5 pb-5 space-y-2">
            {members.map((m) => {
              const p = db.profiles.find((x) => x.id === m.user_id);
              return (
                <div key={m.id} className="flex items-center gap-2.5 rounded-xl border border-slate-100 px-3.5 py-2.5">
                  <Avatar name={p?.full_name || "?"} size={30} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{p?.full_name} {m.user_id === s.uid && <span className="text-slate-400">(you)</span>}</p>
                    <p className="text-[10px] text-slate-400 truncate">{p?.email}</p>
                  </div>
                  <Badge tone="indigo">{m.role.replace(/_/g, " ")}</Badge>
                </div>
              );
            })}
          </div>
          <div className="px-5 pb-5 border-t border-slate-100 pt-4 text-[11px] text-slate-400">
            Invitations and role changes are handled by the Master Console (tenant.update). Agencies can never see AI agent controls, API keys, agent prompts or other tenants.
          </div>
        </Card>
      </div>
    </div>
  );
}
