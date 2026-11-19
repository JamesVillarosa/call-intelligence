import { CALL_TYPES, OUTCOMES, SCORECARDS, grade, type CallType, type Scorecard } from "./framework";

export type Utterance = { speaker: number; start: number; end: number; text: string };
// split: lines were re-cut at speaker changes, speaker 0 is the employee and 1 the customer.
export type Transcript = { duration: number; utterances: Utterance[]; split?: boolean };

export async function transcribe(audioUrl: string): Promise<Transcript> {
  const res = await fetch(
    "https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&diarize=true&utterances=true&punctuate=true",
    {
      method: "POST",
      headers: { Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url: audioUrl }),
    },
  );
  if (!res.ok) throw new Error(`Transcription failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();
  const utterances: Utterance[] = (json.results?.utterances ?? []).map(
    (u: { speaker?: number; start: number; end: number; transcript: string }) => ({
      speaker: u.speaker ?? 0,
      start: u.start,
      end: u.end,
      text: u.transcript,
    }),
  );
  return { duration: json.metadata?.duration ?? 0, utterances };
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const oneOf = (xs: string[]) => `One of: ${xs.join(", ")}`;
const str = (description: string) => ({ type: "string", description });
const lineRef = { type: "integer", description: "Line index, -1 if none." };

// Phone audio is mono, so speech-to-text often merges both voices into one line.
// A cheap pass marks where the voice changes; code does the cutting so no words are ever lost or invented.
const TURNS = {
  name: "split_turns",
  description: "Mark who speaks in each transcript line, and where the speaker changes mid-line.",
  parameters: {
    type: "object",
    required: ["turns"],
    properties: {
      turns: {
        type: "array",
        description: "Every line, in order. A line with two voices gets one entry per voice.",
        items: {
          type: "object",
          required: ["line", "role", "starts"],
          properties: { line: { type: "integer" }, role: str("R for the company employee, C for the customer or anyone else."), starts: str("First 3 to 5 words of this turn, copied exactly from the line.") },
        },
      },
    },
  },
};

const TURNS_SYSTEM = `Phone transcripts from speech-to-text often put both people on one line: a customer's question and the employee's answer end up merged, and speaker numbers are unreliable.
Go through every line and mark who is talking.
- R is the company employee: greets with the company name, asks the questions, quotes prices, books, says what they will do ("I'll...").
- C is the customer or anyone else: describes their problem, asks what was found, answers questions.
- Acknowledgements right after the customer explains something ("Got you", "Perfect", "Absolutely", "I'll speak with him") are usually the employee. Thanks for help and "I appreciate it" are usually the customer.
- Give every line at least one entry, in order. If the voice changes mid-line, add another entry for the same line, starting at the first words of the new speaker. Short replies like "Okay." or "Yes." after a question belong to the other person.
- "starts" must copy the line's own words exactly.`;

const wordKey = (w: string) => w.toLowerCase().replace(/[^a-z0-9']/g, "");

// Cuts lines where the model marked a speaker change. A "starts" that isn't found is ignored, so text is never lost.
export function splitTurns(lines: Utterance[], turns: { line: number; role: string; starts: string }[]): Utterance[] {
  const out: Utterance[] = [];
  const labelled = lines.map((u, i) => {
    const words = u.text.split(/\s+/).filter(Boolean);
    const keys = words.map(wordKey);
    const cuts: { at: number; role: string }[] = [];
    for (const t of turns.filter((x) => x.line === i)) {
      const role = t.role === "C" ? "C" : "R";
      if (!cuts.length) { cuts.push({ at: 0, role }); continue; }
      const s = String(t.starts ?? "").split(/\s+/).map(wordKey).filter(Boolean).slice(0, 4);
      if (!s.length) continue;
      for (let k = cuts[cuts.length - 1].at + 1; k <= keys.length - s.length; k++) {
        if (s.every((w, j) => keys[k + j] === w)) { if (role !== cuts[cuts.length - 1].role) cuts.push({ at: k, role }); break; }
      }
    }
    return { u, words, cuts };
  });
  // Lines the model skipped keep their diarized speaker, mapped to whichever speaker the model calls the employee most.
  const tally = new Map<number, number>();
  for (const l of labelled) if (l.cuts[0]?.role === "R") tally.set(l.u.speaker, (tally.get(l.u.speaker) ?? 0) + 1);
  const repSpk = [...tally].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0;
  for (const { u, words, cuts } of labelled) {
    if (!cuts.length) cuts.push({ at: 0, role: u.speaker === repSpk ? "R" : "C" });
    const per = (u.end - u.start) / Math.max(words.length, 1);
    cuts.forEach((c, k) => {
      const end = cuts[k + 1]?.at ?? words.length;
      out.push({ speaker: c.role === "R" ? 0 : 1, start: +(u.start + c.at * per).toFixed(2), end: +(u.start + end * per).toFixed(2), text: words.slice(c.at, end).join(" ") });
    });
  }
  return out;
}

// The employee drives an office call; if "Rep" says under a fifth of the words, the roles came back reversed.
export function fixFlip(lines: Utterance[]): Utterance[] {
  const words = (u: Utterance) => u.text.split(/\s+/).filter(Boolean).length;
  const total = lines.reduce((n, u) => n + words(u), 0);
  const rep = lines.reduce((n, u) => n + (u.speaker === 0 ? words(u) : 0), 0);
  return total && rep / total < 0.2 ? lines.map((u) => ({ ...u, speaker: u.speaker ? 0 : 1 })) : lines;
}

// Two small passes instead of one big one: free-tier models cap tokens per minute,
// and the second pass only needs the one scorecard that applies.
const CLASSIFY = {
  name: "record_call_facts",
  description: "Record what happened on one pest control phone call.",
  parameters: {
    type: "object",
    required: ["call_type", "type_reason", "rep_speaker", "rep_name", "summary", "outcome", "outcome_detail", "details", "objections", "opportunities", "follow_up", "sentiment"],
    properties: {
      call_type: str(oneOf(Object.keys(CALL_TYPES))),
      type_reason: str("One sentence: why this type."),
      rep_speaker: { type: "integer", description: "Speaker number of the company employee, -1 if none." },
      rep_name: str("Employee first name as said on the call, or 'Unknown'."),
      customer_name: str("Customer name if said, else ''."),
      summary: str("Two sentences max, plain language for a busy owner."),
      outcome: str(oneOf(Object.keys(OUTCOMES))),
      outcome_detail: str("Concrete result, e.g. 'Booked initial service Tue 10am, $199 + $49/mo'."),
      details: {
        type: "object",
        properties: {
          pests: { type: "array", items: { type: "string" } },
          service: str("Service discussed, '' if none."),
          price_quoted: str("Prices said on the call, '' if none."),
          monthly_value: { type: "number", description: "Recurring monthly price in USD if stated, else 0." },
          appointment: str("Date/time booked or discussed, '' if none."),
          wins: { type: "array", items: { type: "string" }, description: "Customer wants/interests/needs heard (safety, pets, price, speed...)." },
        },
      },
      objections: { type: "array", items: { type: "object", properties: { text: { type: "string" }, utterance: lineRef } } },
      opportunities: {
        type: "array",
        description: "Open or missed revenue/retention opportunities the owner should know about.",
        items: { type: "object", properties: { kind: str(oneOf(["follow_up", "upsell", "referral", "churn_risk", "complaint"])), text: { type: "string" } } },
      },
      follow_up: {
        type: "object",
        properties: {
          needed: { type: "boolean" },
          action: str("What the office should do next, one sentence."),
          urgency: str(oneOf(["today", "this_week", "none"])),
          message: str("Only for unbooked sales leads, lost cancels or complaints: a short, warm text message the office can send the customer now, using their name, pest and what they care about. Sign as the rep. '' otherwise."),
        },
      },
      sentiment: { type: "object", properties: { start: str(oneOf(["positive", "neutral", "negative"])), end: str(oneOf(["positive", "neutral", "negative"])) } },
    },
  },
};

const SCORE = {
  name: "record_call_score",
  description: "Record the scorecard judgement and coaching for one call.",
  parameters: {
    type: "object",
    required: ["customer_lines", "steps", "coaching"],
    properties: {
      customer_lines: { type: "array", items: { type: "integer" }, description: "Index of every line spoken by the customer (anyone who is not the company employee)." },

      steps: {
        type: "array",
        description: "One entry per scorecard step.",
        items: {
          type: "object",
          required: ["key", "passed", "utterance", "quote", "note"],
          properties: { key: { type: "string" }, passed: { type: "boolean" }, utterance: lineRef, quote: str("Exact words copied from that line, '' if missed."), note: str("Short reason, specific to this call.") },
        },
      },
      coaching: {
        type: "object",
        required: ["headline", "strengths", "fixes"],
        properties: {
          headline: str("The single most important thing for this rep to work on, one sentence."),
          strengths: { type: "array", items: { type: "object", properties: { text: { type: "string" }, utterance: lineRef } } },
          fixes: {
            type: "array",
            description: "1-3 highest impact fixes, most important first.",
            items: { type: "object", properties: { step: str("Step label"), what_happened: { type: "string" }, say_instead: { type: "string" }, utterance: lineRef } },
          },
        },
      },
    },
  },
};

const CLASSIFY_SYSTEM = `You review phone calls for a pest control company. Record the facts of the call.

Call types:
${Object.entries(CALL_TYPES).map(([k, v]) => `- ${k}: ${v.hint}`).join("\n")}

Outcomes: ${Object.entries(OUTCOMES).map(([k, v]) => `${k} (${v})`).join(", ")}.

Rules:
- Pick the type from what the customer actually needed. Voicemails, wrong numbers, solicitors, vendors, hang-ups and calls with under ~20 seconds of real conversation are not_scorable.
- Objections are anything that stops or delays the customer saying yes today: needing to talk to a spouse or partner, "just getting information", shopping around or another company's quote, price, "let me think about it", timing, safety worries. List every one with its line.
- Speaker numbers from speech-to-text are often wrong (two people under one number). Decide each line's role from what is said: the employee greets with the company name, asks questions, quotes prices and books.
- Never invent facts. Transcripts come from speech-to-text and may have small errors.`;

function scoreSystem(card: Scorecard) {
  return `You are a fair, experienced sales manager grading a pest control call against the company's ${card.name}.

Steps (use these keys):
${card.steps.map((s) => `- ${s.key} [${s.label}]: ${s.pass}${s.objection ? " (objection step)" : ""}`).join("\n")}

Rules:
- Speaker numbers from speech-to-text are often wrong on phone audio (both people under one number). First decide who said each line from what is said: the employee greets with the company name, asks the questions, quotes prices and books. List every customer line in customer_lines.
- Only the employee's own words can pass a step.
- One entry per step. Judge the intent of each step, not exact script wording: if the employee clearly did what the step is for anywhere in the call, it passes. Cite the line index and copy one sentence exactly as written. No evidence, no pass.
- Lines are labelled Rep or Customer when roles are known; trust those labels.
${card.id === "sales" ? `- Objection steps: if the customer raised no objection, mark them passed with utterance -1 and note "No objection raised". Otherwise judge each one strictly.
- Close means the employee asked to book or schedule (an option close like "morning or afternoon?"). A discount deadline or "let me know" is not a close.\n` : ""}${card.id === "office" ? `- On scheduling and billing calls the manual says the Understand quadrant is less applicable: a quick question to confirm the details (date, card, account) counts as Investigate, and repeating them back counts as Summary.
- Close on office calls means confirming the action (booked, updated, rescheduled), offering a time and asking if it works ("Does that work for you?"), or asking "Is there a specific day that works best?".
- Provide a Conclusion passes when the employee restates what will happen next (the date or time window, the tech coming out, the next follow-up).
- Confidence passes when the employee says they will take care of the issue ("I'll speak with him", "I'll make sure...").\n` : ""}${card.id === "retention" ? `- If the customer is moving out of the service area or has passed away, the manual allows skipping the save: mark present, consensus and repeat passed with utterance -1 and note "Bypassed: moving or deceased".
- Repeat passes automatically (utterance -1, note "Accepted first offer") only when the first save offer was accepted. Teaser passes automatically only when the customer was saved.\n` : ""}- Coaching must be specific to this call. "say_instead" is only the exact words the employee would say out loud, with no framing like "You could say" or "I'll say:". Good: "I'm going to ask a few quick questions about the mice so I can get you the right plan." Use the customer's details.
- Write fix "step" as the step label, not the key.`;
}

export type StepResult = { key: string; label: string; quadrant: string; passed: boolean; auto?: boolean; utterance: number; quote: string; note: string; verified: boolean };
export type Analysis = {
  call_type: CallType;
  type_reason: string;
  rep_speaker: number;
  roles?: string;
  rep_name: string;
  customer_name?: string;
  summary: string;
  outcome: keyof typeof OUTCOMES;
  outcome_detail: string;
  details: { pests?: string[]; service?: string; price_quoted?: string; monthly_value?: number; appointment?: string; wins?: string[] };
  objections: { text: string; utterance: number }[];
  steps: StepResult[];
  coaching: { headline: string; strengths: { text: string; utterance: number }[]; fixes: { step: string; what_happened: string; say_instead: string; utterance: number }[] };
  opportunities: { kind: string; text: string }[];
  follow_up: { needed: boolean; action: string; urgency: string; message?: string };
  sentiment: { start: string; end: string };
  scorecard: Scorecard["id"] | null;
  score: number | null;
  score_max: number | null;
  grade: string | null;
  model: string;
  task?: { assignee?: string; assigned_at?: string; done?: boolean };
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9' ]+/g, " ").split(/\s+/).filter(Boolean);

// Share of quote words found in a line. Guards against the model citing words nobody said.
function overlap(quote: string, line: string) {
  const q = norm(quote);
  if (q.length < 3) return 0;
  const l = new Set(norm(line));
  return q.filter((w) => l.has(w)).length / q.length;
}

// Quotes often run across speech-to-text line breaks, so match against a 3-line window.
export function locateQuote(quote: string, utterance: number, lines: Utterance[]) {
  const win = (i: number) => lines.slice(i, i + 3).map((l) => l.text).join(" ");
  // Point at the line inside the window that holds most of the quote.
  const pick = (i: number) => {
    let at = i;
    for (let j = i; j < Math.min(i + 3, lines.length); j++) if (overlap(quote, lines[j].text) > overlap(quote, lines[at].text)) at = j;
    return at;
  };
  const near = [utterance, utterance - 1, utterance - 2].filter((i) => i >= 0 && i < lines.length);
  for (const i of near) if (overlap(quote, win(i)) >= 0.7) return pick(i);
  let best = -1, bestScore = 0;
  lines.forEach((_, i) => {
    const s = overlap(quote, win(i));
    if (s > bestScore) [best, bestScore] = [i, s];
  });
  return bestScore >= 0.7 ? pick(best) : -1;
}

// Claude when a key is set, otherwise Groq's free tier (no training on API data).
const claudeEnabled = () => !!process.env.ANTHROPIC_API_KEY;
export const MODEL = process.env.ANTHROPIC_API_KEY ? "claude-sonnet-5-5" : "openai/gpt-oss-120b";

type Tool = { name: string; description: string; parameters: object };

// Free-tier fallbacks: each Groq model has its own daily token cap.
const FALLBACK: Record<string, string> = { "openai/gpt-oss-120b": "qwen/qwen3.8-27b", "qwen/qwen3.8-27b": "openai/gpt-oss-20b", "openai/gpt-oss-20b": "qwen/qwen3.8-27b" };
let modelUsed = MODEL;

async function callModel(system: string, user: string, tool: Tool, groqModel = MODEL) {
  const capped = new Set<string>();
  for (let attempt = 0; ; attempt++) {
    const res = claudeEnabled()
      ? await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "x-api-key": process.env.ANTHROPIC_API_KEY!, "anthropic-version": "2023-06-01", "content-type": "application/json" },
          body: JSON.stringify({ model: MODEL, max_tokens: 8000, temperature: 0, system, tools: [{ name: tool.name, description: tool.description, input_schema: tool.parameters }], tool_choice: { type: "tool", name: tool.name }, messages: [{ role: "user", content: user }] }),
        })
      : await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, "content-type": "application/json" },
          body: JSON.stringify({
            model: groqModel,
            // A malformed tool call repeats at temperature 0, so nudge it on retry.
            temperature: attempt ? 0.2 : 0,
            // Groq free tier counts prompt + max output against 8k tokens/min, so size the output to fit.
            max_completion_tokens: Math.max(2000, 7800 - Math.ceil((system.length + user.length + JSON.stringify(tool).length) / 3.2)),
            messages: [{ role: "system", content: system }, { role: "user", content: user }],
            tools: [{ type: "function", function: tool }],
            tool_choice: { type: "function", function: { name: tool.name } },
          }),
        });
    const body = res.ok ? null : await res.text();
    // Rate limits wait it out; malformed tool JSON is retried. A daily cap, or a model that keeps
    // failing the tool call on this transcript, moves on to the next free model.
    const stuck = res.status === 400 && attempt >= 2 && /tool_use_failed/.test(body ?? "");
    if ((stuck || (res.status === 429 && /tokens per day/.test(body ?? ""))) && FALLBACK[groqModel] && !capped.has(FALLBACK[groqModel])) {
      capped.add(groqModel);
      groqModel = FALLBACK[groqModel];
      continue;
    }
    const retry = res.status === 429 || res.status >= 500 || (res.status === 400 && /tool_use_failed|validation failed/.test(body ?? ""));
    if (retry && attempt < 8) {
      // Exponential backoff with jitter, respecting retry-after when the provider sends it.
      const base = res.status === 400 ? 1 : Number(res.headers.get("retry-after")) || Math.min(2 ** attempt * 2, 60);
      await new Promise((r) => setTimeout(r, (base + Math.random() * 1.5) * 1000));
      continue;
    }
    if (!res.ok) throw new Error(`Analysis failed (${res.status}): ${body!.slice(0, 200)}`);
    const json = await res.json();
    const raw = claudeEnabled()
      ? json.content?.find((c: { type: string }) => c.type === "tool_use")?.input
      : JSON.parse(json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments ?? "null");
    if (!raw) throw new Error("Analysis returned no result");
    if (tool.name === SCORE.name) modelUsed = claudeEnabled() ? MODEL : groqModel;
    return raw;
  }
}

export async function analyze(t: Transcript): Promise<Analysis> {
  if (!t.split && t.utterances.length) {
    // Best effort: if the split pass fails, scoring still runs on the original lines.
    try {
      const raw = t.utterances.map((u, i) => `[${i}] S${u.speaker}: ${u.text}`).join("\n");
      const r = await callModel(TURNS_SYSTEM, raw, TURNS, "openai/gpt-oss-20b");
      t.utterances = fixFlip(splitTurns(t.utterances, Array.isArray(r.turns) ? r.turns : []));
      t.split = true;
    } catch (e) { console.error("split_turns failed:", (e as Error).message.slice(0, 400)); }
  }
  const who = (u: Utterance) => (t.split ? (u.speaker === 0 ? "Rep" : "Customer") : `S${u.speaker}`);
  // Free-tier requests cap near 8k tokens. On long calls, customer lines are shortened in the prompt:
  // only the rep's own words can earn credit, so evidence is unaffected.
  // Unsplit calls learn which speaker is the rep from the facts pass, so scoring can clip the rest.
  let repSpeaker = t.split ? 0 : -2;
  const cust = (u: Utterance) => (t.split ? u.speaker === 1 : repSpeaker >= 0 && u.speaker !== repSpeaker);
  const long = t.utterances.reduce((n, u) => n + u.text.length, 0) > 12000;
  const clip = (u: Utterance) => (long && cust(u) && u.text.split(" ").length > 18 ? `${u.text.split(" ").slice(0, 18).join(" ")} ...` : u.text);
  const full = () => t.utterances.map((u, i) => `[${i}] ${who(u)}: ${clip(u)}`).join("\n");
  let lines = full();
  // If a request is still too large (413), retry once with every line clipped. Quotes are still checked
  // against the full transcript lines in code, so clipping the prompt can't create false evidence.
  const compact = () => t.utterances.map((u, i) => `[${i}] ${who(u)}: ${u.text.split(" ").slice(0, cust(u) ? 8 : 20).join(" ")}`).join("\n");
  const sized = async <T,>(fn: () => Promise<T>) => { try { return await fn(); } catch (e) { if (!/\(413\)/.test(String(e))) throw e; lines = compact(); return fn(); } };
  // The lighter model handles fact extraction; each Groq model has its own free quota.
  const facts = await sized(() => callModel(CLASSIFY_SYSTEM, `Call length ${mmss(t.duration)}. Transcript (line index, speaker):\n\n${lines || "(no speech detected)"}`, CLASSIFY, "openai/gpt-oss-20b"));
  facts.call_type = normalizeType(String(facts.call_type));
  if (t.split) facts.rep_speaker = 0;
  else if (long && repSpeaker === -2) { repSpeaker = Number(facts.rep_speaker); lines = full(); }
  facts.roles = resolveRoles([], facts.rep_speaker, t.utterances);
  const cardId = CALL_TYPES[facts.call_type as CallType].scorecard;
  let graded = { steps: [], coaching: { headline: "", strengths: [], fixes: [] } };
  if (cardId) {
    const objections = facts.objections?.length ? facts.objections.map((o: { text: string; utterance: number }) => `- [${o.utterance}] ${o.text}`).join("\n") : "None";
    const context = () => `Employee name: ${facts.rep_name}. Customer objections found:\n${objections}\n\nCall length ${mmss(t.duration)}. Transcript (line index, speaker):\n\n${lines || "(no speech detected)"}`;
    // A reply with unusable steps is retried once rather than saved as a false zero.
    for (let k = 0; ; k++) {
      graded = await sized(() => callModel(scoreSystem(SCORECARDS[cardId]), context(), SCORE));
      // The scoring model reads every line, so it also decides who said each one.
      const roles = t.split ? facts.roles : resolveRoles((graded as { customer_lines?: unknown }).customer_lines, facts.rep_speaker, t.utterances);
      try { return score({ ...facts, ...graded, roles }, t.utterances); }
      catch (e) { if (k) throw e; }
    }
  }
  return score({ ...facts, ...graded }, t.utterances);
}

// Per-line roles ("R"/"C") from the model's list of customer lines; falls back to the diarized speaker.
export function resolveRoles(customerLines: unknown, repSpeaker: number, lines: Utterance[]) {
  const c = new Set(Array.isArray(customerLines) ? customerLines.filter((n) => Number.isInteger(n) && n >= 0 && n < lines.length) : []);
  if (c.size && c.size < lines.length) return lines.map((_, i) => (c.has(i) ? "C" : "R")).join("");
  return lines.map((u) => (u.speaker === repSpeaker ? "R" : "C")).join("");
}

// Models sometimes write "re-service" or "cancel"; map loose labels back to our keys.
function normalizeType(t: string): CallType {
  const k = t.toLowerCase().replace(/[^a-z_]/g, "");
  if (k in CALL_TYPES) return k as CallType;
  if (/cancel|retention|retain/.test(k)) return "retention";
  if (/reservice|callback|retreat/.test(k)) return "reservice";
  if (/schedul|appointment/.test(k)) return "scheduling";
  if (/bill|payment|invoice/.test(k)) return "billing";
  if (/sale|quote|newcustomer|lead/.test(k)) return "sales";
  if (/voicemail|spam|wrong|vendor|notscor|none/.test(k)) return "not_scorable";
  return "general";
}

// Deterministic scoring: the model judges steps, code owns the math and checks every cited quote.
export function score(raw: Omit<Analysis, "scorecard" | "score" | "score_max" | "grade" | "model" | "steps"> & { steps?: Partial<StepResult>[] }, lines: Utterance[]): Analysis {
  raw.call_type = normalizeType(String(raw.call_type));
  if (!(raw.outcome in OUTCOMES)) raw.outcome = "unresolved";
  const cardId = CALL_TYPES[raw.call_type].scorecard ?? null;
  const card = cardId ? SCORECARDS[cardId] : null;
  const noObjection = !(raw.objections?.length);
  // Only the employee's own words can earn credit.
  const repOnly = raw.roles ? lines.map((l, i) => (raw.roles![i] === "R" ? l : { ...l, text: "" })) : lines;
  // Models sometimes echo labels instead of keys, or drop keys; fall back to label, then position.
  const given = raw.steps ?? [];
  const simple = (x?: string) => (x ?? "").toLowerCase().replace(/[^a-z]/g, "");
  const findStep = (s: Scorecard["steps"][number], i: number) =>
    given.find((x) => x.key === s.key) ??
    (card!.steps.filter((c) => c.label === s.label).length === 1 ? given.find((x) => simple(x.key) === simple(s.label) || simple(x.label) === simple(s.label)) : undefined) ??
    (given.length === card!.steps.length ? given[i] : undefined);
  if (card && !card.steps.some((s, i) => findStep(s, i))) throw new Error("Scoring returned no usable steps");
  const steps: StepResult[] = (card?.steps ?? []).map((s, i) => {
    const r = findStep(s, i);
    if (s.objection && noObjection) {
      return { key: s.key, label: s.label, quadrant: s.quadrant, passed: true, auto: true, utterance: -1, quote: "", note: "No objection raised. Full credit per the scorecard rule.", verified: true };
    }
    const quote = r?.quote ?? "";
    const at = r?.passed && quote ? locateQuote(quote, r.utterance ?? -1, repOnly) : -1;
    const autoPass = !s.objection && r?.passed && norm(quote).length < 3 && /automatic|accepted|saved|bypassed/i.test(r.note ?? "");
    const verified = at >= 0 || !!autoPass;
    return {
      key: s.key,
      label: s.label,
      quadrant: s.quadrant,
      passed: !!r?.passed && verified,
      auto: !!autoPass,
      utterance: at,
      quote: at >= 0 ? quote : "",
      note: r?.passed && !verified ? "Marked done, but no matching words were found in the transcript, so no credit." : r?.note ?? "Not assessed.",
      verified,
    };
  });
  const total = card ? steps.filter((s) => s.passed).length : null;
  const labelOf = (k: string) => card?.steps.find((s) => s.key === k)?.label ?? k;
  return {
    ...raw,
    coaching: { ...raw.coaching, fixes: (raw.coaching?.fixes ?? []).map((f) => ({ ...f, step: labelOf(f.step) })) },
    objections: raw.objections ?? [],
    opportunities: raw.opportunities ?? [],
    steps,
    scorecard: cardId,
    score: total,
    score_max: card ? card.steps.length : null,
    grade: card && total !== null ? grade(card, total) : null,
    model: modelUsed,
  };
}
