// -----------------------------------------------------------------------------
// lib/chat.ts
// Chat engine for VisaMotion 365.
//
// For a frontend-first demo the default engine is a *mock streamer*: it uses the
// active agent's system prompt to shape a structured, agent-specific answer and
// emits it token-by-token so the UI streaming behaviour is realistic.
//
// A real provider (OpenAI / Gemini / Anthropic) can be dropped in by replacing
// `mockStream` with `providerStream` — the signature and streaming contract are
// identical. The Settings modal collects the key, and `ChatRequest.config`
// carries it through.
// -----------------------------------------------------------------------------

import { getAgent, type AgentId } from "./agents";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  agentId?: AgentId;
  createdAt: number;
}

export interface ChatRequest {
  agentId: AgentId;
  messages: ChatMessage[];
  mode?: "browser" | "instant" | "deep";
  /** Optional API key if a real provider is wired in. */
  config?: {
    llmProvider?: string;
    llmKey?: string;
  };
  signal?: AbortSignal;
}

export interface ChatStreamHandlers {
  onToken: (token: string) => void;
  onDone: (full: string) => void;
  onError: (error: Error) => void;
}

export function createMessage(
  role: ChatMessage["role"],
  content: string,
  agentId?: AgentId,
): ChatMessage {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    content,
    agentId,
    createdAt: Date.now(),
  };
}

function lastUser(messages: ChatMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].role === "user") return messages[i].content;
  }
  return "";
}

// -- Agent-specific mock answer builders --------------------------------------

function strategistAnswer(q: string): string {
  return `**Eligibility snapshot** (draft — verify every threshold on the official portal)

I read your profile as: ${q.slice(0, 220)}

**1. Points estimate**
| Factor | Assumed | Note |
| --- | --- | --- |
| Age | from profile | max points 25–30 |
| Education | from profile | bachelor/master band |
| Language | from profile | CLB 9+ unlocks the top band |
| Skilled experience | from profile | 3+ yrs is a common cut-off |

**2. Best pathways**
- Canada — Express Entry (CRS) or a PNP nomination
- Australia — subclass 189 / 190 / 491 points test
- UK — Skilled Worker, confirm the going-rate salary on GOV.UK

**3. Highest-leverage improvement**
The single factor that usually moves a score fastest is language: a jump from CLB 8 to CLB 9 can add enough CRS points to change an invitation outcome.

**4. Must confirm**
Current draw cut-offs, salary thresholds and processing times change frequently — confirm on the official authority before advising the applicant. This is not legal advice.`;
}

function auditorAnswer(q: string): string {
  return `**Document audit** — items supplied: ${q.slice(0, 200)}

| # | Document | Status | Action |
| --- | --- | --- | --- |
| 1 | Passport (6+ months validity) | PASS / FAIL | verify expiry at travel date |
| 2 | Bank statements (maintenance funds) | WARN | confirm the exact 28-day balance rule |
| 3 | Income tax returns | MISSING | provide last 2 assessment years |
| 4 | Police clearance (PCC) | MISSING | order early — validity varies |
| 5 | Medical exams | MISSING | book panel physician |
| 6 | Degree + transcripts | WARN | apostille / notarise as required |
| 7 | Sponsor affidavit | MISSING | include sponsor ID + relationship proof |

**Verdict:** documentation is incomplete. Fix MISSING items first; they are the usual refusal triggers. Re-run this audit after upload so every row can be marked PASS.`;
}

function writerAnswer(q: string): string {
  return `**Statement of Purpose — first draft**

*Context used:* ${q.slice(0, 200)}

To the Visa Officer,

I am writing to explain my purpose of travel and why I will return to my home country once my studies/assignment conclude. My decision is deliberate, not opportunistic: [reason specific to the applicant], and it builds directly on my experience in [field].

Why this destination and programme/role: [specific link to the curriculum or job duties] — not a generic choice, but the shortest credible route to my goal. Funding is arranged from [source], and the attached documents evidence every figure.

Ties to home: my [family/property/employment offer] means my long-term future is anchored in [home country]. I intend to comply fully with the conditions of the visa and to leave before it expires.

I would be glad to provide any further document.

Sincerely,
[Applicant name — replace before sending]

**Editor notes:** I replaced no facts you did not provide, and every bracketed placeholder must be filled. Read it aloud and swap anything that does not sound like the applicant.`;
}

function forensicAnswer(q: string): string {
  return `**Refusal forensic breakdown**

*From the material provided:* ${q.slice(0, 200)}

**1. Quoted ground**
Isolate the exact paragraph the officer relied on (e.g. US INA 214(b), Schengen Article 32, Canada IRPR 179, UK paragraph 320).

**2. What the officer actually doubted**
Usually one of: ties to home, credibility of funds, purpose of visit, or the applicant's ability to answer consistently at interview.

**3. The evidence gap**
Map each doubt to the document that should have closed it. Most refusals are evidence failures, not merit failures.

**4. Rebuttal structure for re-application**
- Address each ground in the same order the officer raised it
- Attach new, verifiable evidence — never a bare assertion
- Add a short factual cover note, not an emotional appeal

**5. Reality check**
Some refusals are correct on the facts. If the underlying profile is weak, a re-application without a material change will usually fail again. A licensed lawyer should review before filing.`;
}

function portalAnswer(q: string): string {
  return `**Portal / slot plan** — request: ${q.slice(0, 200)}

I can launch a **Browser Use Cloud** task to check public appointment availability (VFS Global, TLScontact, CGI Federal) and to read the official guidance. I will **not** log in, enter personal data, pay, or submit any form — you complete the booking yourself.

**Task I would run**
"Open the official [country] appointment portal, check the earliest available [visa type] slot in [city], capture the current public guidance, and cite the exact URL."

**Interview Q&A simulation**
1. Purpose of your visit? — one sentence, matched to your documents.
2. Who is funding you and how? — name the source and the paper trail.
3. Why will you return home? — concrete ties, not sentiment.
4. Why this institution/employer? — specific, researched detail.
5. What if the visa is refused? — stay factual and calm.

Confirm the country, city and visa type and I will launch the cloud browser task now.`;
}

const BUILDERS: Record<AgentId, (q: string) => string> = {
  strategist: strategistAnswer,
  auditor: auditorAnswer,
  writer: writerAnswer,
  forensic: forensicAnswer,
  portal: portalAnswer,
};

// -- Streaming ---------------------------------------------------------------

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

/**
 * Stream a response token-by-token. Replace the body with a real provider call
 * when a key is configured; the handlers contract stays the same.
 */
export async function streamChat(
  request: ChatRequest,
  handlers: ChatStreamHandlers,
): Promise<void> {
  const { agentId, messages, signal } = request;
  const agent = getAgent(agentId);
  const question = lastUser(messages);
  const full = BUILDERS[agent.id](question || "No question provided.");

  // Deep Reason mode "thinks" a little longer before the first token.
  if (request.mode === "deep") await sleep(500, signal);

  // Chunk on word boundaries so the stream looks like real tokens.
  const tokens = full.match(/\s*\S+/g) ?? [full];
  let emitted = "";
  try {
    for (const token of tokens) {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      emitted += token;
      handlers.onToken(token);
      await sleep(12 + Math.random() * 22, signal);
    }
    handlers.onDone(emitted);
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      handlers.onDone(emitted);
      return;
    }
    handlers.onError(error as Error);
  }
}

/** Exposed so a real provider can be wired in without touching the UI. */
export function buildSystemPrompt(agentId: AgentId): string {
  return getAgent(agentId).systemPrompt;
}
