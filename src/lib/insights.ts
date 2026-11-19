import type { CallRow } from "./db";
import { pct } from "./format";

export type Attention = {
  id: string;
  kind: "callback" | "cancel" | "complaint" | "coach";
  title: string;
  detail: string;
  rep: string | null;
  value: number;
  urgent: boolean;
  assignee?: string;
  message?: string;
};

// Pure aggregation over analyzed calls. No AI here: every number traces back to individual calls.
export function insights(rows: CallRow[]) {
  const done = rows.filter((r) => r.status === "done" && r.analysis);
  const scored = done.filter((r) => r.score_max);
  const sales = done.filter((r) => r.call_type === "sales");
  const retention = done.filter((r) => r.call_type === "retention");
  const booked = sales.filter((r) => r.outcome === "booked").length;
  const saved = retention.filter((r) => r.outcome === "saved").length;

  const attention: Attention[] = [];
  for (const r of done) {
    if (r.reviewed) continue;
    const a = r.analysis!;
    const who = a.customer_name || "Caller";
    const value = (a.details?.monthly_value ?? 0) * 12;
    if (r.call_type === "sales" && r.outcome !== "booked" && r.outcome !== "no_conversation") {
      attention.push({ id: r.id, kind: "callback", title: `${who} didn't book`, detail: a.follow_up?.action || a.outcome_detail, rep: r.rep, value, urgent: a.follow_up?.urgency === "today" });
    } else if (r.call_type === "retention" && r.outcome !== "saved") {
      attention.push({ id: r.id, kind: "cancel", title: `${who} cancelled`, detail: a.outcome_detail, rep: r.rep, value, urgent: true });
    } else if (a.opportunities?.some((o) => o.kind === "complaint" || o.kind === "churn_risk")) {
      const o = a.opportunities.find((o) => o.kind === "complaint" || o.kind === "churn_risk")!;
      attention.push({ id: r.id, kind: "complaint", title: `${who} is at risk`, detail: o.text, rep: r.rep, value, urgent: a.follow_up?.urgency === "today" });
    } else if (r.grade === "Below") {
      // One coaching item per rep: their weakest call.
      const prev = attention.findIndex((x) => x.kind === "coach" && x.rep === r.rep && r.rep);
      const item: Attention = { id: r.id, kind: "coach", title: `Coach ${r.rep ?? `the rep on ${r.label}`}: ${r.score}/${r.score_max}`, detail: a.coaching.headline, rep: r.rep, value: -(r.score! / r.score_max!), urgent: false };
      if (prev < 0) attention.push(item);
      else if (item.value > attention[prev].value) attention[prev] = item;
    }
  }
  attention.forEach((a) => a.kind === "coach" && (a.value = 0));
  for (const item of attention) {
    const an = done.find((r) => r.id === item.id)!.analysis!;
    item.assignee = an.task?.assignee;
    item.message = item.kind === "coach" ? undefined : an.follow_up?.message || undefined;
  }
  const order = { cancel: 0, callback: 1, complaint: 2, coach: 3 };
  attention.sort((a, b) => Number(b.urgent) - Number(a.urgent) || order[a.kind] - order[b.kind] || b.value - a.value);

  // Counted per call: a label that appears twice on one scorecard (Expectation Statement) counts once,
  // and the call missed it if any occurrence was missed. So "15 of 16 calls" is always calls.
  const steps = new Map<string, { label: string; pass: number; total: number; misses: { id: string; say: string; rep: string | null; line: number }[] }>();
  for (const r of scored) {
    const byLabel = new Map<string, boolean>();
    for (const s of r.analysis!.steps) if (!s.auto) byLabel.set(s.label, (byLabel.get(s.label) ?? true) && s.passed);
    for (const [label, passed] of byLabel) {
      const e = steps.get(label) ?? { label, pass: 0, total: 0, misses: [] };
      e.total++;
      if (passed) e.pass++;
      else {
        const fix = r.analysis!.coaching.fixes?.find((f) => f.step?.toLowerCase().includes(label.toLowerCase().split(" ")[0]));
        if (fix?.say_instead) e.misses.push({ id: r.id, say: fix.say_instead, rep: r.rep, line: fix.utterance ?? -1 });
      }
      steps.set(label, e);
    }
  }
  const breakdown = [...steps.values()].filter((s) => s.total >= 3).map((s) => ({ ...s, rate: pct(s.pass, s.total) })).sort((a, b) => a.rate - b.rate);

  const reps = new Map<string, CallRow[]>();
  for (const r of done) if (r.rep) reps.set(r.rep, [...(reps.get(r.rep) ?? []), r]);
  const team = [...reps.entries()].map(([name, calls]) => {
    const sc = calls.filter((c) => c.score_max);
    const missCount = new Map<string, number>();
    // Count calls where a step was missed, so repeated labels (two Expectation Statements) count once per call.
    sc.forEach((c) => new Set(c.analysis!.steps.filter((s) => !s.passed).map((s) => s.label)).forEach((l) => missCount.set(l, (missCount.get(l) ?? 0) + 1)));
    const weakest = [...missCount.entries()].sort((a, b) => b[1] - a[1])[0];
    const repSales = calls.filter((c) => c.call_type === "sales");
    return {
      name,
      calls: calls.length,
      avg: sc.length ? Math.round(sc.reduce((n, c) => n + pct(c.score!, c.score_max!), 0) / sc.length) : null,
      grades: { Gold: sc.filter((c) => c.grade === "Gold").length, Green: sc.filter((c) => c.grade === "Green").length, Below: sc.filter((c) => c.grade === "Below").length },
      weakest: weakest ? { label: weakest[0], misses: weakest[1], of: sc.length } : null,
      sales: repSales.length,
      booked: repSales.filter((c) => c.outcome === "booked").length,
    };
  }).sort((a, b) => b.calls - a.calls);

  const mix = new Map<string, number>();
  done.forEach((r) => mix.set(r.call_type!, (mix.get(r.call_type!) ?? 0) + 1));

  const lostCancels = attention.filter((a) => a.kind === "cancel").length;
  const openLeads = attention.filter((a) => a.kind === "callback").length;
  const top = breakdown[0];
  const avg = scored.length ? Math.round(scored.reduce((n, r) => n + pct(r.score!, r.score_max!), 0) / scored.length) : null;

  // Plain-language briefing, built from the same numbers shown below it.
  const briefing: { text: string; strong?: boolean }[][] = [
    [{ text: `${done.length} calls reviewed. ` }, { text: `${booked} of ${sales.length} sales calls booked`, strong: true }, { text: openLeads ? `, ${openLeads} still open.` : "." }],
    ...(retention.length ? [[{ text: `${saved} of ${retention.length} cancel calls saved` + (lostCancels ? ", " : ".") , strong: true }, ...(lostCancels ? [{ text: `${lostCancels} to win back.` }] : [])]] : []),
    ...(top ? [[{ text: "The step your team misses most is " }, { text: top.label, strong: true }, { text: `, on ${top.total - top.pass} of ${top.total} calls.` }]] : []),
  ];

  return {
    briefing,
    // One source of truth for counts: total = every call, done = analyzed, scored = has a scorecard, failed = errors.
    total: rows.length,
    done: done.length,
    pending: rows.filter((r) => r.status !== "done" && r.status !== "error").length,
    // Status model: these five always add up to total.
    status: {
      scored: scored.length,
      notScorable: done.length - scored.length,
      failed: rows.filter((r) => r.status === "error").length,
      processing: rows.filter((r) => r.status === "transcribing" || r.status === "analyzing").length,
      queued: rows.filter((r) => r.status === "uploaded").length,
    },
    failed: rows.filter((r) => r.status === "error").length,
    avgScore: avg,
    scored: scored.length,
    gold: scored.filter((r) => r.grade === "Gold").length,
    below: scored.filter((r) => r.grade === "Below").length,
    sales: sales.length,
    booked,
    retention: retention.length,
    saved,
    atRisk: attention.filter((a) => a.kind === "callback" || a.kind === "cancel").reduce((n, a) => n + a.value, 0),
    attention,
    breakdown,
    team,
    mix: [...mix.entries()].sort((a, b) => b[1] - a[1]),
  };
}
