import { needStaff } from "@/lib/session";
import { getDb } from "@/lib/db";
import { NewApplicantForm } from "./new-form";

export default async function NewApplicantPage() {
  const s = await needStaff();
  const db = getDb();
  const programs = db.visa_programs.filter((p) => p.tenant_id === s.tenant_id);
  return <NewApplicantForm programs={programs.map((p) => ({ id: p.id, name: p.name }))} />;
}
