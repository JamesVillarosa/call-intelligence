"use client";
import Link from "next/link";
import type { CallLite } from "@/lib/calls";
import { cn } from "@/lib/cn";
import { band, bandOfPct, bandOfRate, repStats } from "@/lib/display";
import { typeLabel } from "@/lib/format";
import { Avatar, Badge, DeltaChip, ScoreBar, ScoreRing, Sparkline } from "./ui";

export function RepProfile({ calls, name }: { calls: CallLite[]; name: string; compact?: boolean }) {
  const r = repStats(calls, name);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Avatar name={name} kind="rep" size={56} />
        <div className="min-w-0 flex-1">
          <h2 className="t-h2 truncate">{name}</h2>
          <p className="t-small text-fg-2"><span className="num">{r.calls}</span> call{r.calls === 1 ? "" : "s"}{r.avg != null && <>, average score <span className="num font-medium text-fg">{r.avg}%</span></>}</p>
          {r.small && <span className="t-caption mt-1 block text-warning-fg">Small sample, treat as an early signal</span>}
        </div>
        {r.avg != null && <ScoreRing value={r.avg} max={100} band={bandOfPct(r.avg)} size={64} label={`${r.avg}%`} />}
      </div>
      <section>
        <div className="flex items-center justify-between"><h3 className="t-label">Score by call, in order analyzed</h3><DeltaChip value={r.delta} suffix=" pts" /></div>
        <div className="mt-2 rounded-md border border-line p-3">{r.series.length > 1 ? <Sparkline data={r.series} width={400} height={64} fluid label={`${name}'s score per call`} /> : <p className="t-small py-4 text-center text-fg-2">The trend appears after a second scored call.</p>}</div>
      </section>
      <section>
        <h3 className="t-label">Strengths and gaps by pillar</h3>
        <p className="t-caption text-fg-2">Bar is {name}. The tick is the team average, all reps.</p>
        <ul className="mt-3 flex flex-col gap-3">
          {r.pillars.map((p, i) => (
            <li key={p.name}>
              <div className="t-small mb-1.5 flex justify-between"><span>{p.name}</span><span className="num text-fg-2">{p.rate ?? 0}% <span className="text-fg-3">vs {p.team ?? 0}%</span></span></div>
              <span className="relative block">
                <ScoreBar value={p.rate ?? 0} band={bandOfRate(p.rate)} i={i} />
                {p.team != null && <span className="absolute -top-1 h-3.5 w-0.5 rounded-full bg-fg" style={{ left: `${p.team}%` }} aria-hidden />}
              </span>
            </li>
          ))}
        </ul>
      </section>
      {r.topMisses.length > 0 && (
        <section>
          <h3 className="t-label">Most missed steps</h3>
          <ul className="mt-2 flex flex-wrap gap-2">{r.topMisses.map((m) => <li key={m.label}><Badge tone="warning">{m.label} <span className="num">{m.n}/{m.of}</span></Badge></li>)}</ul>
        </section>
      )}
      {r.plan.length > 0 && (
        <section className="rounded-md border border-brand-line bg-brand-soft/60 p-4">
          <h3 className="t-label text-brand-fg">Suggested 1-on-1 plan</h3>
          <ol className="mt-2 flex flex-col gap-2.5">
            {r.plan.map((p, i) => <li key={p.step} className="t-small flex gap-2.5"><span className="num grid size-5 shrink-0 place-items-center rounded-full bg-brand-600 text-[11px] font-semibold text-white">{i + 1}</span><span><span className="font-medium">{p.step}.</span> <span className="text-fg-2">Practice: &ldquo;{p.say}&rdquo;</span></span></li>)}
          </ol>
        </section>
      )}
      <section>
        <h3 className="t-label">Recent calls</h3>
        <ul className="mt-2 divide-y divide-line rounded-md border border-line">
          {r.recent.map((c) => (
            <li key={c.id}><Link href={`/calls/${c.id}`} className={cn("flex items-start gap-3 px-3 py-3 hover:bg-inset")}>
              <span className="min-w-0 flex-1"><span className="t-label block truncate">{c.analysis?.customer_name || c.label}</span><span className="t-caption text-fg-3">{typeLabel(c.call_type)}</span>
                {c.missed.length > 0 && <span className="mt-1.5 flex flex-wrap gap-1">{c.missed.slice(0, 3).map((m) => <Badge key={m} size="sm">{m}</Badge>)}{c.missed.length > 3 && <span className="t-caption text-fg-3">+{c.missed.length - 3} more missed</span>}</span>}</span>
              {c.score_max ? <span className="flex items-center gap-2"><ScoreRing value={c.score ?? 0} max={c.score_max} band={band(c.grade, c.score, c.score_max)} size={32} /><span className="num t-small font-semibold">{Math.round(((c.score ?? 0) / c.score_max) * 100)}%</span></span> : <span className="t-caption text-fg-3">Not scored</span>}
            </Link></li>
          ))}
        </ul>
      </section>
    </div>
  );
}
