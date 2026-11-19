// Builds the public demo dataset: fictional calls, synthetic voices, scored by the app's own analyze().
// npx tsx --env-file=.env.local scripts/generate-demo.mts [onlyNumber]
// Each stage is cached in scripts/.demo-cache, so a rerun only redoes what failed.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { analyze, type Transcript } from "../src/lib/ai";
import { CALL_TYPES, SCORECARDS, type CallType } from "../src/lib/framework";

const CACHE = "scripts/.demo-cache", AUDIO = "public/audio", OUT = "src/data/calls.json";
mkdirSync(CACHE, { recursive: true }); mkdirSync(AUDIO, { recursive: true }); mkdirSync("src/data", { recursive: true });

const REP_VOICE: Record<string, string> = { Maya: "thalia", Devon: "apollo", Priya: "andromeda", Marcus: "arcas", Hannah: "helena" };
type Brief = { type: CallType; rep: string; customer: string; voice: string; days: number; plot: string; quality: string };
const B = (type: CallType, rep: string, customer: string, voice: string, days: number, plot: string, quality: string): Brief => ({ type, rep, customer, voice, days, plot, quality });
const BRIEFS: Brief[] = [
  B("sales", "Maya", "Karen Whitfield", "asteria", 1, "Ants trailing across the kitchen counter for a week, two kids at home. Books quarterly general pest plan, initial $189 then $49 a month.", "excellent: performs every step on the scorecard clearly"),
  B("sales", "Maya", "Luis Ortega", "orion", 4, "Spiders and earwigs around a new house. Objects that the price is high compared to a neighbor's company; Maya agrees, restates, builds value, re-closes and books.", "excellent: every step including the full objection sequence"),
  B("sales", "Devon", "Jen Albright", "luna", 2, "Mosquitoes ruining backyard evenings before a graduation party. Books monthly mosquito service at $79 per visit.", "good: everything except he never offers final information or mentions referrals"),
  B("sales", "Devon", "Robert Haines", "zeus", 9, "Wants a quote for general pest on a rental property. Devon gives the sale price without an anchor price; customer says he'll think about it. Not booked.", "average: skips the summary statement and the pricing anchor, weak re-close"),
  B("sales", "Priya", "Aisha Coleman", "athena", 6, "Scratching in the attic at night, likely rodents. Books an inspection and exclusion visit for Thursday morning.", "average: no summary statement and never checks consensus before closing"),
  B("sales", "Marcus", "Tom Becker", "orpheus", 12, "Saw a few cockroaches in the garage. Marcus quotes price immediately without questions; customer hesitates and hangs up to shop around. Not booked.", "poor: no validation, no investigation, no expectation statements, no thank you"),
  B("sales", "Hannah", "Grace Moreno", "hera", 3, "Buying a 1970s house and the inspector flagged possible termite damage. Books a termite inspection for Monday.", "good: friendly but skips both expectation statements"),
  B("retention", "Maya", "Diane Foster", "cora", 5, "Wants to cancel because money is tight this season after 3 years of service. Maya researches the account, offers to waive next month and move to every-other-month service. Customer stays.", "excellent: every retention step"),
  B("retention", "Marcus", "Kevin Shaw", "mars", 8, "Wants to cancel because he hasn't seen bugs lately. Marcus confirms the cancellation right away without looking at the account or offering anything. Cancelled.", "poor: confirms the cancellation up front, no research, no save offer, no teaser"),
  B("retention", "Priya", "Monica Reyes", "selene", 15, "Still seeing roaches two weeks after service and wants to cancel. Priya apologizes, offers a free re-service with the senior technician this week. Customer agrees to stay.", "good: misses Do Your Research"),
  B("reservice", "Devon", "Paul Nguyen", "hermes", 7, "Spiders back on the porch ten days after quarterly service. Devon books a free re-service for Wednesday afternoon.", "good: every step except Offer Final Information"),
  B("reservice", "Hannah", "Rachel Kim", "aurora", 11, "Wasps building a nest under the deck railing. Hannah books a callback treatment for tomorrow.", "average: never investigates where exactly, and forgets to thank the customer"),
  B("scheduling", "Priya", "Sam Patel", "jupiter", 0, "Needs to move Friday's service because of a work trip. Priya offers two options and rebooks for next Tuesday morning, confirms gate code and dog in yard.", "excellent: every step"),
  B("scheduling", "Marcus", "Linda Grant", "vesta", 13, "Calling to confirm tomorrow's appointment time. Marcus answers quickly and ends the call abruptly.", "poor: no validation, no conclusion, no final information"),
  B("billing", "Hannah", "Chris Dalton", "atlas", 18, "Card on file expired and autopay failed. Hannah updates the card and confirms the next charge date.", "good: misses the summary statement"),
  B("general", "Devon", "Nora Feld", "iris", 21, "Asks whether the treatment is safe for her cat and how long to keep him inside. Devon explains clearly.", "good: everything except a confidence statement"),
];

async function groq(prompt: string) {
  for (let i = 0; ; i++) {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ model: "openai/gpt-oss-120b", temperature: 0.8, response_format: { type: "json_object" }, messages: [{ role: "user", content: prompt }] }),
    }).catch(() => null);
    if (res?.ok) return JSON.parse((await res.json()).choices[0].message.content);
    if (i > 6) throw new Error(`Groq ${res?.status}: ${(await res?.text())?.slice(0, 200)}`);
    await new Promise((r) => setTimeout(r, 2 ** i * 2000));
  }
}

async function dialogue(b: Brief): Promise<{ role: "rep" | "customer"; text: string }[]> {
  const card = SCORECARDS[CALL_TYPES[b.type].scorecard!];
  const steps = card.steps.map((s) => `- ${s.label} (${s.quadrant}): ${s.pass}`).join("\n");
  const r = await groq(`Write a realistic inbound phone call transcript for a fictional pest control company, Northwind Pest Co.
Employee: ${b.rep} (first name only). Caller: ${b.customer}. Call type: ${CALL_TYPES[b.type].label}.
What happens: ${b.plot}
Employee quality: ${b.quality}.
The company grades calls on these steps:
${steps}
Make the employee pass or miss steps exactly as the quality says, naturally, never naming the steps.
Spoken style: contractions, short turns, occasional "um" or "yeah", realistic addresses, dates and prices. 18 to 34 turns, each turn 1 to 3 sentences.
The employee speaks first and greets with the company name and their name.
Return JSON: {"lines":[{"role":"rep"|"customer","text":"..."}]}`);
  return r.lines;
}

async function speak(text: string, voice: string): Promise<Buffer> {
  for (let i = 0; ; i++) {
    const res = await fetch(`https://api.deepgram.com/v1/speak?model=aura-2-${voice}-en&encoding=linear16&container=none&sample_rate=24000`, {
      method: "POST", headers: { Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`, "content-type": "application/json" }, body: JSON.stringify({ text }),
    }).catch(() => null);
    if (res?.ok) return Buffer.from(await res.arrayBuffer());
    if (i > 4) throw new Error(`Deepgram ${res?.status}: ${(await res?.text())?.slice(0, 200)}`);
    await new Promise((r) => setTimeout(r, 2 ** i * 1000));
  }
}

// One mono PCM track, speakers joined with short natural gaps; timings come straight from sample counts.
async function voice(n: string, b: Brief, lines: { role: string; text: string }[]): Promise<Transcript> {
  const RATE = 24000 * 2, parts: Buffer[] = [], utterances: Transcript["utterances"] = [];
  let t = 0.4; parts.push(Buffer.alloc(Math.round(0.4 * 24000) * 2));
  for (const [i, l] of lines.entries()) {
    const pcm = await speak(l.text, l.role === "rep" ? REP_VOICE[b.rep] : b.voice);
    const d = pcm.length / RATE;
    utterances.push({ speaker: l.role === "rep" ? 0 : 1, start: +t.toFixed(2), end: +(t + d).toFixed(2), text: l.text });
    const gap = i === lines.length - 1 ? 0.6 : 0.25 + ((i * 7919) % 40) / 100;
    parts.push(pcm, Buffer.alloc(Math.round(gap * 24000) * 2));
    t += d + gap;
  }
  const raw = `${CACHE}/${n}.pcm`;
  writeFileSync(raw, Buffer.concat(parts));
  // Telephone band so it sounds like a recorded call, small enough to ship in the repo.
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "s16le", "-ar", "24000", "-ac", "1", "-i", raw, "-af", "highpass=f=180,lowpass=f=3600", "-b:a", "40k", `${AUDIO}/${n}.mp3`]);
  return { duration: +t.toFixed(2), utterances, split: true };
}

const cached = async <T,>(file: string, make: () => Promise<T>): Promise<T> => {
  const p = `${CACHE}/${file}`;
  if (existsSync(p)) return JSON.parse(readFileSync(p, "utf8"));
  const v = await make(); writeFileSync(p, JSON.stringify(v)); return v;
};

// Plan values the model left out, so revenue at risk has real numbers.
const VALUE: Record<string, number> = { "002": 55, "004": 45, "005": 65, "006": 39, "008": 49, "009": 59, "010": 49 };
const only = process.argv[2];
const prev: Record<string, { id: string }> = existsSync(OUT) ? Object.fromEntries(JSON.parse(readFileSync(OUT, "utf8")).map((c: { label: string; id: string }) => [c.label, c])) : {};
const rows = [];
for (const [i, b] of BRIEFS.entries()) {
  const n = String(i + 1).padStart(3, "0"), label = `Call ${n}`;
  if (only && only !== n) { if (prev[label]) rows.push(prev[label]); continue; }
  console.log(label, b.type, b.rep);
  const lines = await cached(`${n}.dialogue.json`, () => dialogue(b));
  const transcript = await cached(`${n}.transcript.json`, () => voice(n, b, lines));
  const a = await cached(`${n}.analysis.json`, () => analyze(structuredClone(transcript)));
  if (a.call_type === "retention" && a.outcome === "booked") a.outcome = "saved"; // a kept customer is a save
  if (VALUE[n] && !a.details.monthly_value) a.details.monthly_value = VALUE[n];
  rows.push({
    id: prev[label]?.id ?? randomUUID(), label, audio_path: `${n}.mp3`, duration_sec: Math.round(transcript.duration), status: "done", error: null,
    transcript, analysis: a, call_type: a.call_type, rep: a.rep_name && a.rep_name !== "Unknown" ? a.rep_name : null,
    score: a.score, score_max: a.score_max, grade: a.grade, outcome: a.outcome, reviewed: false, days_ago: b.days,
  });
  console.log(`  ${a.call_type} ${a.score}/${a.score_max} ${a.grade} ${a.outcome}`);
}
writeFileSync(OUT, JSON.stringify(rows, null, 1));
console.log(`wrote ${rows.length} calls`);
