# VisaMotion 365

VisaMotion 365 is a mobile-first visa case workspace with five specialist AI
personas, a real Browser Use Cloud task mode, provider-backed chat, and an
installable progressive web app.

It is a consultation and drafting tool, not legal advice. It does not sign in to,
pay, or submit applications to government or appointment portals.

## What works

- Eligibility, document review, statement drafting, refusal analysis, and portal
  research use the selected live AI provider when one is configured.
- Browser Agent mode starts and polls real Browser Use Cloud tasks through
  same-origin server routes. Task IDs, status, output, and live-view links appear
  in the workspace.
- OpenAI, Gemini, Anthropic, Base44, and Browser Use keys have connection tests
  in Settings. A test displays the provider's success or error message.
- Mobile application drafts, theme, chat, and provider settings are saved in
  this browser's local storage. They do not sync between devices or users.
- The PWA uses network-first updates and an offline copy of previously visited
  pages. API responses are not cached.

## Start locally

```bash
npm ci
npm run dev
npm run typecheck
npm run lint
npm run build
```

## Connect an AI provider

Open **Settings** and enter one of:

- OpenAI API key
- Google Gemini API key
- Anthropic API key
- Base44 API key and HTTPS workflow endpoint
- Browser Use Cloud API key (`bu_...`) for autonomous browser tasks

Press **Test** before saving. Without a connected provider, the app reports that
setup is required rather than presenting canned text as a real AI answer. API
usage is billed by the provider on the account attached to that key.

Keys entered in Settings are stored in this browser's `localStorage`. They are
sent to this app's same-origin route only when you test or use that provider;
they are not included in URLs or written to the app database. Treat this like a
personal-device app: browser extensions or scripts running on the same origin
can access local storage. For a shared agency deployment, add authentication,
encrypted per-user credential storage, and access controls before storing client
records centrally.

## Optional server keys

Set server-only values in `.env.local` for development or Vercel environment
variables for a shared default provider. Never commit real keys.

| Variable | Purpose |
| --- | --- |
| `BROWSER_USE_API_KEY` | Default Browser Use Cloud credential |
| `OPENAI_API_KEY` | Default OpenAI credential |
| `GEMINI_API_KEY` | Default Gemini credential |
| `ANTHROPIC_API_KEY` | Default Anthropic credential |
| `BASE44_API_KEY` | Default Base44 credential |
| `BASE44_ENDPOINT` | Base44 HTTPS workflow URL |

## PWA and iOS

The manifest, 192/512 px icons, Apple touch icon, safe-area layout, and network-
first service worker are included. Android and desktop Chromium browsers can
install from the browser prompt/menu. On iPhone or iPad, open the site in Safari,
tap **Share**, then **Add to Home Screen**. The installed PWA launches standalone
and uses the short label **VisaMotion**.

An App Store-signed native iOS binary is not included: publishing one requires an
Apple Developer account, Xcode on macOS, and signing/provisioning. See
[`IOS_RELEASE.md`](./IOS_RELEASE.md) for the iOS release boundary.

## Case and document privacy

Case drafts are currently local to the device/browser and are not backed by
Supabase or a team account. Prompts and conversation history are sent to the AI
provider you select. Do not enter passport numbers, bank account numbers, or
other sensitive identifiers. Uploaded files are currently shown in the local
document list; they are not uploaded to a server or parsed into model context.

## Project structure

```text
app/                 Next.js pages and API routes
components/           Desktop, mobile, settings, and install UI
components/mobile/    Mobile workspace and case form
lib/                  Agent personas, browser, provider, and local state logic
public/               PWA manifest, service worker, and app icons
```
