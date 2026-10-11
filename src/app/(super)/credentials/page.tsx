import { needSuper } from "@/lib/session";
import { liveDb } from "@/lib/agents";
import { PageHeader, Card, CardHead, Badge, Table, Td, Callout, KV } from "@/components/ui";
import { ActionForm } from "@/components/forms";
import { rotateCredentialAction } from "@/app/actions/main";
import { KeyRound, ShieldCheck, RefreshCw, Lock } from "lucide-react";
import { dt } from "@/lib/format";

export default async function CredentialsPage() {
  await needSuper();
  const db = liveDb();
  const envSet = (ref: string) => {
    const name = ref.replace("env:", "");
    return !!process.env[name];
  };
  const vault = db.credential_vault.map((c) => ({ ...c, live: envSet(c.secret_ref) }));

  return (
    <div className="fade-up">
      <PageHeader crumb="Vault" title="API Key & Automation Vault"
        sub="Only encrypted references live in the database. The actual secrets exist exclusively in server-side environment variables / secret manager." />
      <Callout tone="warn">
        <b>Never</b> expose these keys to the frontend or a public repo. Browser Use uses header <span className="font-mono">X-Browser-Use-API-Key</span> (API V4, no Bearer prefix). Base44 slots are per-agent. Rotate on schedule — rotation updates the ref, the real key changes in your secret manager.
      </Callout>
      <div className="mt-4">
        <Card>
          <Table head={["Provider", "Slot / Secret ref", "Status", "Last rotated", "Action"]}>
            {vault.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50/60">
                <Td>
                  <span className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <span className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center"><KeyRound size={12} /></span>
                    {c.provider}
                  </span>
                </Td>
                <Td>
                  <p className="font-mono text-[11px] font-bold text-slate-700">{c.slot_code}</p>
                  <p className="font-mono text-[10px] text-slate-400">{c.secret_ref}</p>
                </Td>
                <Td>
                  <Badge tone={c.live ? "emerald" : "amber"} dot>
                    {c.live ? "SET (env)" : "MISSING (env) — simulated"}
                  </Badge>
                </Td>
                <Td><span className="text-xs text-slate-500">{dt(c.last_rotated_at)}</span></Td>
                <Td>
                  <ActionForm action={rotateCredentialAction} hideSubmit>
                    <input type="hidden" name="id" value={c.id} />
                    <button type="submit" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 text-[11px] font-bold px-2.5 py-1.5 hover:bg-slate-50">
                      <RefreshCw size={11} /> Rotate ref
                    </button>
                  </ActionForm>
                </Td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>
      <div className="grid md:grid-cols-2 gap-4 mt-4">
        <Card>
          <CardHead title="How secrets are handled" />
          <div className="px-5 pb-5">
            <KV k="Storage" v="env / secret manager only — DB holds refs" />
            <KV k="Passport numbers" v="AES-256-GCM (storage key) + SHA-256 hash" />
            <KV k="Approval tokens" v="HMAC-signed, 15-min, task-bound" />
            <KV k="Vault links (QR)" v="HMAC-signed, 15-min, applicant-bound" />
            <KV k="Logs" v="masked — no passport no / key / OTP in plain text" />
          </div>
        </Card>
        <Card>
          <CardHead title="Usage note" />
          <div className="px-5 pb-5 text-xs text-slate-500 leading-relaxed">
            Browser Use is pay-as-you-go on browser time, traffic and model usage — keys in a project share project capacity. This demo simulates usage (≈$0.10/min) until <span className="font-mono">BROWSER_USE_API_KEY</span> is set server-side. No subscription is required to use the platform.
          </div>
        </Card>
      </div>
    </div>
  );
}
