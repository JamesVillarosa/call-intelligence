import { describe, expect, it } from "vitest";
import type { Analysis, StepResult } from "./ai";
import type { CallRow } from "./db";
import { insights } from "./insights";

const step = (label: string, passed: boolean, quadrant = "Validation"): StepResult => ({ key: label, label, quadrant, passed, utterance: passed ? 0 : -1, quote: "", note: "", verified: passed });
const analysis = (p: Partial<Analysis> = {}): Analysis => ({
  call_type: "sales", type_reason: "", rep_speaker: 0, rep_name: "Maya", summary: "", outcome: "booked", outcome_detail: "", details: {}, objections: [],
  steps: [step("Validate", true), step("Close", false)], coaching: { headline: "", strengths: [], fixes: [] }, opportunities: [],
  follow_up: { needed: false, action: "", urgency: "none" }, sentiment: { start: "neutral", end: "neutral" }, scorecard: "sales", score: 1, score_max: 17, grade: "Below", model: "test", ...p,
});
let n = 0;
const call = (p: Partial<CallRow> = {}): CallRow => ({
  id: `c${++n}`, label: `Call ${n}`, audio_path: "", duration_sec: 60, status: "done", error: null, transcript: null, analysis: analysis(), call_type: "sales",
  rep: "Maya", score: 8, score_max: 17, grade: "Below", outcome: "booked", reviewed: false, created_at: "2026-10-30", processed_at: "2026-10-30", ...p,
});

describe("insights", () => {
  it("handles zero calls", () => {
    const s = insights([]);
    expect([s.total, s.done, s.scored, s.failed, s.avgScore, s.atRisk]).toEqual([0, 0, 0, 0, null, 0]);
  });
  it("handles one call", () => {
    const s = insights([call()]);
    expect([s.done, s.scored, s.sales, s.booked, s.avgScore]).toEqual([1, 1, 1, 1, 47]);
  });
  it("leaves failed calls out of every metric, even with a stale analysis", () => {
    const s = insights([call(), call({ status: "error", score: 0, score_max: 12, outcome: "lost", call_type: "retention" })]);
    expect([s.total, s.done, s.failed, s.retention, s.avgScore]).toEqual([2, 1, 1, 0, 47]);
  });
  it("averages mixed scorecards by share of points", () => {
    const s = insights([call({ score: 17, score_max: 17 }), call({ score: 6, score_max: 12, call_type: "scheduling", analysis: analysis({ call_type: "scheduling", scorecard: "office" }) })]);
    expect(s.avgScore).toBe(75);
  });
  it("counts open revenue from unbooked sales and lost cancels", () => {
    const s = insights([
      call({ outcome: "quoted", analysis: analysis({ outcome: "quoted", details: { monthly_value: 50 } }) }),
      call({ call_type: "retention", outcome: "cancelled", analysis: analysis({ call_type: "retention", outcome: "cancelled", details: { monthly_value: 40 } }) }),
    ]);
    expect(s.atRisk).toBe(1080);
    expect(s.attention.map((a) => a.kind).sort()).toEqual(["callback", "cancel"]);
  });
  it("counts miss rates per call, not per step occurrence", () => {
    const twice = analysis({ steps: [step("Expectation Statement", true), step("Expectation Statement", false, "Understand"), step("Validate", true)] });
    const s = insights([call({ analysis: twice }), call({ analysis: twice }), call({ analysis: twice })]);
    expect(s.breakdown.find((b) => b.label === "Expectation Statement")).toMatchObject({ pass: 0, total: 3 });
  });
  it("status parts always add up to the total", () => {
    const s = insights([call(), call({ status: "error" }), call({ status: "analyzing" }), call({ status: "uploaded" }), call({ call_type: "not_scorable", score: null, score_max: null, grade: null, analysis: analysis({ scorecard: null }) })]);
    const t = s.status;
    expect([t.scored, t.notScorable, t.failed, t.processing, t.queued]).toEqual([1, 1, 1, 1, 1]);
    expect(t.scored + t.notScorable + t.failed + t.processing + t.queued).toBe(s.total);
  });
  it("keeps unknown reps out of the team table", () => {
    const s = insights([call({ rep: null }), call()]);
    expect(s.team.map((t) => t.name)).toEqual(["Maya"]);
  });
});
