import { notFound } from "next/navigation";
import { needSuper } from "@/lib/session";
import { getDb } from "@/lib/db";
import { ApplicantDetail } from "@/components/applicant-detail";
import { PageHeader, Badge } from "@/components/ui";
import { STAGE_LABEL } from "@/lib/schema";
import { canAccessApplicant } from "@/lib/policy";

export default async function ApplicantPage({ params }: { params: Promise<{ id: string }> }) {
  const s = await needSuper();
  const { id } = await params;
  const db = getDb();
  const app = db.applicants.find((a) => a.id === id);
  if (!app || !canAccessApplicant(s, app)) notFound();
  return (
    <div>
      <PageHeader crumb="Applicants" title={`${app.first_name} ${app.last_name}`} sub={`Ref ${app.id} • ${app.target_country}`} right={<Badge tone="slate" dot>{STAGE_LABEL[app.application_stage]}</Badge>} />
      <ApplicantDetail s={s} applicantId={id} mode="super" />
    </div>
  );
}
