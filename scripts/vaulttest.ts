import { liveDb } from "../src/lib/agents";
import { createDossierLink } from "../src/lib/service";
liveDb();
const s = { uid: "u_super", name: "Super", email: "superadmin@example.com", role: "SUPER_ADMIN" as const, tenant_id: null, applicant_id: null };
const r = createDossierLink(s, "a_wvc_1");
console.log(r.url);
