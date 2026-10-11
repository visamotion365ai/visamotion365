// Country-wise visa workflows (Module 8)

export interface WorkflowStep { title: string; desc: string; actor: "APPLICANT" | "AGENCY" | "MASTER" | "AGENT"; eta: string }

export const COUNTRY_WORKFLOWS: Record<string, WorkflowStep[]> = {
  Australia: [
    { title: "Intake & passport capture", desc: "Profile created, passport OCR + MRZ validated, fields confirmed by applicant.", actor: "APPLICANT", eta: "Day 0" },
    { title: "Document collection & compliance", desc: "All required documents uploaded; compliance matrix scored by Agent 03/04.", actor: "AGENCY", eta: "Day 1–5" },
    { title: "Master dossier review", desc: "Super Admin reviews A4 dossier, OCR audit and missing items; approves or requests correction.", actor: "MASTER", eta: "Day 5–7" },
    { title: "Official form draft (IMMI Online)", desc: "Agent 06 maps applicant JSON to form fields; pauses before payment/declaration for approval.", actor: "AGENT", eta: "Day 7–8" },
    { title: "Biometrics appointment", desc: "Agent 07 monitors VFS availability; booking requires explicit human approval.", actor: "AGENT", eta: "Day 8–12" },
    { title: "Lodgement & status tracking", desc: "Human-approved final submit; Agent 08 tracks status and flags additional-document requests.", actor: "AGENT", eta: "Day 12+" }
  ],
  Turkey: [
    { title: "Intake & passport capture", desc: "Profile + passport OCR with MRZ checksum validation.", actor: "APPLICANT", eta: "Day 0" },
    { title: "Financial & purpose check", desc: "Bank statement period/funds checked (Agent 04); hotel or invitation verified.", actor: "AGENCY", eta: "Day 1–3" },
    { title: "Master dossier review", desc: "Dossier approval at Master Console.", actor: "MASTER", eta: "Day 3–4" },
    { title: "e-Visa form & fee", desc: "Agent 06 drafts e-visa; payment and submission require human approval.", actor: "AGENT", eta: "Day 4–5" },
    { title: "Status tracking", desc: "Agent 08 monitors e-visa status until decision.", actor: "AGENT", eta: "Day 5–8" }
  ],
  Serbia: [
    { title: "Intake & passport capture", desc: "Profile + passport OCR; work permit program selected.", actor: "APPLICANT", eta: "Day 0" },
    { title: "Employer offer & permit registration", desc: "Employer work permit registration verified; contract matched to worker profile.", actor: "AGENCY", eta: "Day 1–7" },
    { title: "Medical + police clearance", desc: "Pre-travel medical and NCTC uploaded; expiry tracked.", actor: "APPLICANT", eta: "Day 3–10" },
    { title: "Master dossier review", desc: "Compliance matrix approved at Master Console.", actor: "MASTER", eta: "Day 10–12" },
    { title: "D-visa appointment & lodgement", desc: "Agent 07 monitors appointment slots; Agent 06 drafts form; final submit is human-approved.", actor: "AGENT", eta: "Day 12–20" },
    { title: "Status tracking", desc: "Agent 08 tracks embassy processing and alerts on delays.", actor: "AGENT", eta: "Day 20+" }
  ],
  Singapore: [
    { title: "Intake & passport capture", desc: "Profile + passport OCR with MRZ validation.", actor: "APPLICANT", eta: "Day 0" },
    { title: "Employer quota / sponsor check", desc: "Work pass: employer quota confirmed. Visit pass: sponsor or self-apply route chosen.", actor: "AGENCY", eta: "Day 1–5" },
    { title: "Master dossier review", desc: "Dossier + compliance approval at Master Console.", actor: "MASTER", eta: "Day 5–7" },
    { title: "Official form & COMPASS assessment", desc: "Agent 06 drafts application; pauses before declaration/payment for approval.", actor: "AGENT", eta: "Day 7–10" },
    { title: "Biometrics (where required)", desc: "Agent 07 monitors ICA appointment availability; booking human-approved.", actor: "AGENT", eta: "Day 10–15" },
    { title: "Status tracking", desc: "Agent 08 tracks approval/objection status.", actor: "AGENT", eta: "Day 15+" }
  ],
  Malaysia: [
    { title: "Job order & employer match", desc: "Recruitment order created; worker matched to employer offer.", actor: "AGENCY", eta: "Day 0" },
    { title: "Intake & passport capture", desc: "Worker profile + passport OCR; NID cross-check.", actor: "APPLICANT", eta: "Day 1–3" },
    { title: "Pre-departure medical", desc: "Pan-Malaysia medical certificate (max 3 months) uploaded and verified.", actor: "APPLICANT", eta: "Day 3–7" },
    { title: "Master dossier review", desc: "Bulk dossier compliance approved at Master Console.", actor: "MASTER", eta: "Day 7–9" },
    { title: "e-Visa application", desc: "Agent 06 drafts e-visa forms per worker; final submit human-approved.", actor: "AGENT", eta: "Day 9–12" },
    { title: "Approval & travel coordination", desc: "Agent 08 tracks approval; travel dates coordinated with employer.", actor: "AGENT", eta: "Day 12–20" }
  ]
};

export const STAGE_TONE: Record<string, string> = {
  INTAKE_STARTED: "slate", PASSPORT_CAPTURED: "indigo", DOCUMENTS_UPLOADED: "indigo",
  CHECKLIST_COMPLETE: "indigo", DISPATCH_REQUESTED: "amber", MASTER_REVIEW: "amber",
  DOSSIER_APPROVED: "violet", APPROVED_FOR_SUBMISSION: "violet", LODGED: "blue",
  UNDER_REVIEW: "blue", VISA_ISSUED: "emerald", REJECTED: "red", CLOSED: "slate"
};
