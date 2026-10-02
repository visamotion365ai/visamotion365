# VisaMotion 365

A frontend-first **agentic AI workspace** for a global visa & immigration agency.
The UI is a strict, all-white 1:1 replica of the Meta AI web interface: a slim
icon sidebar, a centered hero, and a floating `rounded-[28px]` prompt bar.

> This is a workspaces/consultation tool. It is **not** legal advice and it never
> logs in to or submits a government application on the applicant's behalf.

## Stack

- **Next.js 14** (App Router) + React 18 + TypeScript (strict)
- **Tailwind CSS** (all-white design system, `neutral` palette)
- **Lucide React** icons
- **Zustand** store (agent, config, chat, cloud tasks)

## Five autonomous agents

| # | Agent | Focus |
|---|-------|-------|
| 1 | Migration & Eligibility Strategist | CRS, Australia 189/190/491, UK Skilled Worker |
| 2 | Document Auditor & Compliance Officer | Funds, ITR, PCC, medicals, apostille — PASS/FAIL/MISSING |
| 3 | SOP & Cover Letter Architect | GTE-compliant statements, sponsorship letters |
| 4 | Refusal Forensic & Re-Appeal Specialist | US 214(b), Schengen Art. 32/35, IRPR 179, UK 320 |
| 5 | Embassy Slot & Autonomous Portal Agent | Browser Use Cloud tasks (VFS, TLScontact, CGI) |

Switching an agent instantly changes the composer placeholder, the active-agent
badge, and the system prompt used by `lib/chat.ts`.

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run typecheck
```

## Configuration

Click the gear icon in the sidebar (or **Open Settings**) and add:

- **Browser Use Cloud** — `BROWSER_USE_API_KEY` (`bu_...`). Real API calls.
- **Base44** — API key + workflow endpoint.
- **Primary LLM** — OpenAI / Gemini / Anthropic key, plus proxy country.

Everything is stored in `localStorage` under **`visamotion_config`** and survives
reload.

> **Security note:** this app is deliberately frontend-first, so keys live in the
> browser and API calls are made from the browser. That is fine on a trusted
> machine for personal use. For a team deployment, proxy these calls through a
> server route and keep keys in server environment variables instead.

## Browser Use Cloud

`lib/browserUse.ts` is a production-ready wrapper:

- `createBrowserTask(task, apiKey, options)` — tries the **v4 runs** endpoint
  (`POST /api/v4/runs`), then transparently falls back to the **v2 tasks**
  endpoint (`POST /api/v2/tasks`).
- `getBrowserTaskStatus(taskId, apiKey)` — poll a run.
- `testBrowserUseKey(apiKey)` — connectivity check used by Settings.

Selecting the **Browser Agent Cloud v4** mode and sending a prompt launches a
real task; it appears in **Active Cloud Browser Tasks** with a refresh button and
live-view link. No login, payment or form submission is ever performed.

## Project structure

```
app/
  layout.tsx        Root layout + Inter font
  page.tsx          Main composition + send/stream logic
  globals.css       Tailwind + base styles
components/
  Sidebar.tsx       Slim icon sidebar with tooltips
  AgentSelector.tsx Flyout popover (5 agents)
  ActiveAgentBadge.tsx
  HeroInput.tsx     Floating prompt bar + file upload
  ActionGrid.tsx    6 quick-action cards
  ChatThread.tsx    Streaming conversation + markdown-lite
  SettingsModal.tsx Keys, tests, localStorage
  CloudTasksPanel.tsx
  DocumentVault.tsx
  SearchOverlay.tsx
lib/
  agents.ts         Personas, quick actions, chips, modes
  store.ts          Zustand store (visamotion_config)
  browserUse.ts     Browser Use Cloud API wrapper
  chat.ts           Streaming chat engine (mock, swappable)
```
