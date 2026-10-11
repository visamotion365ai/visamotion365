"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, Card, CardHead, Field, Input, Select, Btn } from "@/components/ui";
import { createApplicantAction } from "@/app/actions/main";

export function NewApplicantForm({ programs }: { programs: { id: string; name: string }[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setErr("");
    const fd = new FormData(e.currentTarget);
    try {
      const r = await createApplicantAction(null, fd);
      if (!r.ok) setErr(r.error || "Failed");
      else router.push(`/agency/applicants/${r.id}`);
    } catch (ex: any) {
      setErr(ex.message || "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fade-up">
      <PageHeader crumb="Applicants" title="New Applicant" sub="Step 1 of intake: basic profile + program. Then capture the passport (OCR) and upload documents." />
      <Card className="max-w-xl">
        <CardHead title="Applicant details" />
        <div className="px-5 pb-5">
          <form onSubmit={submit}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="First name"><Input name="first_name" required placeholder="e.g. Karim" /></Field>
              <Field label="Last name"><Input name="last_name" required placeholder="e.g. Hossain" /></Field>
              <Field label="Nationality"><Input name="nationality" defaultValue="Bangladesh" /></Field>
              <Field label="Date of birth"><Input name="date_of_birth" type="date" /></Field>
              <Field label="Gender">
                <Select name="gender"><option value="">—</option><option>M</option><option>F</option></Select>
              </Field>
              <Field label="Visa program (your tenant)">
                <Select name="visa_program_id" defaultValue={programs[0]?.id}>
                  {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
              </Field>
            </div>
            {err && <p className="mt-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2.5">{err}</p>}
            <div className="mt-4">
              <Btn variant="brand" type="submit" disabled={busy}>{busy ? "Creating…" : "Create applicant → passport step"}</Btn>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}
