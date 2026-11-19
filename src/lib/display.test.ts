import { describe, expect, it } from "vitest";
import { ago, band, bandOfPct, filterCalls, headline, plural, talkTime, verdictText } from "./display";

describe("band", () => {
  it("maps grades and splits Below by severity", () => {
    expect(band("Gold", 12, 12)).toBe("gold");
    expect(band("Green", 11, 12)).toBe("green");
    expect(band("Below", 10, 12)).toBe("close");
    expect(band("Below", 7, 12)).toBe("work");
    expect(band("Below", 3, 12)).toBe("critical");
    expect(band("Below", 0, 12)).toBe("critical");
    expect(band(null, null, null)).toBe("none");
    expect(bandOfPct(41)).toBe("critical");
    expect(bandOfPct(60)).toBe("work");
  });
});

const base = { done: 17, sales: 7, booked: 6, retention: 1, saved: 0, failed: 3, atRisk: 708, breakdown: [{ label: "Offer Final Information", pass: 1, total: 16 }] };
describe("headline", () => {
  it("leads with open revenue and the biggest leak", () => {
    const h = headline(base);
    expect(h.figure).toBe("$708 a year");
    expect(h.rest).toContain("Offer Final Information, missed on 15 of the 16 calls where it applied");
    expect(h.chips.map((c) => c.text)).toEqual(["6 of 7 sales booked", "0 of 1 cancels saved", "3 calls failed"]);
  });
  it("falls back for empty and perfect states", () => {
    expect(headline({ ...base, done: 0 }).figure).toBe("Upload a recording");
    expect(headline({ ...base, atRisk: 0, breakdown: [{ label: "Close", pass: 4, total: 4 }] }).figure).toBe("Every call is on standard.");
    expect(headline({ ...base, atRisk: 0 }).figure).toBe("Offer Final Information");
  });
  it("never uses em dashes", () => expect(JSON.stringify(headline(base))).not.toMatch(/—/));
});

const row = (p: Partial<Parameters<typeof filterCalls>[0][number]>) => ({ id: "x", label: "Call 001", status: "done" as const, call_type: "sales", rep: "Maya", score: 7, score_max: 17, grade: "Below", outcome: "quoted", duration_sec: 60, reviewed: false, created_at: "2026-10-30", ...p });
describe("filterCalls", () => {
  const rows = [row({ id: "a", label: "Call 001" }), row({ id: "b", label: "Call 002", rep: "Devon", call_type: "scheduling", score: 12, score_max: 12, grade: "Gold", outcome: "booked" }), row({ id: "c", label: "Call 003", rep: null, score: null, score_max: null, grade: null })];
  it("filters by type, rep, outcome, score range and search", () => {
    expect(filterCalls(rows, { type: "scheduling" }).map((r) => r.id)).toEqual(["b"]);
    expect(filterCalls(rows, { reps: ["Unknown"] }).map((r) => r.id)).toEqual(["c"]);
    expect(filterCalls(rows, { outcomes: ["booked"] }).map((r) => r.id)).toEqual(["b"]);
    expect(filterCalls(rows, { min: 90 }).map((r) => r.id)).toEqual(["b"]);
    expect(filterCalls(rows, { q: "devo" }).map((r) => r.id)).toEqual(["b"]);
    expect(filterCalls(rows, { attention: true }).map((r) => r.id)).toEqual(["a"]);
    expect(filterCalls([row({ id: "m", missedSteps: ["Close"] }), row({ id: "n" })], { missed: "Close" }).map((r) => r.id)).toEqual(["m"]);
    expect(filterCalls(rows, { from: "2026-11-01" })).toEqual([]);
  });
  it("sorts by score with unscored last when descending", () => {
    expect(filterCalls(rows, { sort: "score", dir: "desc" }).map((r) => r.id)).toEqual(["b", "a", "c"]);
  });
});

describe("talkTime and ago", () => {
  it("splits words by role", () => {
    expect(talkTime([{ speaker: 0, start: 0, end: 1, text: "one two three" }, { speaker: 1, start: 1, end: 2, text: "four" }], (i) => i === 0)).toEqual({ rep: 75, customer: 25 });
  });
  it("formats relative time", () => expect(ago(new Date(Date.now() - 2 * 3600e3).toISOString())).toBe("2 hours ago"));
});

describe("plural and verdictText", () => {
  it("pluralizes", () => { expect(plural(1, "call")).toBe("1 call"); expect(plural(3, "call")).toBe("3 calls"); expect(plural(0, "call")).toBe("0 calls"); });
  it("keeps official step names exactly", () => {
    const steps = [{ label: "Validate & Confidence Statement", passed: false }, { label: "Do Your Research", passed: false }, { label: "Transition Statement", passed: true }, { label: "Agree", passed: true, auto: true }];
    expect(verdictText(steps)).toBe("Missed 2 of 3 steps. Start with Validate & Confidence Statement and Do Your Research.");
  });
  it("dedupes repeated labels and handles perfect calls", () => {
    expect(verdictText([{ label: "Expectation Statement", passed: false }, { label: "Expectation Statement", passed: false }, { label: "Validate", passed: true }])).toBe("Missed 2 of 3 steps. Start with Expectation Statement.");
    expect(verdictText([{ label: "Validate", passed: true }])).toBe("Hit all 1 step.");
    expect(verdictText([])).toBeNull();
  });
});
