// Supabase Custom Access Token Auth Hook — injects role / tenant / applicant
// claims into the JWT so RLS policies can be database-backed (client claims are
// NEVER trusted). Deploy: Supabase → Authentication → Hooks → Custom Access Token.

import { createClient } from "@supabase/supabase-js";

export async function handle(event: any, request: Request) {
  const url = new URL(request.url);
  const clientId = url.searchParams.get("client_id");

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const session = await supabase.auth.getSessionById(clientId!);
  const uid = session?.user?.id;

  let tenantId: string | null = null;
  let role: string | null = null;
  let applicantId: string | null = null;

  if (uid) {
    const mem = await supabase
      .from("organization_members")
      .select("tenant_id, role")
      .eq("user_id", uid)
      .eq("is_active", true)
      .maybeSingle();
    if (mem?.data) {
      tenantId = mem.data.tenant_id === "MASTER" ? null : mem.data.tenant_id;
      role = mem.data.role;
    } else {
      const acc = await supabase
        .from("applicant_accounts")
        .select("applicant_id")
        .eq("user_id", uid)
        .maybeSingle();
      if (acc?.data) {
        const app = await supabase.from("applicants").select("id, tenant_id").eq("id", acc.data.applicant_id).maybeSingle();
        if (app?.data) {
          applicantId = app.data.id;
          tenantId = app.data.tenant_id;
          role = "APPLICANT";
        }
      }
    }
  }

  const token = await supabase.auth.customizeAccessToken({
    claims: {
      ...(tenantId && { tenant_id: tenantId }),
      ...(role && { role }),
      ...(applicantId && { applicant_id: applicantId }),
    },
  });

  const jwt = token?.jwt;
  if (!jwt) return new Response("error", { status: 500 });

  return new Response(jwt, {
    headers: { "Content-Type": "text/plain" },
  });
}
