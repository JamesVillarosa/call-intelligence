"use client";
import { ArrowDown, ArrowUp, Copy, Send } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { bandOfPct, missedOn, plural } from "@/lib/display";
import { mmss } from "@/lib/format";
import { emit } from "@/lib/events";
import { Avatar, Button, Dialog, Quote, ScoreBar, Segmented } from "../ui";

type Rep = { name: string; calls: number; avg: number | null; grades: { Gold: number; Green: number; Below: number }; booked: number; sales: number; weakest: { label: string; misses: number; of: number } | null };

export function TeamBoard({ team }: { team: Rep[] }) {
  const [sort, setSort] = useState<"score" | "calls">("score");
  const rows = [...team].sort((a, b) => (sort === "score" ? (b.avg ?? -1) - (a.avg ?? -1) : b.calls - a.calls));
  return (
    <div>
      <div className="flex items-center justify-between px-5 pb-3 sm:px-6"><span className="t-caption text-fg-3">Click a rep for their profile</span><Segmented size="sm" label="Sort team" value={sort} onChange={setSort} items={[{ value: "score", label: "Score" }, { value: "calls", label: "Calls" }]} /></div>
      <ul className="divide-y divide-line border-t border-line">
        {rows.map((r, i) => {
          const total = r.grades.Gold + r.grades.Green + r.grades.Below;
          return (
            <li key={r.name}>
              <button onClick={() => emit("rep", r.name)} className="rise flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-inset/60 sm:px-6" style={{ ["--i" as string]: i }}>
                <span className="num t-caption w-4 text-fg-3">{i + 1}</span>
                <Avatar name={r.name} size={32} />
                <span className="min-w-0 flex-1">
                  <span className="t-label flex items-baseline justify-between gap-2">{r.name}<span className="num font-semibold">{r.avg ?? 0}%</span></span>
                  <span className="mt-1.5 block"><ScoreBar value={r.avg ?? 0} band={bandOfPct(r.avg)} i={i} /></span>
                  <span className="t-caption mt-1 block text-fg-2">{plural(r.calls, "call")}{total > 0 && `, ${[r.grades.Gold && `${r.grades.Gold} gold`, r.grades.Green && `${r.grades.Green} green`, r.grades.Below && `${r.grades.Below} below`].filter(Boolean).join(", ")}`}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function CoachCard({ step, missed, total, say, clip, bestHref }: { step: string; missed: number; total: number; say?: string; clip?: { src: string; start: number }; bestHref?: string }) {
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audio = useRef<HTMLAudioElement>(null);
  // Plays the moment in place: 20 seconds from where the step should have happened.
  const hear = () => {
    const el = audio.current;
    if (!el || !clip) return;
    if (!el.paused) { el.pause(); return; }
    el.currentTime = Math.max(0, clip.start - 2);
    el.play().catch(() => toast.error("Couldn't play the clip."));
  };
  const msg = `Team, this week's focus is ${step}. We missed it on ${missed} of ${total} calls.${say ? `\n\nTry this on every call:\n"${say}"` : ""}\n\nI'll listen for it on Monday.`;
  const [text, setText] = useState(msg);
  return (
    <div className="rounded-lg border border-line bg-card shadow-xs">
      <div className="p-5 sm:p-6">
        <h3 className="t-h3">Coach this week</h3>
        <p className="t-body mt-1 font-medium text-brand-fg">{step}</p>
        <p className="t-small mt-0.5 text-fg-2">{missedOn(missed, total).replace(/^m/, "M")}</p>
        {clip && <audio ref={audio} src={clip.src} preload="none" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onTimeUpdate={(e) => { if (e.currentTarget.currentTime > clip.start + 18) e.currentTarget.pause(); }} />}
        {say && <Quote className="mt-4" onPlay={clip ? hear : undefined} time={playing ? undefined : mmss(clip!.start)}>{say}</Quote>}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button size="sm" variant="primary" onClick={() => setOpen(true)}><Send />Send to team</Button>
          {bestHref && <Link href={bestHref} className="t-label px-2 text-brand-fg hover:underline">Hear a call that got it right</Link>}
        </div>
      </div>
      <Dialog open={open} onOpenChange={setOpen} title="Send this week's focus" description="No messaging integration is connected yet, so copy this into your team chat or text thread."
        footer={<><Button onClick={() => setOpen(false)}>Cancel</Button><Button variant="primary" onClick={async () => { await navigator.clipboard.writeText(text); toast.success("Message copied"); setOpen(false); }}><Copy />Copy message</Button></>}>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} aria-label="Message" className="t-small w-full rounded-sm border border-line bg-card p-3 outline-none focus:border-brand-500 focus:shadow-[var(--ring)]" />
      </Dialog>
    </div>
  );
}

// Steps as rows, reps as columns. One single-hue scale (white to rose) by miss rate; n/N in every cell.
const SCALE = [
  { max: 0, bg: "#ffffff", fg: "text-fg-2" }, { max: 0.25, bg: "#ffe4e6", fg: "text-fg" }, { max: 0.5, bg: "#fecdd3", fg: "text-fg" },
  { max: 0.75, bg: "#fb7185", fg: "text-n-900" }, { max: 1, bg: "#e11d48", fg: "text-white" },
];
const tone = (r: number) => SCALE.find((x) => r <= x.max) ?? SCALE[SCALE.length - 1];

export function Heatmap({ reps, steps: allSteps, cells }: { reps: string[]; steps: string[]; cells: { miss: number; of: number; rate: number | null }[][] }) {
  const [all, setAll] = useState(false);
  const steps = all ? allSteps : allSteps.slice(0, 8);
  return (
    <div className="pb-5">
      <p className="t-caption px-5 pb-2 text-fg-2 md:hidden">Swipe sideways to see every rep.</p>
      <div className="overflow-x-auto px-5 sm:px-6">
        <table className="w-full min-w-[640px] border-separate border-spacing-1" aria-label="Missed steps by rep">
          <thead>
            <tr>
              <th scope="col" className="t-label w-56 pb-2 text-left text-fg-2">Step</th>
              {reps.map((rep) => <th key={rep} scope="col" className="t-label pb-2 text-center font-medium text-fg-2"><span className="inline-flex flex-col items-center gap-1"><Avatar name={rep === "Unknown" ? null : rep} kind={rep === "Unknown" ? "unknown" : "person"} size={24} />{rep}</span></th>)}
            </tr>
          </thead>
          <tbody>
            {steps.map((step) => (
              <tr key={step}>
                <th scope="row" className="t-small pr-3 text-left font-medium">{step}</th>
                {reps.map((rep, ri) => {
                  const c = cells[ri][allSteps.indexOf(step)];
                  if (!c.of) return <td key={rep} className="t-small h-10 rounded-xs bg-inset text-center text-fg-3" aria-label={`${rep}, ${step}: no calls`}>-</td>;
                  const t = tone(c.rate ?? 0), small = c.of === 1;
                  return (
                    <td key={rep} className="p-0">
                      <Link href={`/calls?${new URLSearchParams({ ...(rep !== "Unknown" && { rep }), missed: step })}`} title={`${rep}, ${step}: missed on ${c.miss} of ${c.of} call${c.of > 1 ? "s" : ""}${small ? " (small sample)" : ""}`}
                        className={cn("num t-label grid h-10 place-items-center rounded-xs ring-1 ring-inset transition-transform hover:scale-105 focus-visible:scale-105", small ? "border border-dashed border-line-strong text-fg-2 ring-transparent" : cn("ring-line", t.fg))} style={{ backgroundColor: small ? "var(--card)" : t.bg }}>
                        {c.miss}/{c.of}
                      </Link>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {allSteps.length > 8 && <button onClick={() => setAll(!all)} className="t-label mx-5 mt-2 text-brand-fg hover:underline sm:mx-6">{all ? "Show the 8 most missed" : `Show all ${allSteps.length} steps`}</button>}
      <div className="t-caption mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 px-5 text-fg-2 sm:px-6">
        <span className="flex items-center gap-2">Missed on none<span className="flex">{SCALE.map((x) => <span key={x.max} className="h-3 w-7 ring-1 ring-inset ring-line first:rounded-l-full last:rounded-r-full" style={{ background: x.bg }} />)}</span>every call</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-5 rounded-xs border border-dashed border-line-strong" />One call only, small sample</span>
        <span>- No calls</span>
        <span>n/N = missed on n of the rep&rsquo;s N calls where the step applied</span>
      </div>
    </div>
  );
}

export function BreakdownBars({ rows }: { rows: { label: string; missed: number; total: number }[] }) {
  return (
    <ol className="flex flex-col gap-1 px-3 pb-4 sm:px-4">
      {rows.map((r, i) => {
        const rate = Math.round((r.missed / r.total) * 100);
        return (
          <li key={r.label}>
            <Link href={`/calls?missed=${encodeURIComponent(r.label)}`} className={cn("rise block rounded-md px-3 py-2.5 transition-colors hover:bg-inset", i === 0 && "bg-orange-soft hover:bg-orange-soft")} style={{ ["--i" as string]: i }}>
              <span className="flex items-center gap-2.5">
                <span className="num t-caption w-4 text-fg-3">{i + 1}</span>
                <span className={cn("t-small flex-1", i === 0 && "font-semibold")}>{r.label}</span>
                <span className="num t-caption text-fg-2">{r.missed} of {plural(r.total, "call")}</span>
              </span>
              <span className="ml-6.5 mt-2 block h-2 overflow-hidden rounded-full bg-inset">
                <span className="grow block h-full rounded-full" style={{ width: `${Math.max(rate, 3)}%`, background: i === 0 ? "#c2410c" : "#a5b0fc", ["--i" as string]: i }} />
              </span>
            </Link>
          </li>
        );
      })}
      <li className="t-small px-3 pt-2 text-fg-2">Each step counts only the calls where it applied, because some steps belong to one call type. Bar length is the share of those calls that missed it.</li>
    </ol>
  );
}

export function SortIcon({ dir }: { dir?: "asc" | "desc" }) {
  return dir === "asc" ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />;
}
