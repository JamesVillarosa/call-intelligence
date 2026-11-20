"use client";
import { GitCompareArrows } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { CallLite } from "@/lib/calls";
import { cn } from "@/lib/cn";
import { bandOfPct, bandOfRate, pillars, repStats } from "@/lib/display";
import type { CallRow } from "@/lib/db";
import { insights } from "@/lib/insights";
import { RepProfile } from "./rep-profile";
import { Avatar, Badge, Card, EmptyState, ScoreBar, ScoreRing, Select } from "./ui";

export function RepsView({ calls }: { calls: CallLite[] }) {
  const sp = useSearchParams(), router = useRouter(), path = usePathname();
  const names = [...new Set(calls.map((c) => c.rep).filter(Boolean))] as string[];
  const stats = names.map((n) => repStats(calls, n)).sort((a, b) => (b.avg ?? -1) - (a.avg ?? -1));
  const rep = sp.get("rep") ?? stats[0]?.name;
  const vs = sp.get("vs");
  const go = (p: Record<string, string | null>) => { const q = new URLSearchParams(sp); Object.entries(p).forEach(([k, v]) => (v ? q.set(k, v) : q.delete(k))); router.replace(`${path}?${q}`, { scroll: false }); };
  if (!stats.length) return <Card className="mt-8"><EmptyState title="No reps yet" body="Reps appear once a call where they introduce themselves is analyzed." /></Card>;

  return (
    <div className="mt-8 grid items-start gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
      <Card className="overflow-hidden lg:sticky lg:top-24">
        <p className="t-th border-b border-line px-5 py-3 text-fg-3">Team, by average score</p>
        <ul className="divide-y divide-line">
          {stats.map((r, i) => (
            <li key={r.name}>
              <button onClick={() => go({ rep: r.name, vs: vs === r.name ? null : vs })} aria-current={rep === r.name ? "true" : undefined}
                className={cn("relative flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-inset/70", rep === r.name && "bg-brand-soft")}>
                {rep === r.name && <span className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-brand-600" aria-hidden />}
                <Avatar name={r.name} size={32} />
                <span className="min-w-0 flex-1">
                  <span className="t-label flex justify-between">{r.name}<span className="num">{r.avg ?? 0}%</span></span>
                  <span className="mt-1.5 block"><ScoreBar value={r.avg ?? 0} band={bandOfPct(r.avg)} i={i} /></span>
                  <span className="t-caption num mt-1 block text-fg-3">{r.calls} call{r.calls === 1 ? "" : "s"}{r.small ? ", small sample" : ""}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Card>

      <div className="min-w-0">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <GitCompareArrows className="size-4 text-fg-3" /><span className="t-label">Compare with</span>
          <Select label="Compare with" value={vs ?? "team"} onChange={(v) => go({ vs: v === "team" ? null : v })} options={[{ value: "team", label: "Team average" }, ...names.filter((n) => n !== rep).map((n) => ({ value: n, label: n }))]} />
        </div>
        <div className="grid items-start gap-6 xl:grid-cols-2">
          {rep && <Card className="rise p-6"><RepProfile key={rep} calls={calls} name={rep} /></Card>}
          {vs ? <Card className="rise p-6"><RepProfile key={vs} calls={calls} name={vs} compact /></Card> : <Card className="rise p-6"><TeamAverage calls={calls} /></Card>}
        </div>
      </div>
    </div>
  );
}

// The default comparison: what "normal" looks like for this team.
function TeamAverage({ calls }: { calls: CallLite[] }) {
  const done = calls.filter((c) => c.status === "done");
  const s = insights(done as CallRow[]);
  const p = pillars(done as CallRow[]);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <span className="grid size-14 place-items-center rounded-xs bg-inset text-[13px] font-semibold text-fg-2">Team</span>
        <div className="min-w-0 flex-1"><h2 className="t-h2">Team average, all reps</h2><p className="t-small text-fg-2"><span className="num">{s.scored}</span> scored calls across <span className="num">{s.team.length}</span> reps</p></div>
        {s.avgScore != null && <ScoreRing value={s.avgScore} max={100} band={bandOfPct(s.avgScore)} size={64} label={`${s.avgScore}%`} />}
      </div>
      <section>
        <h3 className="t-label">Pillar hit rates</h3>
        <ul className="mt-3 flex flex-col gap-3">{p.map((x, i) => <li key={x.name}><div className="t-small mb-1.5 flex justify-between"><span>{x.name}</span><span className="num text-fg-2">{x.rate ?? 0}%</span></div><ScoreBar value={x.rate ?? 0} band={bandOfRate(x.rate)} i={i} /></li>)}</ul>
      </section>
      <section>
        <h3 className="t-label">Most missed across the team</h3>
        <ul className="mt-2 flex flex-wrap gap-2">{s.breakdown.slice(0, 5).map((b) => <li key={b.label}><Badge tone="warning">{b.label} <span className="num">{b.total - b.pass}/{b.total}</span></Badge></li>)}</ul>
      </section>
      <p className="t-small text-fg-2">Pick a rep on the left to compare. Pick another rep above to compare two reps side by side.</p>
    </div>
  );
}
