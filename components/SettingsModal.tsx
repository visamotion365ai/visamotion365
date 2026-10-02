"use client";

import { useEffect, useState } from "react";
import { Check, Eye, EyeOff, Loader2, ShieldCheck, X } from "lucide-react";
import {
  useStore,
  DEFAULT_CONFIG,
  type LlmProvider,
  type ProxyCountry,
  type TestState,
} from "@/lib/store";
import { testConnection } from "@/lib/providerTests";

const LLM_PROVIDERS: { id: LlmProvider; label: string }[] = [
  { id: "openai", label: "OpenAI (GPT)" },
  { id: "gemini", label: "Google Gemini" },
  { id: "anthropic", label: "Anthropic Claude" },
];

const PROXY_COUNTRIES: { id: ProxyCountry; label: string }[] = [
  { id: "us", label: "United States" },
  { id: "uk", label: "United Kingdom" },
  { id: "ca", label: "Canada" },
  { id: "au", label: "Australia" },
  { id: "de", label: "Germany" },
  { id: "ae", label: "United Arab Emirates" },
];

function StatusPill({ state, label }: { state: TestState; label: string }) {
  if (state === "idle") return null;
  const styles: Record<Exclude<TestState, "idle">, string> = {
    testing: "text-neutral-500",
    connected: "text-green-600",
    error: "text-red-600",
  };
  const dot: Record<Exclude<TestState, "idle">, string> = {
    testing: "bg-neutral-400",
    connected: "bg-green-500",
    error: "bg-red-500",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${styles[state]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot[state]} ${state === "testing" ? "animate-pulse" : ""}`} />
      {label}
    </span>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-neutral-500">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-neutral-400">{hint}</p>}
    </div>
  );
}

export default function SettingsModal() {
  const open = useStore((s) => s.settingsOpen);
  const setOpen = useStore((s) => s.setSettingsOpen);
  const config = useStore((s) => s.config);
  const setConfig = useStore((s) => s.setConfig);
  const saveConfig = useStore((s) => s.saveConfig);
  const resetConfig = useStore((s) => s.resetConfig);

  const [reveal, setReveal] = useState(false);
  const [browserState, setBrowserState] = useState<TestState>("idle");
  const [base44State, setBase44State] = useState<TestState>("idle");
  const [llmState, setLlmState] = useState<TestState>("idle");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, setOpen]);

  if (!open) return null;

  const runTest = async (
    kind: "browser" | "base44" | "llm",
    fn: () => Promise<{ ok: true; detail: string }>,
  ) => {
    const setter =
      kind === "browser" ? setBrowserState : kind === "base44" ? setBase44State : setLlmState;
    setter("testing");
    try {
      await fn();
      setter("connected");
    } catch {
      setter("error");
    }
  };

  const browserKeyValid = !config.browserUseKey || config.browserUseKey.startsWith("bu_");

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/10 p-4 backdrop-blur-md"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setOpen(false);
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="API Keys and configuration"
        className="max-h-[88vh] w-full max-w-[560px] overflow-y-auto rounded-2xl border border-neutral-200/70 bg-white/80 shadow-2xl backdrop-blur-2xl"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-neutral-200/70 bg-white/70 px-5 py-4 backdrop-blur-xl">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100">
              <ShieldCheck size={18} className="text-neutral-700" />
            </span>
            <div>
              <h2 className="text-base font-medium text-neutral-900">API Keys &amp; Config</h2>
              <p className="text-xs text-neutral-500">
                Stored locally in your browser under <code className="rounded bg-neutral-100 px-1">visamotion_config</code>.
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close settings"
            onClick={() => setOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
          >
            <X size={17} />
          </button>
        </div>

        <div className="space-y-5 px-5 py-5">
          {/* Browser Use */}
          <section className="rounded-xl border border-neutral-200/70 bg-white/50 p-4 backdrop-blur-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium text-neutral-900">Browser Use Cloud</h3>
              <StatusPill
                state={browserState}
                label={browserState === "connected" ? "Connected" : browserState === "testing" ? "Testing" : "Error"}
              />
            </div>
            <Field
              label="BROWSER_USE_API_KEY"
              hint={browserKeyValid ? "Used for autonomous browser runs and slot checks." : "Key should start with bu_."}
            >
              <div className="flex gap-2">
                <input
                  type={reveal ? "text" : "password"}
                  value={config.browserUseKey}
                  onChange={(event) => setConfig({ browserUseKey: event.target.value })}
                  placeholder="bu_..."
                  className={`w-full rounded-xl border px-3 py-2 text-sm outline-none transition-colors focus:border-neutral-400 ${
                    browserKeyValid ? "border-neutral-200" : "border-red-300"
                  }`}
                />
                <button
                  type="button"
                  onClick={() =>
                    runTest("browser", () => testConnection("browser-use", config.browserUseKey))
                  }
                  disabled={!config.browserUseKey || browserState === "testing"}
                  className="shrink-0 rounded-xl border border-neutral-200 px-3 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-40"
                >
                  {browserState === "testing" ? <Loader2 size={14} className="animate-spin" /> : "Test"}
                </button>
              </div>
            </Field>
          </section>

          {/* Base44 */}
          <section className="rounded-xl border border-neutral-200/70 bg-white/50 p-4 backdrop-blur-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium text-neutral-900">Base44 Workflow</h3>
              <StatusPill
                state={base44State}
                label={base44State === "connected" ? "Connected" : base44State === "testing" ? "Testing" : "Error"}
              />
            </div>
            <div className="space-y-3">
              <Field label="Base44 API Key">
                <input
                  type={reveal ? "text" : "password"}
                  value={config.base44Key}
                  onChange={(event) => setConfig({ base44Key: event.target.value })}
                  placeholder="Paste your Base44 / superagent key"
                  className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
                />
              </Field>
              <Field label="Workflow Endpoint">
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={config.base44Endpoint}
                    onChange={(event) => setConfig({ base44Endpoint: event.target.value })}
                    placeholder="https://app.base44.com/api/..."
                    className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
                  />
                  <button
                    type="button"
                    onClick={() => runTest("base44", () => testConnection("base44", config.base44Key, config.base44Endpoint))}
                    disabled={!config.base44Endpoint || base44State === "testing"}
                    className="shrink-0 rounded-xl border border-neutral-200 px-3 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-40"
                  >
                    {base44State === "testing" ? <Loader2 size={14} className="animate-spin" /> : "Test"}
                  </button>
                </div>
              </Field>
            </div>
          </section>

          {/* Primary LLM */}
          <section className="rounded-xl border border-neutral-200/70 bg-white/50 p-4 backdrop-blur-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium text-neutral-900">Primary LLM</h3>
              <StatusPill
                state={llmState}
                label={llmState === "connected" ? "Connected" : llmState === "testing" ? "Testing" : "Error"}
              />
            </div>
            <div className="space-y-3">
              <Field label="Provider">
                <select
                  value={config.llmProvider}
                  onChange={(event) => setConfig({ llmProvider: event.target.value as LlmProvider })}
                  className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400"
                >
                  {LLM_PROVIDERS.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="API Key">
                <div className="flex gap-2">
                  <input
                    type={reveal ? "text" : "password"}
                    value={config.llmKey}
                    onChange={(event) => setConfig({ llmKey: event.target.value })}
                    placeholder="sk-..."
                    className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
                  />
                  <button
                    type="button"
                    onClick={() => runTest("llm", () => testConnection(config.llmProvider, config.llmKey))}
                    disabled={!config.llmKey || llmState === "testing"}
                    className="shrink-0 rounded-xl border border-neutral-200 px-3 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-40"
                  >
                    {llmState === "testing" ? <Loader2 size={14} className="animate-spin" /> : "Test"}
                  </button>
                </div>
              </Field>
              <Field label="Proxy Country" hint="Exit country for Browser Use Cloud runs.">
                <select
                  value={config.proxyCountry}
                  onChange={(event) => setConfig({ proxyCountry: event.target.value as ProxyCountry })}
                  className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400"
                >
                  {PROXY_COUNTRIES.map((country) => (
                    <option key={country.id} value={country.id}>
                      {country.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </section>

          <label className="flex cursor-pointer items-center gap-2 text-xs text-neutral-500">
            <input
              type="checkbox"
              checked={reveal}
              onChange={(event) => setReveal(event.target.checked)}
              className="h-3.5 w-3.5 accent-neutral-900"
            />
            <Eye size={13} /> Show keys
            {reveal && <EyeOff size={13} className="text-neutral-300" />}
          </label>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-neutral-200/70 bg-white/70 px-5 py-3 backdrop-blur-xl">
          <button
            type="button"
            onClick={() => {
              resetConfig();
              setBrowserState("idle");
              setBase44State("idle");
              setLlmState("idle");
            }}
            className="text-xs text-neutral-500 transition-colors hover:text-red-600"
          >
            Reset to defaults
          </button>
          <div className="flex items-center gap-2">
            {saved && (
              <span className="flex items-center gap-1 text-xs text-green-600">
                <Check size={13} /> Saved
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                saveConfig();
                setSaved(true);
                window.setTimeout(() => setSaved(false), 2000);
              }}
              className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
            >
              Save configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
