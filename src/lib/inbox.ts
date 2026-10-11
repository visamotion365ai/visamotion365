import type { DB, Applicant } from "./schema";
import { runCompliance } from "./compliance";

// Template-based auto-responder. Rules are bounded, approved templates;
// never promises visa approval. (Production: Base44 slot + approved templates.)
export function autoReply(db: DB, app: Applicant, text: string): string {
  const t = text.toLowerCase();
  const c = runCompliance(db, app);
  const invoice = db.invoices.find((i) => i.applicant_id === app.id && i.status !== "PAID");
  const appt = db.appointments.find((a) => a.applicant_id === app.id && a.status === "CONFIRMED");
  const name = app.first_name;

  if (/(status|stati|আবহাওয়া|হাল কী|কেমন আছে|how is)/.test(t)) {
    return `Hi ${name}, your application is at stage: ${stageLabel(app.application_stage)}. ${c.missing.length ? `Still needed: ${c.missing.join(", ")}.` : "No missing documents — we will update you as soon as the next step is complete."} (Auto-reply — no outcome is guaranteed.)`;
  }
  if (/(document|passport|bank|statement|সনদ|ডকুমেন্ট|পাসপোর্ট|আপলোড)/.test(t)) {
    return `Hi ${name}, ${c.missing.length ? `you still need to upload: ${c.missing.join(", ")}.` : "all required documents are on file."} ${c.pending.length ? `In review: ${c.pending.join(", ")}.` : ""} You can upload from the Documents tab any time. (Auto-reply)`;
  }
  if (/(fee|payment|invoice|amount|মূল্য|খরচ|পরিশোধ|টাকা)/.test(t)) {
    return invoice
      ? `Hi ${name}, invoice ${invoice.number} (${invoice.currency} ${invoice.total.toLocaleString()}) is currently ${invoice.status}. Due date: ${new Date(invoice.due_date).toLocaleDateString("en-GB")}. You can pay from the Payments tab. (Auto-reply)`
      : `Hi ${name}, there is no outstanding invoice right now. Your agency will send an invoice when the service is confirmed. (Auto-reply)`;
  }
  if (/(appointment|slot|biometric|আপয়েন্টমেন্ট|তারিখ)/.test(t)) {
    return appt
      ? `Hi ${name}, your appointment is confirmed for ${appt.date} at ${appt.time}, ${appt.location}. Please arrive 30 minutes early with originals. (Auto-reply)`
      : `Hi ${name}, no appointment is scheduled yet. Our team will book one after the dossier is approved and will confirm here. (Auto-reply)`;
  }
  if (/(approv|reject|guarantee|আসল হবে|নিশ্চিত)/.test(t)) {
    return `Hi ${name}, we cannot guarantee a visa outcome — the decision is made by the embassy. What we do guarantee is a complete, accurate, well-documented application. (Auto-reply)`;
  }
  if (/(hello|hi |hey|স্বাগতম|নমস্কার|assalam)/.test(t)) {
    return `Hi ${name}! How can we help? Ask about your status, documents, fees or appointment. (Auto-reply)`;
  }
  return `Thanks for your message, ${name}. A case officer will follow up shortly. For immediate info you can ask: "status", "documents", "fee" or "appointment". (Auto-reply)`;
}

function stageLabel(stage: string): string {
  const map: Record<string, string> = {
    INTAKE_STARTED: "Intake Started", PASSPORT_CAPTURED: "Passport Captured", DOCUMENTS_UPLOADED: "Documents Uploaded",
    CHECKLIST_COMPLETE: "Checklist Complete", DISPATCH_REQUESTED: "Dispatched to Master review",
    MASTER_REVIEW: "Master Review", DOSSIER_APPROVED: "Dossier Approved", APPROVED_FOR_SUBMISSION: "Approved for Submission",
    LODGED: "Lodged with embassy", UNDER_REVIEW: "Under Review", VISA_ISSUED: "Visa Issued", REJECTED: "Rejected", CLOSED: "Closed"
  };
  return map[stage] || stage;
}
