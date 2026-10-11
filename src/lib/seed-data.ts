import type { DB, AiAgent } from "./schema";
import { sha256 } from "./crypto";
import { buildTd3 } from "./mrz";
import { ago, ahead } from "./format";

const PASS_SALT = "vm365-demo-salt";
const pw = (p: string) => sha256(p + PASS_SALT);

function passportFor(f: { surname: string; given: string; number8: string; dob: string; sex: string; expiry: string; personal: string }) {
  const mrz = buildTd3(f);
  const line2 = mrz.line2;
  return {
    surname: f.surname, given: f.given,
    passport_number: line2.slice(0, 9),
    nationality: "Bangladesh",
    dob: `20${f.dob.slice(0, 2)}-${f.dob.slice(2, 4)}-${f.dob.slice(4, 6)}`,
    sex: f.sex, expiry: `20${f.expiry.slice(0, 2)}-${f.expiry.slice(2, 4)}-${f.expiry.slice(4, 6)}`,
    mrz: [mrz.line1, mrz.line2, mrz.line3],
    ocr_engine: "demo-ocr-v1 (MRZ parser: real)",
    ocr_confidence: 0.96,
    verified: false, confirmed_by_applicant: false
  };
}

export function makeSeed(): DB {
  const p1 = passportFor({ surname: "HOSSAIN", given: "KARIM", number8: "BD482913", dob: "880612", sex: "M", expiry: "301104", personal: "880612M99BD1" });
  p1.dob = "1988-06-12"; p1.verified = true; p1.confirmed_by_applicant = true; p1.captured_at = ago(20);
  const p2 = passportFor({ surname: "AKTER", given: "FARHANA", number8: "BD771209", dob: "000223", sex: "F", expiry: "280519", personal: "000223F99BD2" });
  p2.dob = "2000-02-23"; p2.verified = true; p2.confirmed_by_applicant = true; p2.captured_at = ago(12);
  const p3 = passportFor({ surname: "UDDIN", given: "JASHIM", number8: "BD335617", dob: "950930", sex: "M", expiry: "271201", personal: "950930M99BD3" });
  p3.dob = "1995-09-30"; p3.captured_at = ago(5);
  const p4 = passportFor({ surname: "MIA", given: "SUMON", number8: "BD902145", dob: "970108", sex: "M", expiry: "290322", personal: "970108M99BD4" });
  p4.dob = "1997-01-08"; p4.captured_at = ago(1);

  const agents: AiAgent[] = [
    { id: "ag_01", agent_code: "AGENT_01", name: "Lead Hunter", provider: "BASE44+BROWSER_USE", description: "Collects approved lead sources, normalizes, dedupes, scores and classifies leads, drafts follow-ups and consultation tasks.", status: "ACTIVE", system_prompt: "You are Agent 01 (Lead Hunter). Work only with approved sources. Never spam, never guarantee visas, never publish campaigns without approval.", allowed_tools: ["read_leads", "create_lead_draft", "update_lead_status", "create_followup_draft", "create_calendar_draft"], blocked_actions: ["spam", "unapproved_bulk_scraping", "auto_publish", "visa_guarantee", "unapproved_outreach"], requires_human_approval: true, daily_limit: 100, max_retries: 2, created_at: ago(40) },
    { id: "ag_02", agent_code: "AGENT_02", name: "Passport OCR Intake", provider: "BASE44+BROWSER_USE", description: "Reads passport PDF/JPG/PNG, parses MRZ (TD1/TD3), extracts identity fields, detects expiry and quality issues, creates editable profile draft.", status: "ACTIVE", system_prompt: "You are Agent 02 (Passport OCR Intake). Extract fields, validate MRZ checksums, flag low quality. Never mark data verified without human confirmation. Never send passport data to unapproved sites.", allowed_tools: ["read_passport_file", "parse_mrz", "create_profile_draft", "flag_quality_issue"], blocked_actions: ["mark_verified", "send_to_unapproved_site", "alter_document"], requires_human_approval: true, daily_limit: 200, max_retries: 2, created_at: ago(40) },
    { id: "ag_03", agent_code: "AGENT_03", name: "Dossier & Checklist", provider: "BASE44+BROWSER_USE", description: "Selects country/visa checklist, detects missing documents, builds compliance matrix, generates A4 dossier draft and secure QR vault link.", status: "ACTIVE", system_prompt: "You are Agent 03 (Dossier & Checklist). Build checklists from official requirements only. Never mark unverified documents as verified. Never alter or fabricate documents.", allowed_tools: ["read_applicant", "read_documents", "read_visa_requirements", "generate_pdf_draft", "upload_to_private_storage"], blocked_actions: ["mark_unverified_document_as_verified", "alter_document", "create_fake_document", "publish_public_file"], requires_human_approval: true, daily_limit: 150, max_retries: 2, created_at: ago(40) },
    { id: "ag_04", agent_code: "AGENT_04", name: "Document & Financial Consistency", provider: "BASE44+BROWSER_USE", description: "Compares names/dates across documents, checks statement periods and basic arithmetic, flags inconsistencies, produces a human review report.", status: "ACTIVE", system_prompt: "You are Agent 04 (Consistency). Produce review flags only. Never certify financial authenticity. Never alter bank statements. Never guarantee visa success.", allowed_tools: ["read_applicant", "read_documents", "compare_fields", "arithmetic_check", "create_review_report"], blocked_actions: ["certify_authenticity", "alter_bank_statement", "guarantee_outcome"], requires_human_approval: true, daily_limit: 150, max_retries: 2, created_at: ago(40) },
    { id: "ag_05", agent_code: "AGENT_05", name: "SOP & Itinerary Draft", provider: "BASE44+BROWSER_USE", description: "Drafts SOP, cover letter, explanation letter and itinerary from verified facts; flags contradictions for human and applicant review.", status: "ACTIVE", system_prompt: "You are Agent 05 (SOP & Itinerary). Use only genuine information supplied by the applicant or verified partners. No dummy reservations. Mandatory factual review.", allowed_tools: ["read_applicant", "read_documents", "draft_letter", "draft_itinerary", "flag_contradiction"], blocked_actions: ["dummy_reservation", "fabricate_facts", "auto_sign"], requires_human_approval: true, daily_limit: 100, max_retries: 2, created_at: ago(40) },
    { id: "ag_06", agent_code: "AGENT_06", name: "Official Form Assistant", provider: "BASE44+BROWSER_USE", description: "Maps approved applicant JSON to official form fields, fills drafts, saves drafts, captures screenshots, reports missing fields. Mandatory pause before OTP/MFA/CAPTCHA/payment/declaration/final submission.", status: "ACTIVE", system_prompt: "You are Agent 06 (Official Forms). Fill drafts only. ALWAYS stop and create an approval request before OTP, MFA, CAPTCHA, payment, legal declaration or final submission.", allowed_tools: ["map_fields", "fill_draft", "save_draft", "capture_screenshot", "report_missing", "create_approval_request"], blocked_actions: ["final_submission", "payment", "otp_entry", "captcha_solve", "legal_declaration"], requires_human_approval: true, daily_limit: 80, max_retries: 2, created_at: ago(40) },
    { id: "ag_07", agent_code: "AGENT_07", name: "Appointment Monitor", provider: "BASE44+BROWSER_USE", description: "Monitors approved official appointment pages, detects availability, notifies staff, saves date/time evidence. Never bypasses CAPTCHA; never auto-books without approval.", status: "ACTIVE", system_prompt: "You are Agent 07 (Appointment Monitor). Read-only scanning of approved official pages. If CAPTCHA or login appears, pause and request human action. Never auto-book.", allowed_tools: ["scan_appointment_page", "detect_availability", "save_evidence", "notify_staff", "create_approval_request"], blocked_actions: ["bypass_captcha", "auto_book", "abuse_rate_limits"], requires_human_approval: true, daily_limit: 60, max_retries: 2, created_at: ago(40) },
    { id: "ag_08", agent_code: "AGENT_08", name: "Status Tracker", provider: "BASE44+BROWSER_USE", description: "Reads authorized status pages, normalizes status, detects additional-document requests, creates delay alerts, updates internal timeline.", status: "ACTIVE", system_prompt: "You are Agent 08 (Status Tracker). Verify important statuses externally. AI interpretation is never an official decision.", allowed_tools: ["read_status_page", "normalize_status", "detect_ad_request", "create_delay_alert", "update_timeline"], blocked_actions: ["treat_as_official_decision", "alter_status_page"], requires_human_approval: false, daily_limit: 200, max_retries: 3, created_at: ago(40) },
    { id: "ag_09", agent_code: "AGENT_09", name: "Mock Interview Coach", provider: "BASE44", description: "Generates interview practice questions, fact-based answer guidance, detects contradictions, provides Bengali and English practice.", status: "ACTIVE", system_prompt: "You are Agent 09 (Interview Coach). Practice questions only. Never teach deception or fabricated answers. Always ground answers in the verified file.", allowed_tools: ["generate_questions", "answer_guidance", "detect_contradiction", "bilingual_output"], blocked_actions: ["teach_deception", "fabricate_answers"], requires_human_approval: false, daily_limit: 150, max_retries: 1, created_at: ago(40) },
    { id: "ag_10", agent_code: "AGENT_10", name: "Billing & Commission", provider: "BASE44", description: "Drafts invoices, tracks dues, reconciles commission, summarizes revenue, detects duplicate payments, tracks marketing ROI. Never initiates bank transfer/refund/final payment without approval.", status: "ACTIVE", system_prompt: "You are Agent 10 (Billing). Draft and reconcile only. Never initiate bank transfer, refund or final payment without human approval.", allowed_tools: ["draft_invoice", "track_dues", "reconcile_commission", "summarize_revenue", "detect_duplicate_payment"], blocked_actions: ["bank_transfer", "refund", "final_payment"], requires_human_approval: true, daily_limit: 100, max_retries: 2, created_at: ago(40) }
  ];

  const slots = agents.flatMap((a, i) => {
    const n = String(i + 1).padStart(2, "0");
    return [
      { id: `sl_${n}_b`, agent_id: a.id, provider: "BASE44" as const, slot_code: `BASE44_SLOT_${n}`, credential_ref: `env:BASE44_API_KEY_SLOT_${n}`, tenant_scope: [], status: "ACTIVE", concurrency_limit: 2, created_at: ago(40) },
      { id: `sl_${n}_w`, agent_id: a.id, provider: "BROWSER_USE" as const, slot_code: `BROWSER_USE_SLOT_${n}`, credential_ref: "env:BROWSER_USE_API_KEY", tenant_scope: [], status: "ACTIVE", concurrency_limit: 1, created_at: ago(40) }
    ];
  });

  const req = (program: string, docs: [string, boolean, string][]) =>
    docs.map(([t, reqd, ins], i) => ({
      id: `rq_${program}_${i}`, visa_program_id: program, document_type: t,
      is_required: reqd, instructions: ins,
      source_url: "https://www.example.gov (demo reference)", last_verified_at: ago(14)
    }));

  return {
    tenants: [
      { id: "t_wvc", name: "World Vision Consultancy", subdomain: "worldvision", theme_config: { primary: "#4338CA", background: "#FFFFFF" }, services: ["Tourist Visa", "Business Visa", "Student Visa"], countries: ["Australia", "Turkey", "Singapore"], status: "ACTIVE", created_at: ago(60) },
      { id: "t_vfs", name: "VFS Recruitment Agency", subdomain: "vfsrecruitment", theme_config: { primary: "#0F766E", background: "#FFFFFF" }, services: ["Work Permit", "Employment Visa", "Manpower Recruitment"], countries: ["Serbia", "Malaysia", "Singapore"], status: "ACTIVE", created_at: ago(55) }
    ],
    profiles: [
      { id: "u_super", full_name: "Super Admin", email: "superadmin@example.com", password_hash: pw("SuperAdmin123!"), status: "ACTIVE", created_at: ago(60) },
      { id: "u_own_wvc", full_name: "Wahid Chowdhury", email: "owner.wvc@example.com", password_hash: pw("Owner123!"), status: "ACTIVE", created_at: ago(60) },
      { id: "u_own_vfs", full_name: "Farid Hasan", email: "owner.vfs@example.com", password_hash: pw("Owner123!"), status: "ACTIVE", created_at: ago(55) },
      { id: "u_officer_visa", full_name: "Nusrat Jahan", email: "visa.officer@example.com", password_hash: pw("Officer123!"), status: "ACTIVE", created_at: ago(50) },
      { id: "u_officer_doc", full_name: "Mahmudul Karim", email: "document.officer@example.com", password_hash: pw("Officer123!"), status: "ACTIVE", created_at: ago(50) },
      { id: "u_app_demo", full_name: "Karim Hossain", email: "demo.applicant@example.com", password_hash: pw("Applicant123!"), status: "ACTIVE", created_at: ago(20) }
    ],
    organization_members: [
      { id: "m1", tenant_id: "MASTER", user_id: "u_super", role: "SUPER_ADMIN", is_active: true, created_at: ago(60) },
      { id: "m2", tenant_id: "t_wvc", user_id: "u_own_wvc", role: "TENANT_OWNER", is_active: true, created_at: ago(60) },
      { id: "m3", tenant_id: "t_vfs", user_id: "u_own_vfs", role: "TENANT_OWNER", is_active: true, created_at: ago(55) },
      { id: "m4", tenant_id: "t_wvc", user_id: "u_officer_visa", role: "VISA_OFFICER", is_active: true, created_at: ago(50) },
      { id: "m5", tenant_id: "t_wvc", user_id: "u_officer_doc", role: "DOCUMENT_OFFICER", is_active: true, created_at: ago(50) }
    ],
    countries: [
      { id: "c_au", name: "Australia", code: "AU", flag: "🇦🇺", is_active: true },
      { id: "c_tr", name: "Turkey", code: "TR", flag: "🇹", is_active: true },
      { id: "c_rs", name: "Serbia", code: "RS", flag: "🇷🇸", is_active: true },
      { id: "c_sg", name: "Singapore", code: "SG", flag: "🇸🇬", is_active: true },
      { id: "c_my", name: "Malaysia", code: "MY", flag: "🇲", is_active: true }
    ],
    visa_programs: [
      { id: "p_au_tourist", country_id: "c_au", tenant_id: "t_wvc", name: "Australia — Visitor Visa (Tourist)", category: "TOURIST", description: "600 visa, visitor stream. Tourism, visiting family, short business visits.", status: "ACTIVE", created_at: ago(60) },
      { id: "p_au_student", country_id: "c_au", tenant_id: "t_wvc", name: "Australia — Student Visa (500)", category: "STUDENT", description: "Subclass 500 for overseas students of CRICOS courses.", status: "ACTIVE", created_at: ago(60) },
      { id: "p_tr_tourist", country_id: "c_tr", tenant_id: "t_wvc", name: "Turkey — Tourist e-Visa", category: "TOURIST", description: "Short-stay e-visa for tourism, up to 90 days.", status: "ACTIVE", created_at: ago(60) },
      { id: "p_tr_business", country_id: "c_tr", tenant_id: "t_wvc", name: "Turkey — Business e-Visa", category: "BUSINESS", description: "Short-stay e-visa for business meetings and inspections.", status: "ACTIVE", created_at: ago(60) },
      { id: "p_sg_tourist", country_id: "c_sg", tenant_id: "t_wvc", name: "Singapore — Visit Pass (Tourist)", category: "TOURIST", description: "Short-term visit pass, up to 90 days, with sponsor or self-apply.", status: "ACTIVE", created_at: ago(60) },
      { id: "p_rs_work", country_id: "c_rs", tenant_id: "t_vfs", name: "Serbia — Work Permit + Work Visa", category: "WORK_PERMIT", description: "Employment-based work permit and D visa for skilled workers.", status: "ACTIVE", created_at: ago(55) },
      { id: "p_my_work", country_id: "c_my", tenant_id: "t_vfs", name: "Malaysia — Employment Pass / Work Permit", category: "WORK_PERMIT", description: "Employment pass for hired foreign workers, e-visa route.", status: "ACTIVE", created_at: ago(55) },
      { id: "p_sg_work", country_id: "c_sg", tenant_id: "t_vfs", name: "Singapore — Employment Pass", category: "EMPLOYMENT", description: "EP for professionals; employer quota and COMPASS assessment.", status: "ACTIVE", created_at: ago(55) },
      { id: "p_rs_manpower", country_id: "c_rs", tenant_id: "t_vfs", name: "Serbia — Manpower Recruitment (Construction)", category: "MANPOWER", description: "Bulk construction manpower pipeline with employer sponsor.", status: "ACTIVE", created_at: ago(55) },
      { id: "p_my_manpower", country_id: "c_my", tenant_id: "t_vfs", name: "Malaysia — Manpower Recruitment (Factory)", category: "MANPOWER", description: "Factory manpower pipeline with pre-departure medical.", status: "ACTIVE", created_at: ago(55) }
    ],
    visa_requirements: [
      ...req("p_au_tourist", [
        ["PASSPORT", true, "Valid 6+ months beyond travel date, 2 blank pages"],
        ["PHOTOGRAPH", true, "4x6cm white background, taken within 6 months"],
        ["BANK_STATEMENT", true, "Last 6 months, stamped, min balance per guideline"],
        ["EMPLOYMENT_CERTIFICATE", true, "On letterhead, signed, stating position & salary"],
        ["TAX_DOCUMENT", true, "Last 12 months income tax return or TRN"],
        ["TRAVEL_ITINERARY", true, "Day-wise plan with city and dates"],
        ["TRAVEL_INSURANCE", true, "Coverage for full stay, medical 30k AUD+"],
        ["INVITATION", false, "If visiting family/friends in Australia"]
      ]),
      ...req("p_au_student", [
        ["PASSPORT", true, "Valid for full course + 6 months"],
        ["PHOTOGRAPH", true, "4x6cm white background"],
        ["BANK_STATEMENT", true, "Sponsor account, 6 months, proof of tuition funds"],
        ["EDUCATIONAL_CERTIFICATE", true, "HSC/degree certificates + transcripts"],
        ["SOP", true, "Statement of Purpose signed by applicant"],
        ["INVITATION", true, "Letter of Offer (CoE) from CRICOS provider"],
        ["TRAVEL_INSURANCE", true, "OSHC-compliant coverage"]
      ]),
      ...req("p_tr_tourist", [
        ["PASSPORT", true, "Valid 180+ days"],
        ["PHOTOGRAPH", true, "Biometric 5x6cm"],
        ["BANK_STATEMENT", true, "Last 3 months, sufficient funds"],
        ["EMPLOYMENT_CERTIFICATE", true, "Proof of employment / leave letter"],
        ["HOTEL_BOOKING", true, "Confirmed booking for full stay"],
        ["TRAVEL_INSURANCE", false, "Recommended"]
      ]),
      ...req("p_tr_business", [
        ["PASSPORT", true, "Valid 180+ days"],
        ["PHOTOGRAPH", true, "Biometric 5x6cm"],
        ["INVITATION", true, "Formal invitation from Turkish company"],
        ["BANK_STATEMENT", true, "Last 3 months"],
        ["EMPLOYMENT_CERTIFICATE", true, "Letter from home employer"],
        ["BUSINESS_LICENSE", true, "Home company trade license"]
      ]),
      ...req("p_sg_tourist", [
        ["PASSPORT", true, "Valid 6+ months"],
        ["PHOTOGRAPH", true, "3.5x4.5cm white background"],
        ["BANK_STATEMENT", true, "Last 6 months, stable balance"],
        ["EMPLOYMENT_CERTIFICATE", true, "Signed, on letterhead"],
        ["FLIGHT_BOOKING", true, "Return flight reservation"],
        ["TRAVEL_INSURANCE", true, "Medical coverage for stay"]
      ]),
      ...req("p_rs_work", [
        ["PASSPORT", true, "Valid 18+ months for work stay"],
        ["PHOTOGRAPH", true, "Biometric 3.5x4.5cm"],
        ["EMPLOYMENT_CONTRACT", true, "Signed contract in Serbian or English"],
        ["EDUCATIONAL_CERTIFICATE", true, "Degree/certificates, attested"],
        ["MEDICAL_CERTIFICATE", true, "Chest X-ray + general, max 6 months old"],
        ["POLICE_CLEARANCE", true, "NCTC clearance, max 3 months old"],
        ["EMPLOYER_LICENSE", true, "Employer's work permit registration"]
      ]),
      ...req("p_my_work", [
        ["PASSPORT", true, "Valid 18+ months"],
        ["PHOTOGRAPH", true, "2x2 inch white background"],
        ["EMPLOYMENT_CONTRACT", true, "Signed with Malaysian employer"],
        ["MEDICAL_CERTIFICATE", true, "Pan-Malaysia medical, max 3 months"],
        ["EDUCATIONAL_CERTIFICATE", true, "Highest qualification"],
        ["POLICE_CLEARANCE", true, "NCTC, max 3 months"]
      ]),
      ...req("p_sg_work", [
        ["PASSPORT", true, "Valid 6+ months"],
        ["PHOTOGRAPH", true, "Digital 35x45mm"],
        ["EMPLOYMENT_CONTRACT", true, "Offer letter with salary details"],
        ["EDUCATIONAL_CERTIFICATE", true, "Degree verified"],
        ["INSURANCE", true, "Medical insurance for family (if applicable)"],
        ["EMPLOYER_LICENSE", true, "Employer quota confirmation (EP quota)"]
      ]),
      ...req("p_rs_manpower", [
        ["PASSPORT", true, "Valid 18+ months"],
        ["PHOTOGRAPH", true, "Biometric 3.5x4.5cm"],
        ["EMPLOYMENT_CONTRACT", true, "Bulk contract via employer"],
        ["MEDICAL_CERTIFICATE", true, "General + X-ray"],
        ["POLICE_CLEARANCE", true, "NCTC, max 3 months"]
      ]),
      ...req("p_my_manpower", [
        ["PASSPORT", true, "Valid 18+ months"],
        ["PHOTOGRAPH", true, "2x2 inch white background"],
        ["EMPLOYMENT_CONTRACT", true, "Bulk contract via employer"],
        ["MEDICAL_CERTIFICATE", true, "Pan-Malaysia medical"],
        ["POLICE_CLEARANCE", true, "NCTC, max 3 months"],
        ["EDUCATIONAL_CERTIFICATE", false, "SSC minimum for factory roles"]
      ])
    ],
    applicants: [
      {
        id: "a_wvc_1", tenant_id: "t_wvc", account_user_id: "u_app_demo",
        first_name: "Karim", last_name: "Hossain", nationality: "Bangladesh",
        date_of_birth: "1988-06-12", gender: "M",
        passport_number_encrypted: "", passport_number_hash: "",
        passport_expiry: "2030-11-04", target_country: "Singapore",
        visa_program_id: "p_sg_tourist", application_stage: "CHECKLIST_COMPLETE", status: "ACTIVE",
        passport_data: p1, dossier_version: "v1.0.2", feedback_note: "Bank statement pending review. Employment certificate still missing.",
        created_at: ago(20), updated_at: ago(1, 3)
      },
      {
        id: "a_wvc_2", tenant_id: "t_wvc",
        first_name: "Farhana", last_name: "Akter", nationality: "Bangladesh",
        date_of_birth: "2000-02-23", gender: "F",
        passport_number_encrypted: "", passport_number_hash: "",
        passport_expiry: "2028-05-19", target_country: "Australia",
        visa_program_id: "p_au_student", application_stage: "DISPATCH_REQUESTED", status: "ACTIVE",
        passport_data: p2, created_at: ago(12), updated_at: ago(0, 5)
      },
      {
        id: "a_vfs_1", tenant_id: "t_vfs",
        first_name: "Jashim", last_name: "Uddin", nationality: "Bangladesh",
        date_of_birth: "1995-09-30", gender: "M",
        passport_number_encrypted: "", passport_number_hash: "",
        passport_expiry: "2027-12-01", target_country: "Malaysia",
        visa_program_id: "p_my_work", application_stage: "APPROVED_FOR_SUBMISSION", status: "ACTIVE",
        passport_data: p3, created_at: ago(30), updated_at: ago(0, 2)
      },
      {
        id: "a_vfs_2", tenant_id: "t_vfs",
        first_name: "Sumon", last_name: "Mia", nationality: "Bangladesh",
        date_of_birth: "1997-01-08", gender: "M",
        passport_number_encrypted: "", passport_number_hash: "",
        passport_expiry: "2029-03-22", target_country: "Serbia",
        visa_program_id: "p_rs_work", application_stage: "PASSPORT_CAPTURED", status: "ACTIVE",
        passport_data: p4, created_at: ago(2), updated_at: ago(0, 6)
      }
    ],
    applicant_accounts: [
      { id: "acc_1", applicant_id: "a_wvc_1", user_id: "u_app_demo", invitation_status: "ACCEPTED", email_verified: true, created_at: ago(20) }
    ],
    client_documents: [
      { id: "d_1", tenant_id: "t_wvc", applicant_id: "a_wvc_1", document_type: "PASSPORT", storage_path: "uploads/demo_passport_a_wvc_1.jpg", file_name: "passport_front.jpg", mime_type: "image/jpeg", file_size: 482133, verification_status: "VERIFIED", extracted_data: { name: "KARIM HOSSAIN", number: p1.passport_number, dob: "1988-06-12", expiry: "2030-11-04" }, version: 1, uploaded_by: "u_officer_doc", uploaded_at: ago(20) },
      { id: "d_2", tenant_id: "t_wvc", applicant_id: "a_wvc_1", document_type: "PHOTOGRAPH", storage_path: "uploads/demo_photo_a_wvc_1.jpg", file_name: "photo.jpg", mime_type: "image/jpeg", file_size: 132400, verification_status: "VERIFIED", extracted_data: {}, version: 1, uploaded_by: "u_officer_doc", uploaded_at: ago(19) },
      { id: "d_3", tenant_id: "t_wvc", applicant_id: "a_wvc_1", document_type: "NATIONAL_ID", storage_path: "uploads/demo_nid_a_wvc_1.jpg", file_name: "nid.jpg", mime_type: "image/jpeg", file_size: 210233, verification_status: "VERIFIED", extracted_data: { name: "KARIM HOSSAIN" }, version: 1, uploaded_by: "u_officer_doc", uploaded_at: ago(19) },
      { id: "d_4", tenant_id: "t_wvc", applicant_id: "a_wvc_1", document_type: "BANK_STATEMENT", storage_path: "uploads/demo_bank_a_wvc_1.pdf", file_name: "bank_6m.pdf", mime_type: "application/pdf", file_size: 911233, verification_status: "PENDING_REVIEW", extracted_data: { name: "KARIM HOSSAIN", period_months: 6, opening: 118400, closing: 132950, deposits: 152000, withdrawals: 137450 }, version: 1, uploaded_by: "u_officer_doc", uploaded_at: ago(2) },
      { id: "d_5", tenant_id: "t_wvc", applicant_id: "a_wvc_2", document_type: "PASSPORT", storage_path: "uploads/demo_passport_a_wvc_2.jpg", file_name: "passport_front.jpg", mime_type: "image/jpeg", file_size: 455233, verification_status: "VERIFIED", extracted_data: { name: "FARHANA AKTER", number: p2.passport_number, expiry: "2028-05-19" }, version: 1, uploaded_by: "u_officer_visa", uploaded_at: ago(12) },
      { id: "d_6", tenant_id: "t_wvc", applicant_id: "a_wvc_2", document_type: "EDUCATIONAL_CERTIFICATE", storage_path: "uploads/demo_edu_a_wvc_2.pdf", file_name: "degree.pdf", mime_type: "application/pdf", file_size: 380211, verification_status: "VERIFIED", extracted_data: { name: "FARHANA AKTER" }, version: 1, uploaded_by: "u_officer_visa", uploaded_at: ago(11) },
      { id: "d_7", tenant_id: "t_wvc", applicant_id: "a_wvc_2", document_type: "SOP", storage_path: "uploads/demo_sop_a_wvc_2.pdf", file_name: "sop_draft_v3.pdf", mime_type: "application/pdf", file_size: 122001, verification_status: "PENDING_REVIEW", extracted_data: {}, version: 3, uploaded_by: "u_officer_visa", uploaded_at: ago(1) },
      { id: "d_8", tenant_id: "t_vfs", applicant_id: "a_vfs_1", document_type: "PASSPORT", storage_path: "uploads/demo_passport_a_vfs_1.jpg", file_name: "passport_front.jpg", mime_type: "image/jpeg", file_size: 471222, verification_status: "PENDING_REVIEW", extracted_data: { name: "JASHIM UDDIN", expiry: "2027-12-01" }, version: 1, uploaded_by: "u_own_vfs", uploaded_at: ago(5) },
      { id: "d_9", tenant_id: "t_vfs", applicant_id: "a_vfs_1", document_type: "EMPLOYMENT_CONTRACT", storage_path: "uploads/demo_contract_a_vfs_1.pdf", file_name: "contract_klfoods.pdf", mime_type: "application/pdf", file_size: 240122, verification_status: "PENDING_REVIEW", extracted_data: { name: "JASHIM UDDIN", employer: "KL Foods Sdn Bhd", role: "Production Assistant" }, version: 1, uploaded_by: "u_own_vfs", uploaded_at: ago(4) },
      { id: "d_10", tenant_id: "t_vfs", applicant_id: "a_vfs_1", document_type: "EDUCATIONAL_CERTIFICATE", storage_path: "uploads/demo_edu_a_vfs_1.pdf", file_name: "diploma.pdf", mime_type: "application/pdf", file_size: 298001, verification_status: "VERIFIED", extracted_data: { name: "JASHIM UDDIN" }, version: 1, uploaded_by: "u_own_vfs", uploaded_at: ago(9) },
      { id: "d_11", tenant_id: "t_vfs", applicant_id: "a_vfs_2", document_type: "PASSPORT", storage_path: "uploads/demo_passport_a_vfs_2.jpg", file_name: "passport_front.jpg", mime_type: "image/jpeg", file_size: 402111, verification_status: "OCR_PROCESSING", extracted_data: {}, version: 1, uploaded_by: "u_own_vfs", uploaded_at: ago(0, 4) }
    ],
    master_dispatch_requests: [
      { id: "dr_1", tenant_id: "t_wvc", applicant_id: "a_wvc_2", request_type: "DOSSIER_REVIEW", submitted_by: "u_officer_visa", priority: "HIGH", status: "PENDING_MASTER_REVIEW", agency_note: "Student visa, CoE in hand. Need dossier approval and appointment scan before 14 Oct biometrics window.", submitted_at: ago(0, 5) },
      { id: "dr_2", tenant_id: "t_vfs", applicant_id: "a_vfs_1", request_type: "FINAL_SUBMISSION", submitted_by: "u_own_vfs", priority: "HIGH", status: "PENDING_MASTER_REVIEW", agency_note: "All documents verified by us. Requesting approval to lodge Malaysia e-visa form (Agent 06 draft ready).", submitted_at: ago(0, 2) }
    ],
    approval_requests: [
      { id: "ap_1", tenant_id: "t_wvc", applicant_id: "a_wvc_1", agent_run_id: "run_2", agent_code: "AGENT_03", action_type: "DOSSIER_APPROVE", action_payload: { dossier_version: "v1.0.2", missing_docs: 3, compliance_score: 68 }, requested_by: "u_officer_doc", approved_by: "u_super", status: "APPROVED", expires_at: ahead(20), approved_at: ago(2), note: "Approved with missing-doc tracking.", created_at: ago(2, 3) },
      { id: "ap_2", tenant_id: "t_wvc", applicant_id: "a_wvc_2", agent_run_id: "run_3", agent_code: "AGENT_07", action_type: "APPOINTMENT_BOOKING", action_payload: { target_system: "VFS Global appointment portal (approved list)", slot: { date: "2026-10-14", time: "10:30", center: "VFS Global Dhaka" }, risks: ["Portal may enforce CAPTCHA — will pause", "Slot subject to change"], confidence: 0.88 }, requested_by: "u_super", status: "PENDING", expires_at: ahead(0), created_at: ago(0, 1) },
      { id: "ap_3", tenant_id: "t_vfs", applicant_id: "a_vfs_1", agent_run_id: "run_4", agent_code: "AGENT_06", action_type: "FINAL_SUBMIT", action_payload: { target_system: "Malaysia e-Visa portal", fields_filled: 12, docs_to_upload: 4, payment_amount: "45 USD (visa fee)", risks: ["IRREVERSIBLE once submitted", "Payment must be re-confirmed", "Portal login may require OTP"], confidence: 0.91 }, requested_by: "u_super", status: "PENDING", expires_at: ahead(0), created_at: ago(0, 0.5) }
    ],
    ai_agents: agents,
    agent_slots: slots,
    agent_runs: [
      { id: "run_1", agent_id: "ag_02", slot_id: "sl_02_b", tenant_id: "t_wvc", applicant_id: "a_wvc_1", task_type: "PASSPORT_OCR", input_payload: { file: "passport_front.jpg" }, output_payload: { confidence: 0.96, mrz_valid: true, checksums_ok: ["L1", "L2", "L3"], fields: { surname: "HOSSAIN", given: "KARIM", passport_number: p1.passport_number, dob: "1988-06-12", expiry: "2030-11-04" }, needs_confirmation: false, dry_run: true }, status: "COMPLETED", retry_count: 0, needs_approval: false, started_at: ago(20), completed_at: ago(20, -0.02) ?? ago(20), created_at: ago(20) },
      { id: "run_2", agent_id: "ag_03", slot_id: "sl_03_b", tenant_id: "t_wvc", applicant_id: "a_wvc_1", task_type: "DOSSIER_CHECKLIST", input_payload: { program: "p_sg_tourist" }, output_payload: { compliance_score: 68, missing: ["EMPLOYMENT_CERTIFICATE", "FLIGHT_BOOKING", "TRAVEL_INSURANCE"], verified: ["PASSPORT", "PHOTOGRAPH", "NATIONAL_ID", "BANK_STATEMENT (pending)"], dossier_version: "v1.0.2", qr_vault: "generated (authenticated, 15-min expiry)", dry_run: true }, status: "COMPLETED", retry_count: 0, needs_approval: true, approval_id: "ap_1", started_at: ago(2), completed_at: ago(1, 23), created_at: ago(2) },
      { id: "run_3", agent_id: "ag_07", slot_id: "sl_07_w", tenant_id: "t_wvc", applicant_id: "a_wvc_2", task_type: "APPOINTMENT_SCAN", input_payload: { portal: "VFS Global Dhaka — Australia Student", window_days: 14 }, output_payload: { slots_found: [{ date: "2026-10-14", time: "10:30" }, { date: "2026-10-16", time: "09:00" }, { date: "2026-10-19", time: "14:30" }], evidence: "screenshot saved (simulated)", paused_at: "AWAITING_HUMAN_BOOKING_APPROVAL", dry_run: true }, status: "WAITING_FOR_APPROVAL", retry_count: 0, needs_approval: true, approval_id: "ap_2", human_wait: "AWAITING_HUMAN_BOOKING_APPROVAL", started_at: ago(0, 1), created_at: ago(0, 1) },
      { id: "run_4", agent_id: "ag_06", slot_id: "sl_06_w", tenant_id: "t_vfs", applicant_id: "a_vfs_1", task_type: "OFFICIAL_FORM_DRAFT", input_payload: { form: "Malaysia e-Visa Form", draft_only: true }, output_payload: { form: "Malaysia e-Visa Form", fields_total: 14, fields_filled: 12, missing_fields: ["Emergency contact", "Spouse details (optional)"], draft_saved: true, screenshot: "form_draft_p1 (simulated)", paused_at: "OTP / FINAL SUBMISSION — APPROVAL REQUIRED", dry_run: true }, status: "WAITING_FOR_APPROVAL", retry_count: 0, needs_approval: true, approval_id: "ap_3", human_wait: "OTP", started_at: ago(0, 0.5), created_at: ago(0, 0.5) },
      { id: "run_5", agent_id: "ag_10", slot_id: "sl_10_b", tenant_id: "t_vfs", task_type: "BILLING_RECON", input_payload: { period: "MTD" }, output_payload: { invoices_reconciled: 2, duplicate_payments: 0, commission: { orders: 2, expected_usd: 312, collected_usd: 192, pending_usd: 120 }, revenue_mtd_usd: 450, dry_run: true }, status: "COMPLETED", retry_count: 0, needs_approval: false, started_at: ago(1), completed_at: ago(0, 23), created_at: ago(1) },
      { id: "run_6", agent_id: "ag_01", slot_id: "sl_01_b", tenant_id: "t_wvc", task_type: "LEAD_SWEEP", input_payload: { sources: ["FB ADS", "GOOGLE", "REFERRAL"] }, output_payload: { leads_processed: 9, duplicates_removed: 2, new_leads: 3, scored: [{ name: "R. Ahmed", score: 82, country: "Singapore", purpose: "TOURIST" }, { name: "S. Begum", score: 74, country: "Australia", purpose: "STUDENT" }, { name: "M. Khan", score: 61, country: "Turkey", purpose: "BUSINESS" }], followups_drafted: 3, dry_run: true }, status: "COMPLETED", retry_count: 0, needs_approval: false, started_at: ago(2), completed_at: ago(1, 23), created_at: ago(2) }
    ],
    browser_sessions: [
      { id: "bs_1", agent_run_id: "run_1", tenant_id: "t_wvc", external_session_id: "bsc_9f21c0aa", status: "STOPPED", recording_url: "recordings/bs_1 (simulated)", screenshot_url: "evidence/passport_crop (simulated)", simulated: true, minutes: 2, started_at: ago(20), stopped_at: ago(20, -0.02) ?? ago(19) },
      { id: "bs_2", agent_run_id: "run_2", tenant_id: "t_wvc", external_session_id: "bsc_77b1d2e0", status: "STOPPED", recording_url: "recordings/bs_2 (simulated)", simulated: true, minutes: 1, started_at: ago(2), stopped_at: ago(1, 23) },
      { id: "bs_3", agent_run_id: "run_3", tenant_id: "t_wvc", external_session_id: "bsc_c4e8f112", status: "WAITING_FOR_APPROVAL", recording_url: "recordings/bs_3 (live)", simulated: true, minutes: 4, started_at: ago(0, 1) },
      { id: "bs_4", agent_run_id: "run_4", tenant_id: "t_vfs", external_session_id: "bsc_a1029b34", status: "WAITING_FOR_OTP", recording_url: "recordings/bs_4 (live)", simulated: true, minutes: 2, started_at: ago(0, 0.5) },
      { id: "bs_5", agent_run_id: "run_5", tenant_id: "t_vfs", external_session_id: "bsc_5d6e7f80", status: "STOPPED", recording_url: "recordings/bs_5 (simulated)", simulated: true, minutes: 3, started_at: ago(1), stopped_at: ago(0, 23) }
    ],
    audit_logs: [
      { id: "aud_seed_3", actor_user_id: "u_officer_doc", actor_type: "USER", tenant_id: "t_wvc", action: "DOCUMENT.VERIFIED", resource_type: "client_document", resource_id: "d_1", metadata: { doc: "PASSPORT" }, created_at: ago(20) },
      { id: "aud_seed_2", actor_user_id: "u_super", actor_type: "USER", tenant_id: "t_wvc", action: "APPROVAL.APPROVED", resource_type: "approval_request", resource_id: "ap_1", metadata: { action_type: "DOSSIER_APPROVE" }, created_at: ago(2) },
      { id: "aud_seed_1", actor_user_id: "system", actor_type: "SYSTEM", tenant_id: null, action: "SYSTEM.SEED", metadata: { tenants: 2, applicants: 4 }, created_at: ago(0, 0.1) }
    ],
    conversations: [
      { id: "cv_1", tenant_id: "t_wvc", applicant_id: "a_wvc_1", channel: "WHATSAPP", auto_responder: true, created_at: ago(15) },
      { id: "cv_2", tenant_id: "t_vfs", applicant_id: "a_vfs_1", channel: "WHATSAPP", auto_responder: true, created_at: ago(10) }
    ],
    messages: [
      { id: "msg_1", conversation_id: "cv_1", sender: "APPLICANT", sender_name: "Karim Hossain", body: "Hi, I uploaded my passport and bank statement. What should I do next?", created_at: ago(2, 4) },
      { id: "msg_2", conversation_id: "cv_1", sender: "AUTO", sender_name: "VisaMotion Auto-Responder", body: "Thanks Karim! Your passport is verified. Still pending: Employment Certificate, Flight Booking, Travel Insurance. Once uploaded we will run the compliance check and generate your A4 dossier. (Auto-reply — no visa outcome is guaranteed.)", created_at: ago(2, 3.9) },
      { id: "msg_3", conversation_id: "cv_1", sender: "STAFF", sender_name: "Nusrat Jahan (WVC)", body: "Great progress, Karim. Please also send your income tax certificate for the last 12 months.", created_at: ago(1, 5) },
      { id: "msg_4", conversation_id: "cv_2", sender: "APPLICANT", sender_name: "Jashim Uddin", body: "When will my medical certificate be checked?", created_at: ago(3, 2) },
      { id: "msg_5", conversation_id: "cv_2", sender: "AUTO", sender_name: "VisaMotion Auto-Responder", body: "Your medical certificate is not uploaded yet, Jashim. Please upload it (max 3 months old) from the Documents tab. Our document officer will review within 48h. (Auto-reply)", created_at: ago(3, 1.9) }
    ],
    notifications: [
      { id: "n_1", tenant_id: "t_wvc", user_id: null, applicant_id: "a_wvc_1", type: "DOC_MISSING", title: "Missing documents", body: "Karim Hossain (Singapore Tourist): Employment Certificate, Flight Booking, Travel Insurance still missing.", read: false, created_at: ago(1) },
      { id: "n_2", tenant_id: null, user_id: "u_super", applicant_id: "a_vfs_1", type: "APPROVAL_NEEDED", title: "Approval needed: FINAL_SUBMIT", body: "VFS Recruitment — Jashim Uddin, Malaysia e-Visa. Agent 06 draft ready. Irreversible action — review before approving.", read: false, created_at: ago(0, 0.5) },
      { id: "n_3", tenant_id: "t_wvc", user_id: "u_super", applicant_id: "a_wvc_2", type: "APPOINTMENT", title: "Appointment slots found", body: "VFS Dhaka (Australia Student): 3 slots available 14–19 Oct. Booking requires your approval.", read: false, created_at: ago(0, 1) },
      { id: "n_4", tenant_id: "t_wvc", user_id: null, applicant_id: "a_wvc_1", type: "PAYMENT_DUE", title: "Payment due", body: "Karim Hossain: ৳10,000 balance on invoice INV-WVC-0001 due in 6 days.", read: true, created_at: ago(2) },
      { id: "n_5", tenant_id: "t_vfs", user_id: null, applicant_id: "a_vfs_1", type: "CASE_CHANGED", title: "Stage updated", body: "Jashim Uddin moved to APPROVED FOR SUBMISSION (Master review passed).", read: false, created_at: ago(0, 3) },
      { id: "n_6", tenant_id: "t_wvc", user_id: "u_super", applicant_id: "a_wvc_1", type: "AGENT_COMPLETED", title: "Agent 03 completed", body: "Dossier v1.0.2 generated for Karim Hossain. Compliance score 68/100.", read: true, created_at: ago(2) }
    ],
    invoices: [
      { id: "inv_1", tenant_id: "t_wvc", applicant_id: "a_wvc_1", number: "INV-WVC-0001", items: [{ desc: "Singapore Tourist Visa — service fee", amount: 18000 }, { desc: "Government & e-stamp fees", amount: 7000 }], total: 25000, currency: "BDT", status: "SENT", issue_date: ago(15), due_date: ahead(6) },
      { id: "inv_2", tenant_id: "t_vfs", applicant_id: "a_vfs_1", number: "INV-VFS-0001", items: [{ desc: "Malaysia Work Permit — processing", amount: 300 }, { desc: "Medical & NCTC handling", amount: 150 }], total: 450, currency: "USD", status: "PAID", issue_date: ago(20), due_date: ago(5) },
      { id: "inv_3", tenant_id: "t_vfs", applicant_id: "a_vfs_2", number: "INV-VFS-0002", items: [{ desc: "Serbia Work Permit — processing (advance)", amount: 300 }], total: 300, currency: "USD", status: "DRAFT", issue_date: ago(1), due_date: ahead(14) }
    ],
    payments: [
      { id: "pay_1", tenant_id: "t_wvc", applicant_id: "a_wvc_1", invoice_id: "inv_1", amount: 15000, currency: "BDT", method: "bKash (demo)", status: "PAID", reference: "BK-88121-DEMO", paid_at: ago(14), created_at: ago(14) },
      { id: "pay_2", tenant_id: "t_vfs", applicant_id: "a_vfs_1", invoice_id: "inv_2", amount: 450, currency: "USD", method: "Bank transfer (demo)", status: "PAID", reference: "TT-2201-DEMO", paid_at: ago(6), created_at: ago(6) }
    ],
    credential_vault: [
      { id: "cv_c1", provider: "BROWSER_USE", slot_code: "BROWSER_USE_API_KEY", secret_ref: "env:BROWSER_USE_API_KEY", status: "MISSING", last_rotated_at: ago(60), created_at: ago(60) },
      ...Array.from({ length: 10 }, (_, i) => ({
        id: `cv_c${i + 2}`, provider: "BASE44", slot_code: `BASE44_API_KEY_SLOT_0${i + 1}`,
        secret_ref: `env:BASE44_API_KEY_SLOT_0${i + 1}`, status: "MISSING", last_rotated_at: ago(60), created_at: ago(60)
      })),
      { id: "cv_c12", provider: "SYSTEM", slot_code: "STORAGE_ENCRYPTION_KEY", secret_ref: "env:STORAGE_ENCRYPTION_KEY", status: "SET", last_rotated_at: ago(60), created_at: ago(60) },
      { id: "cv_c13", provider: "SYSTEM", slot_code: "APPROVAL_SIGNING_SECRET", secret_ref: "env:APPROVAL_SIGNING_SECRET", status: "SET", last_rotated_at: ago(60), created_at: ago(60) },
      { id: "cv_c14", provider: "SYSTEM", slot_code: "WEBHOOK_SIGNING_SECRET", secret_ref: "env:WEBHOOK_SIGNING_SECRET", status: "SET", last_rotated_at: ago(60), created_at: ago(60) }
    ],
    leads: [
      { id: "ld_1", tenant_id: "t_wvc", source: "FB ADS", name: "R. Ahmed", phone: "+880 17xx-xxxx01", email: "r.ahmed@example.com", country: "Singapore", purpose: "TOURIST", score: 82, status: "CONSULTATION", created_at: ago(2) },
      { id: "ld_2", tenant_id: "t_wvc", source: "GOOGLE", name: "S. Begum", phone: "+880 18xx-xxxx02", email: "s.begum@example.com", country: "Australia", purpose: "STUDENT", score: 74, status: "NEW", created_at: ago(2) },
      { id: "ld_3", tenant_id: "t_wvc", source: "REFERRAL", name: "M. Khan", phone: "+880 19xx-xxxx03", country: "Turkey", purpose: "BUSINESS", score: 61, status: "CONTACTED", created_at: ago(2) },
      { id: "ld_4", tenant_id: "t_vfs", source: "WALK-IN", name: "A. Islam", phone: "+880 16xx-xxxx04", country: "Malaysia", purpose: "WORK", score: 68, status: "NEW", created_at: ago(4) },
      { id: "ld_5", tenant_id: "t_vfs", source: "LINKEDIN", name: "P. Hossain", phone: "+880 15xx-xxxx05", email: "p.h@example.com", country: "Serbia", purpose: "WORK", score: 55, status: "NEW", created_at: ago(5) }
    ],
    campaigns: [
      { id: "camp_1", tenant_id: "t_wvc", name: "SGP Tourist — September Push", channel: "FACEBOOK ADS", status: "ACTIVE", budget: 10000, spend: 6200, leads: 34, created_at: ago(25) },
      { id: "camp_2", tenant_id: "t_vfs", name: "MYE Manpower Q4", channel: "LINKEDIN", status: "ACTIVE", budget: 500, spend: 310, leads: 12, created_at: ago(20) }
    ],
    employers: [
      { id: "emp_1", tenant_id: "t_vfs", name: "KL Foods Sdn Bhd", country: "Malaysia", contact: "hr@klfoods.example" },
      { id: "emp_2", tenant_id: "t_vfs", name: "Belgrade Construct d.o.o.", country: "Serbia", contact: "office@bgconstruct.example" }
    ],
    job_orders: [
      { id: "jo_1", tenant_id: "t_vfs", employer_id: "emp_1", role: "Production Assistant", count: 2, destination: "Malaysia", fee_per_worker: 1200, commission_rate: 8, status: "ACTIVE" },
      { id: "jo_2", tenant_id: "t_vfs", employer_id: "emp_2", role: "Construction Worker", count: 1, destination: "Serbia", fee_per_worker: 900, commission_rate: 10, status: "ACTIVE" }
    ],
    workers: [
      { id: "wkr_1", tenant_id: "t_vfs", applicant_id: "a_vfs_1", job_order_id: "jo_1", status: "IN_PROCESS" },
      { id: "wkr_2", tenant_id: "t_vfs", applicant_id: "a_vfs_2", job_order_id: "jo_2", status: "IN_PROCESS" }
    ],
    appointments: [
      { id: "appt_1", tenant_id: "t_wvc", applicant_id: "a_wvc_2", country: "Australia", purpose: "Student visa — biometrics & application", date: "2026-10-14", time: "10:30", location: "VFS Global, Dhaka", status: "CONFIRMED", created_at: ago(1) }
    ],
    settings: {
      dry_run: true,
      production_agents: {},
      monthly_budget_usd: 250,
      warn_at: 0.8,
      hard_pause: false,
      retention_days_docs: 365,
      retention_days_logs: 400,
      channels: { email: false, whatsapp: false, sms: false },
      webhook_url: ""
    }
  };
}
