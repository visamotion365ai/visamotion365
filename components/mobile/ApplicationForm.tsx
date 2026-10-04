"use client";

import { useState, type ReactNode } from "react";
import {
  ArrowRight,
  Camera,
  Check,
  ChevronDown,
  Globe2,
  Info,
  ShieldCheck,
} from "lucide-react";
import { COUNTRIES, flagUrl, getCountry, type Country } from "@/lib/countries";
import { useStore, type VisaApplication } from "@/lib/store";
import { Flag } from "@/components/CountryCards";

const CTA_LABELS = ["Continue to Step 2", "Continue to Step 3", "Submit application"];

function newDraft(): VisaApplication {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `app-${Date.now()}`,
    countryCode: "",
    countryName: "",
    flag: "",
    visaType: "",
    fullName: "",
    email: "",
    phone: "",
    nationality: "",
    travelDate: "",
    notes: "",
    step: 1,
    status: "draft",
    createdAt: Date.now(),
  };
}

interface Props {
  initial?: VisaApplication | null;
  onOpenAssistant: (country: Country) => void;
  onViewApplications: () => void;
}

export default function ApplicationForm({ initial, onOpenAssistant, onViewApplications }: Props) {
  const addApplication = useStore((s) => s.addApplication);
  const updateApplication = useStore((s) => s.updateApplication);
  const setCountryCode = useStore((s) => s.setCountryCode);
  const setActiveAgent = useStore((s) => s.setActiveAgent);

  const [form, setForm] = useState<VisaApplication>(() => initial ?? newDraft());
  const [listOpen, setListOpen] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(initial?.status === "submitted");

  const patch = (values: Partial<VisaApplication>) => setForm((f) => ({ ...f, ...values }));
  const selected = form.countryCode ? getCountry(form.countryCode) : undefined;

  const pickCountry = (country: Country) => {
    setCountryCode(country.code);
    patch({ countryCode: country.code, countryName: country.name, flag: country.flag });
    setListOpen(false);
  };

  const persist = (values: Partial<VisaApplication>) => {
    const next = { ...form, ...values };
    setForm(next);
    if (initial) updateApplication(next.id, next);
    else addApplication(next);
    return next;
  };

  const next = () => {
    if (form.step === 1) {
      if (!form.countryCode) return setError("Please choose a destination country.");
      if (!form.fullName.trim()) return setError("Enter your full name.");
      if (!/^\S+@\S+\.\S+$/.test(form.email)) return setError("Enter a valid email address.");
      if (form.phone.replace(/\D/g, "").length < 6) return setError("Enter a valid phone number.");
      setError("");
      persist({ step: 2 });
      return;
    }
    if (form.step === 2) {
      if (!form.visaType) return setError("Select a visa type.");
      setError("");
      persist({ step: 3 });
      return;
    }
    const submitted = persist({ step: 3, status: "submitted" });
    setDone(submitted.status === "submitted");
  };

  if (done) {
    return (
      <div className="vm-m-card mt-2 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-lg">
          <Check size={26} />
        </div>
        <h2 className="vm-m-heading mt-4">Application submitted</h2>
        <p className="vm-m-sub mt-1">
          {form.countryName || "Your"} · {form.visaType || "Visa"} — our AI agents are ready to
          build your document checklist.
        </p>
        <div className="mt-5 space-y-2">
          <button type="button" className="vm-m-cta" onClick={() => onOpenAssistant(selected ?? COUNTRIES[0])}>
            Build my checklist <ArrowRight size={17} />
          </button>
          <button type="button" className="vm-m-ghost" onClick={onViewApplications}>
            View my applications
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="vm-m-title">New Visa Application</h1>
        <p className="vm-m-sub">Let’s get started with your visa application.</p>
      </header>

      {/* Step progress */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center gap-2">
              <span className={`vm-step-circle ${form.step >= step ? "is-active" : ""}`}>
                {form.step > step ? <Check size={13} /> : step}
              </span>
              {step < 3 && (
                <span className={`vm-step-bar ${form.step > step ? "is-done" : ""}`} />
              )}
            </div>
          ))}
        </div>
        <div className="ml-auto text-right">
          <p className="text-[13px] font-semibold text-neutral-800 dark:text-neutral-100">
            Step {form.step} of 3
          </p>
          <p className="text-[11px] text-neutral-400">
            {form.step === 1 ? "Personal Information" : form.step === 2 ? "Trip Details" : "Review"}
          </p>
        </div>
      </div>

      <div className="vm-m-card">
        {form.step === 1 && (
          <>
            <h2 className="vm-m-section">Select Destination Country</h2>
            <p className="vm-m-sub">Choose the country you want to apply for.</p>

            <div className="relative mt-3">
              <button
                type="button"
                onClick={() => setListOpen((v) => !v)}
                className="vm-m-input flex w-full items-center justify-between"
              >
                <span className="flex items-center gap-3">
                  {selected ? (
                    <Flag country={selected} />
                  ) : (
                    <Globe2 size={18} className="text-neutral-400" />
                  )}
                  <span className={selected ? "" : "text-neutral-400"}>
                    {selected ? selected.name : "Select a country"}
                  </span>
                </span>
                <ChevronDown
                  size={16}
                  className={`text-neutral-400 transition-transform ${listOpen ? "rotate-180" : ""}`}
                />
              </button>

              {listOpen && (
                <div className="vm-m-dropdown">
                  {COUNTRIES.slice(0, 16).map((country) => {
                    const active = country.code === form.countryCode;
                    return (
                      <button
                        key={country.code}
                        type="button"
                        onClick={() => pickCountry(country)}
                        className={`vm-m-option ${active ? "is-active" : ""}`}
                      >
                        <img
                          src={flagUrl(country.code, 80)}
                          alt=""
                          className="vm-option-flag"
                          loading="lazy"
                        />
                        <span className="flex-1 text-left">{country.name}</span>
                        <span className={`vm-radio ${active ? "is-on" : ""}`}>
                          {active && <span className="vm-radio-dot" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <Field label="Full Name">
              <input
                className="vm-m-input w-full"
                placeholder="Enter your full name"
                value={form.fullName}
                onChange={(e) => patch({ fullName: e.target.value })}
              />
            </Field>

            <Field label="Email Address">
              <input
                type="email"
                inputMode="email"
                className="vm-m-input w-full"
                placeholder="Enter your email address"
                value={form.email}
                onChange={(e) => patch({ email: e.target.value })}
              />
            </Field>

            <Field label="Phone Number">
              <div className="flex gap-2">
                <div className="vm-m-input flex w-[86px] shrink-0 items-center justify-center gap-1">
                  +1 <ChevronDown size={13} className="text-neutral-400" />
                </div>
                <input
                  type="tel"
                  inputMode="tel"
                  className="vm-m-input w-full flex-1"
                  placeholder="Enter your phone number"
                  value={form.phone}
                  onChange={(e) => patch({ phone: e.target.value })}
                />
              </div>
            </Field>
          </>
        )}

        {form.step === 2 && (
          <>
            <h2 className="vm-m-section">Trip & Visa Details</h2>
            <p className="vm-m-sub">This shapes the checklist and processing estimate.</p>

            <Field label="Visa Type">
              <select
                className="vm-m-input w-full"
                value={form.visaType}
                onChange={(e) => patch({ visaType: e.target.value })}
              >
                <option value="">Select visa type</option>
                {["Work Permit", "Student Visa", "Visitor / Tourist", "Family / Spouse", "Permanent Residency", "Business"].map(
                  (type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ),
                )}
              </select>
            </Field>

            <Field label="Nationality">
              <input
                className="vm-m-input w-full"
                placeholder="e.g. Bangladeshi"
                value={form.nationality}
                onChange={(e) => patch({ nationality: e.target.value })}
              />
            </Field>

            <Field label="Intended Travel Date">
              <input
                type="date"
                className="vm-m-input w-full"
                value={form.travelDate}
                onChange={(e) => patch({ travelDate: e.target.value })}
              />
            </Field>
          </>
        )}

        {form.step === 3 && (
          <>
            <h2 className="vm-m-section">Review your application</h2>
            <p className="vm-m-sub">Confirm the details before submitting.</p>
            <dl className="mt-3 space-y-2.5 text-[13px]">
              <Row label="Destination" value={form.countryName || "—"} />
              <Row label="Visa type" value={form.visaType || "—"} />
              <Row label="Full name" value={form.fullName || "—"} />
              <Row label="Email" value={form.email || "—"} />
              <Row label="Phone" value={form.phone || "—"} />
              <Row label="Nationality" value={form.nationality || "—"} />
              <Row label="Travel date" value={form.travelDate || "—"} />
            </dl>
            <Field label="Notes for the agent">
              <textarea
                className="vm-m-input w-full min-h-[84px] resize-none"
                placeholder="Anything the AI agents should know…"
                value={form.notes}
                onChange={(e) => patch({ notes: e.target.value })}
              />
            </Field>
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-neutral-50 px-3 py-2.5 text-[12px] text-neutral-500 dark:bg-white/5 dark:text-neutral-400">
              <Camera size={15} className="text-neutral-400" />
              Case details stay on this device. AI prompts go to the provider you connect; do not add passport or bank numbers.
            </div>
          </>
        )}

        {error && <p className="mt-3 text-[12px] font-medium text-rose-500">{error}</p>}

        <div className="mt-4 flex items-center gap-3">
          {form.step > 1 && (
            <div className="w-[104px] shrink-0">
              <button
                type="button"
                onClick={() => {
                  setError("");
                  persist({ step: form.step - 1 });
                }}
                className="vm-m-ghost"
              >
                Back
              </button>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <button type="button" onClick={next} className="vm-m-cta">
              {CTA_LABELS[form.step - 1]} <ArrowRight size={17} />
            </button>
          </div>
        </div>

        <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-neutral-400">
          <ShieldCheck size={13} /> Your data is secure and encrypted
        </p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mt-3.5">
      <label className="mb-1.5 flex items-center gap-1.5 text-[13px] font-medium text-neutral-700 dark:text-neutral-200">
        {label} <Info size={12} className="text-neutral-300" />
      </label>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-neutral-100 pb-2 last:border-0 dark:border-white/5">
      <dt className="text-neutral-400">{label}</dt>
      <dd className="min-w-0 truncate text-right font-medium text-neutral-800 dark:text-neutral-100">
        {value}
      </dd>
    </div>
  );
}
