// Display-only helpers. Pure functions over existing data: nothing here changes how calls are scored.
import type { Utterance } from "./ai";
import type { CallRow } from "./db";
import { money, pct } from "./format";

// "Below" splits into severity bands for display, so the screen isn't all red.
export type Band = "gold" | "green" | "close" | "work" | "critical" | "none";
export function band(grade?: string | null, score?: number | null, max?: number | null): Band {
  if (!grade || score == null || !max) return "none";
  if (grade === "Gold") return "gold";
  if (grade === "Green") return "green";
  const p = score / max;
  return p >= 0.75 ? "close" : p >= 0.45 ? "work" : "critical";
}
export const BAND_LABEL: Record<Band, string> = { gold: "Gold", green: "Green", close: "Close to green", work: "Needs work", critical: "Critical", none: "Not scored" };
// Rates (pillar hit rates, booking rates) are not scores: 100% is green, not gold.
export const bandOfRate = (p: number | null): Band => (p == null ? "none" : p >= 80 ? "green" : p >= 60 ? "close" : p >= 40 ? "work" : "critical");
// Averages: green sits between the scorecards' own cutoffs (sales 14/17 = 82%, office and retention 11/12 = 92%).
export const bandOfPct = (p: number | null): Band => (p == null ? "none" : p >= 100 ? "gold" : p >= 85 ? "green" : p >= 75 ? "close" : p >= 45 ? "work" : "critical");

type Summary = {
  done: number; sales: number; booked: number; retention: number; saved: number; failed: number; atRisk: number;
  breakdown: { label: string; pass: number; total: number }[];
};
export type Headline = { lead: string; figure: string; rest: string; chips: { text: string; tone: "good" | "warn" | "bad" | "neutral" }[] };

// The Overview hero sentence, built only from real numbers, with fallbacks for empty and perfect states.
export function headline(s: Summary): Headline {
  const chips: Headline["chips"] = [];
  if (s.sales) chips.push({ text: `${s.booked} of ${s.sales} sales booked`, tone: s.booked === s.sales ? "good" : "warn" });
  if (s.retention) chips.push({ text: `${s.saved} of ${s.retention} cancels saved`, tone: s.saved === s.retention ? "good" : "bad" });
  if (s.failed) chips.push({ text: `${plural(s.failed, "call")} failed`, tone: "neutral" });
  if (!s.done) return { lead: "No calls yet. ", figure: "Upload a recording", rest: " to see what's working and what isn't.", chips };
  const leak = s.breakdown[0];
  const leakText = leak && leak.pass < leak.total ? ` Your biggest leak is ${leak.label}, ${missedOn(leak.total - leak.pass, leak.total)}.` : " Every scored step is being hit.";
  if (s.atRisk > 0) return { lead: "", figure: `${money(s.atRisk)} a year`, rest: ` is still on the table.${leakText}`, chips };
  if (leak && leak.pass < leak.total) return { lead: "Every lead is handled. ", figure: leak.label, rest: ` is the step to coach, ${missedOn(leak.total - leak.pass, leak.total)}.`, chips };
  return { lead: "", figure: "Every call is on standard.", rest: " Keep the team doing what they're doing.", chips };
}

export type CallFilter = { type?: string; q?: string; reps?: string[]; outcomes?: string[]; min?: number; max?: number; attention?: boolean; missed?: string; from?: string; to?: string; sort?: string; dir?: "asc" | "desc" };
type ListRow = Pick<CallRow, "id" | "label" | "status" | "call_type" | "rep" | "score" | "score_max" | "grade" | "outcome" | "duration_sec" | "reviewed" | "created_at"> & { summary?: string | null; customer_name?: string | null; assignee?: string | null; missedSteps?: string[] };

export function filterCalls<T extends ListRow>(rows: T[], f: CallFilter): T[] {
  const q = f.q?.toLowerCase().trim();
  const out = rows.filter((r) => {
    const p = r.score_max ? pct(r.score ?? 0, r.score_max) : null;
    return (!f.type || r.call_type === f.type)
      && (!f.reps?.length || f.reps.includes(r.rep ?? "Unknown"))
      && (!f.outcomes?.length || (r.outcome != null && f.outcomes.includes(r.outcome)))
      && (f.min == null || (p != null && p >= f.min))
      && (f.max == null || (p != null && p <= f.max))
      && (!f.attention || (r.grade === "Below" && !r.assignee && !r.reviewed))
      && (!f.missed || !!r.missedSteps?.includes(f.missed))
      && (!f.from || r.created_at.slice(0, 10) >= f.from)
      && (!f.to || r.created_at.slice(0, 10) <= f.to)
      && (!q || [r.label, r.rep, r.customer_name, r.summary].some((v) => v?.toLowerCase().includes(q)));
  });
  const key = f.sort ?? "label";
  const dir = f.dir === "desc" ? -1 : 1;
  const val = (r: T): number | string => key === "score" ? (r.score_max ? (r.score ?? 0) / r.score_max : -1)
    : key === "length" ? r.duration_sec ?? 0 : key === "date" ? r.created_at : key === "rep" ? r.rep ?? "~" : key === "type" ? r.call_type ?? "~" : key === "outcome" ? r.outcome ?? "~" : r.label;
  return out.sort((a, b) => (val(a) > val(b) ? dir : val(a) < val(b) ? -dir : a.label.localeCompare(b.label)));
}

type Scored = Pick<CallRow, "id" | "rep" | "score" | "score_max" | "analysis" | "processed_at" | "label" | "created_at">;
const scoredOnly = <T extends Scored>(rows: T[]) => rows.filter((r) => r.score_max && r.analysis?.steps?.length);

// Rep x step miss matrix for the heatmap. Repeated labels count once per call.
export function heatmap(rows: Scored[]) {
  const sc = scoredOnly(rows);
  const steps: string[] = [];
  sc.forEach((r) => r.analysis!.steps.forEach((s) => !s.auto && !steps.includes(s.label) && steps.push(s.label)));
  // Keep steps seen on 3+ calls, most missed first, so the grid shows where the team actually leaks.
  const missRate = (l: string) => { const c = sc.filter((r) => r.analysis!.steps.some((s) => s.label === l && !s.auto)); return { n: c.length, m: c.filter((r) => r.analysis!.steps.some((s) => s.label === l && !s.auto && !s.passed)).length / (c.length || 1) }; };
  steps.splice(0, steps.length, ...steps.filter((l) => missRate(l).n >= 3).sort((a, b) => missRate(b).m - missRate(a).m));
  const reps = [...new Set(sc.map((r) => r.rep ?? "Unknown"))].sort();
  const cells = reps.map((rep) => steps.map((label) => {
    const calls = sc.filter((r) => (r.rep ?? "Unknown") === rep && r.analysis!.steps.some((s) => s.label === label && !s.auto));
    const miss = calls.filter((r) => r.analysis!.steps.some((s) => s.label === label && !s.auto && !s.passed)).length;
    return { miss, of: calls.length, rate: calls.length ? miss / calls.length : null };
  }));
  return { reps, steps, cells };
}

// Team pass rate per framework pillar, with the weakest step inside it.
export function pillars(rows: Scored[]) {
  const sc = scoredOnly(rows);
  return (["Validation", "Understand", "Solve", "Verify"] as const).map((q) => {
    const all = sc.flatMap((r) => r.analysis!.steps.filter((s) => s.quadrant === q && !s.auto));
    const by = new Map<string, { pass: number; total: number }>();
    all.forEach((s) => { const e = by.get(s.label) ?? { pass: 0, total: 0 }; e.total++; if (s.passed) e.pass++; by.set(s.label, e); });
    const weakest = [...by.entries()].sort((a, b) => a[1].pass / a[1].total - b[1].pass / b[1].total)[0];
    return { name: q, rate: all.length ? pct(all.filter((s) => s.passed).length, all.length) : null, weakest: weakest?.[0] ?? null };
  });
}

// Score per call in the order calls were analyzed. Calls carry no call date, so this is honest "order", not "time".
export function trend(rows: Scored[], rep?: string) {
  return scoredOnly(rows).filter((r) => !rep || r.rep === rep)
    .sort((a, b) => (a.processed_at ?? a.created_at).localeCompare(b.processed_at ?? b.created_at) || a.label.localeCompare(b.label))
    .map((r, i) => ({ i: i + 1, id: r.id, label: r.label, rep: r.rep, pct: pct(r.score!, r.score_max!) }));
}

// Share of spoken words by rep vs customer, from the labelled transcript lines.
export function talkTime(lines: Utterance[], isRep: (i: number) => boolean) {
  let rep = 0, cust = 0;
  lines.forEach((u, i) => { const n = u.text.split(/\s+/).filter(Boolean).length; if (isRep(i)) rep += n; else cust += n; });
  const t = rep + cust;
  return t ? { rep: Math.round((rep / t) * 100), customer: 100 - Math.round((rep / t) * 100) } : null;
}

// Relative time for dates, exact time on hover.
export function ago(iso?: string | null, now = Date.now()) {
  if (!iso) return "";
  const s = Math.round((now - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const units: [number, string][] = [[86400 * 30, "month"], [86400 * 7, "week"], [86400, "day"], [3600, "hour"], [60, "minute"]];
  for (const [u, n] of units) if (s >= u) { const v = Math.floor(s / u); return `${v} ${n}${v > 1 ? "s" : ""} ago`; }
  return "just now";
}

type RepCall = Pick<CallRow, "id" | "label" | "rep" | "score" | "score_max" | "grade" | "call_type" | "outcome" | "analysis" | "processed_at" | "created_at" | "status">;
// One rep's picture: score, pillar strengths vs the team, top misses, recent calls and a coaching plan from their own coaching notes.
export function repStats(rows: RepCall[], name: string) {
  const mine = rows.filter((r) => r.rep === name && r.status === "done");
  const sc = mine.filter((r) => r.score_max && r.analysis?.steps?.length);
  const avg = sc.length ? Math.round(sc.reduce((n, r) => n + pct(r.score!, r.score_max!), 0) / sc.length) : null;
  // Team average uses analyzed calls only, the same definition as the Team average card.
  const team = pillars((rows as RepCall[]).filter((r) => r.status === "done") as Scored[]);
  const own = pillars(sc as Scored[]);
  const misses = new Map<string, number>();
  sc.forEach((r) => new Set(r.analysis!.steps.filter((s) => !s.passed && !s.auto).map((s) => s.label)).forEach((l) => misses.set(l, (misses.get(l) ?? 0) + 1)));
  // Only fixes that come with a script; a plan line without words to practice is not useful.
  const fixes = sc.flatMap((r) => r.analysis!.coaching.fixes ?? []).filter((f) => f.step && f.say_instead?.trim());
  const plan = [...new Set(fixes.map((f) => f.step))].slice(0, 3).map((step) => ({ step, say: fixes.find((f) => f.step === step)!.say_instead.trim() }));
  const series = trend(rows as Scored[], name).map((t) => t.pct);
  return {
    name, calls: mine.length, avg, series,
    delta: series.length > 1 ? series[series.length - 1] - series[0] : null,
    pillars: own.map((p, i) => ({ name: p.name, rate: p.rate, team: team[i].rate })),
    topMisses: [...misses.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([label, n]) => ({ label, n, of: sc.length })),
    recent: [...mine].sort((a, b) => (b.processed_at ?? "").localeCompare(a.processed_at ?? "")).slice(0, 6).map((c) => ({ ...c, missed: [...new Set((c.analysis?.steps ?? []).filter((s) => !s.passed && !s.auto).map((s) => s.label))] })),
    small: sc.length < 3,
    plan,
  };
}

// Steps only apply to some call types, so the denominator is the calls where the step applied.
export const missedOn = (missed: number, applied: number) => `missed on ${missed} of the ${plural(applied, "call")} where it applied`;

// "1 call", "2 calls". Every count in the UI goes through this.
export const plural = (n: number, word: string, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;

// The verdict beside the score ring. Official step names, unchanged; unique labels; scored steps only.
export function verdictText(steps: { label: string; passed: boolean; auto?: boolean }[]) {
  const scored = steps.filter((s) => !s.auto);
  if (!scored.length) return null;
  const missedSteps = scored.filter((s) => !s.passed);
  if (!missedSteps.length) return `Hit all ${plural(scored.length, "step")}.`;
  const names = [...new Set(missedSteps.map((s) => s.label))].slice(0, 2);
  return `Missed ${missedSteps.length} of ${scored.length} steps. Start with ${names.join(" and ")}.`;
}
