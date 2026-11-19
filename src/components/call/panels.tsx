"use client";
import { ChevronDown, Download, Flag, Info, Play, Send, ShieldCheck, Sparkles, Target, Wrench, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocal } from "@/lib/use-local";
import { toast } from "sonner";
import type { Analysis, StepResult, Utterance } from "@/lib/ai";
import type { CallRow } from "@/lib/db";
import { cn } from "@/lib/cn";
import { BAND_LABEL, band as bandOf, type Band } from "@/lib/display";
import { mmss, outcomeLabel, typeLabel } from "@/lib/format";
import { SCORECARDS, type Scorecard } from "@/lib/framework";
import { Badge, Button, Dialog, ProgressMeter, Quote, ScoreRing, Segmented, Tooltip, BAND_COLOR } from "../ui";

const PILLARS = [
  { name: "Validation", icon: ShieldCheck }, { name: "Understand", icon: Target }, { name: "Solve", icon: Wrench }, { name: "Verify", icon: Check },
] as const;
const definition = (card: Scorecard, key: string) => card.steps.find((s) => s.key === key)?.pass ?? "";
const FLAGS = "flagged-steps";

export function ScorecardPanel({ call, a, card, lines, onSeek, focus }: { call: CallRow; a: Analysis; card: Scorecard; lines: Utterance[]; onSeek: (i: number) => void; focus: string | null }) {
  const [only, setOnly] = useState<"all" | "missed">("all");
  const [open, setOpen] = useState<string | null>(null);
  const [flags, setFlags] = useLocal<string[]>(FLAGS, []);
  useEffect(() => { if (focus) document.getElementById(`step-${focus}`)?.scrollIntoView({ block: "center", behavior: "smooth" }); }, [focus]);
  const b = bandOf(call.grade, call.score, call.score_max);
  const max = call.score_max ?? card.gold;
  const fixFor = (s: StepResult) => a.coaching.fixes?.find((f) => f.step?.toLowerCase().startsWith(s.label.toLowerCase().split(" ")[0]));
  function flag(s: StepResult) {
    const id = `${call.id}:${s.key}`, on = !flags.includes(id), next = on ? [...flags, id] : flags.filter((x) => x !== id);
    setFlags(next);
    toast(on ? "Flagged for review. Thanks, this feeds the calibration loop." : "Flag removed");
  }

  return (
    <div className="flex flex-col gap-5 p-5 sm:p-6">
      <div className="flex items-center gap-4">
        <ScoreRing value={call.score ?? 0} max={max} band={b} size={72} label={`${call.score}/${max}`} />
        <div className="min-w-0 flex-1">
          <p className="t-h3">{card.name}</p>
          <p className="t-small text-fg-2"><span className="num font-semibold text-fg">{call.score}</span> of {max} points</p>
          {/* Labeled thresholds: Below, Green, Gold, with this call's position. */}
          <div className="mt-3" role="img" aria-label={`${call.score} of ${max}. Green from ${card.green}, Gold at ${card.gold}.`}>
            <div className="relative flex h-2.5 gap-0.5 overflow-visible">
              <span className="h-full rounded-l-full bg-danger-100" style={{ width: `${((card.green - 1) / max) * 100}%` }} />
              <span className="h-full bg-success-100" style={{ width: `${((card.gold - card.green) / max) * 100}%` }} />
              <span className="h-full flex-1 rounded-r-full bg-gold-50 ring-1 ring-inset ring-gold-400/40" />
              <span className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-card" style={{ left: `${Math.min(((call.score ?? 0) / max) * 100, 98)}%`, background: BAND_COLOR[b] }} />
            </div>
            <div className="t-caption mt-2 flex flex-wrap gap-x-3 text-fg-2">
              <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-danger-100 ring-1 ring-danger-500/30" />Below, under {card.green}</span>
              <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-success-100 ring-1 ring-success-500/30" />Green {card.green}+</span>
              <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-gold-50 ring-1 ring-gold-400/50" />Gold {card.gold}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {PILLARS.map(({ name, icon: I }) => {
          const st = a.steps.filter((s) => s.quadrant === name);
          if (!st.length) return null;
          const ok = st.filter((s) => s.passed).length;
          const pb: Band = ok === st.length ? "green" : ok / st.length >= 0.5 ? "close" : ok > 0 ? "work" : "critical";
          return (
            <button key={name} onClick={() => document.getElementById(`pillar-${name}`)?.scrollIntoView({ block: "start", behavior: "smooth" })} className="press rounded-md border border-line p-3 text-left hover:border-line-strong">
              <span className="t-label flex items-center gap-2"><I className="size-4" style={{ color: BAND_COLOR[pb] }} />{name}<span className="num ml-auto">{ok}/{st.length}</span></span>
              <span className="mt-2.5 block"><ProgressMeter value={ok} total={st.length} band={pb} /></span>
              {st.find((x) => !x.passed) && <span className="t-caption mt-2 block text-fg-2">Weakest: {st.find((x) => !x.passed)!.label}</span>}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <h3 className="t-label">Criteria</h3>
        <Segmented size="sm" label="Show criteria" value={only} onChange={setOnly} items={[{ value: "all", label: "All" }, { value: "missed", label: "Missed only", count: a.steps.filter((s) => !s.passed).length }]} />
      </div>

      {PILLARS.map(({ name }) => {
        const st = a.steps.filter((s) => s.quadrant === name && (only === "all" || !s.passed));
        if (!st.length) return null;
        return (
          <section key={name} id={`pillar-${name}`} className="scroll-mt-20">
            <h4 className="t-th mb-1 text-fg-3">{name}</h4>
            <ul className="flex flex-col">
              {st.map((s) => {
                const fix = fixFor(s), flagged = flags.includes(`${call.id}:${s.key}`), isOpen = open === s.key;
                return (
                  <li key={s.key} id={`step-${s.key}`} className={cn("scroll-mt-24 rounded-md px-2 py-3 transition-shadow", focus === s.key && "bg-brand-soft shadow-[var(--ring)]")}>
                    <div className="flex items-start gap-3">
                      <span className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded-full", s.passed ? "bg-success-500 text-white" : "bg-warning-soft text-warning-fg ring-1 ring-warning-500/40")}>{s.passed ? <Check className="size-3" strokeWidth={3} /> : <span className="text-[12px] font-bold leading-none">!</span>}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="t-label">{s.label}</span>
                          <Tooltip content={definition(card, s.key)}><button type="button" className="-m-1.5 grid size-6 place-items-center rounded-full text-fg-3 hover:bg-inset hover:text-fg-2" aria-label={`Why ${s.label} matters: ${definition(card, s.key)}`}><Info className="size-3.5" /></button></Tooltip>
                          {s.auto ? <Badge size="sm">Rule applied</Badge> : s.passed ? (s.verified ? <Badge size="sm" tone="success">Quote verified</Badge> : <Badge size="sm" tone="warning">Unverified</Badge>) : <Badge size="sm">No evidence</Badge>}
                          {flagged && <Badge size="sm" tone="info" icon={<Flag />}>Flagged</Badge>}
                        </div>
                        <p className="t-small mt-1 text-fg-2">{s.quote ? <i>&ldquo;{s.quote}&rdquo;</i> : <>Not found. {s.note}</>}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {s.utterance >= 0 && lines[s.utterance] && <button onClick={() => onSeek(s.utterance)} className="num t-caption inline-flex h-6 items-center gap-1 rounded-full bg-inset px-2 text-fg-2 hover:bg-brand-soft hover:text-brand-fg"><Play className="size-3" />{mmss(lines[s.utterance].start)}</button>}
                          {!s.passed && <button onClick={() => setOpen(isOpen ? null : s.key)} aria-expanded={isOpen} className="t-caption inline-flex h-6 items-center gap-1 rounded-full px-2 text-brand-fg hover:bg-brand-soft">Try this<ChevronDown className={cn("size-3.5 transition-transform", isOpen && "rotate-180")} /></button>}
                          <button onClick={() => flag(s)} className="t-caption ml-auto inline-flex h-6 items-center gap-1 rounded-full px-2 text-fg-3 hover:bg-inset hover:text-fg"><Flag className="size-3" />{flagged ? "Unflag" : "Flag as wrong"}</button>
                        </div>
                        {isOpen && <Quote className="rise mt-3" label={fix ? "Say this instead" : "What the manual asks for"}>{fix?.say_instead ?? definition(card, s.key)}</Quote>}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

export function CoachingPanel({ call, a, card, lines, onSeek, repName, onCoached }: { call: CallRow; a: Analysis; card: Scorecard; lines: Utterance[]; onSeek: (i: number) => void; repName: string; onCoached: () => void }) {
  const [send, setSend] = useState(false);
  const fixes = a.coaching.fixes ?? [];
  const keyOf = (step: string) => card.steps.find((s) => s.label.toLowerCase() === step.toLowerCase())?.key ?? "";
  const msg = `Hi ${repName}, quick coaching on ${call.analysis?.customer_name || call.label}:\n\n${a.coaching.headline}\n\n${fixes.map((f, i) => `${i + 1}. ${f.step}: "${f.say_instead}"`).join("\n")}`;
  return (
    <div className="flex flex-col gap-5 p-5 sm:p-6">
      <div className="rounded-md border border-brand-line bg-brand-soft/60 p-4">
        <p className="t-caption flex items-center gap-1.5 text-brand-fg"><Sparkles className="size-3.5" />Focus for {repName}</p>
        <p className="t-h3 mt-1">{a.coaching.headline}</p>
      </div>
      <h3 className="t-label">Top {fixes.length} priorities</h3>
      <ol className="flex flex-col gap-4">
        {fixes.map((f, i) => {
          const said = f.utterance >= 0 ? lines[f.utterance] : undefined;
          return (
            <li key={i} className="rise rounded-md border border-line p-4" style={{ ["--i" as string]: i }}>
              <div className="flex items-start gap-3">
                <span className="num grid size-6 shrink-0 place-items-center rounded-full bg-brand-600 text-[12px] font-semibold text-white">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="t-label">{f.step}</p>
                  <p className="t-small mt-0.5 text-fg-2">{f.what_happened}</p>
                  {definition(card, keyOf(f.step)) && (
                    <details className="group mt-2">
                      <summary className="t-label cursor-pointer list-none text-brand-fg hover:underline [&::-webkit-details-marker]:hidden">Why it matters</summary>
                      <p className="t-small mt-1.5 text-fg-2">{definition(card, keyOf(f.step))}</p>
                    </details>
                  )}
                </div>
              </div>
              {said && (
                <div className="mt-3 rounded-sm bg-inset p-3">
                  <p className="t-caption flex items-center justify-between text-fg-3">What was said<button onClick={() => onSeek(f.utterance)} className="num inline-flex items-center gap-1 text-brand-fg hover:underline"><Play className="size-3" />{mmss(said.start)}</button></p>
                  <p className="t-small mt-1 text-fg-2">&ldquo;{said.text}&rdquo;</p>
                </div>
              )}
              <Quote className="mt-3" onPlay={said ? () => onSeek(f.utterance) : undefined} time={said ? mmss(said.start) : undefined}>{f.say_instead}</Quote>
            </li>
          );
        })}
      </ol>
      {a.coaching.strengths?.length > 0 && (
        <div className="rounded-md border border-success-500/30 bg-success-soft p-4">
          <h3 className="t-label text-success-fg">What went well</h3>
          <ul className="mt-2 flex flex-col gap-2">{a.coaching.strengths.map((s, i) => <li key={i} className="t-small flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-success-fg" />{s.text}</li>)}</ul>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={() => setSend(true)}><Send />Send to {repName}</Button>
        <Button onClick={onCoached}><Check />Mark as coached</Button>
      </div>
      <Dialog open={send} onOpenChange={setSend} title={`Send coaching to ${repName}`} description="No messaging integration is connected yet, so copy this into your team chat."
        footer={<><Button onClick={() => setSend(false)}>Cancel</Button><Button variant="primary" onClick={async () => { await navigator.clipboard.writeText(msg); toast.success("Copied"); setSend(false); }}>Copy message</Button></>}>
        <p className="t-small whitespace-pre-wrap rounded-md bg-inset p-4">{msg}</p>
      </Dialog>
    </div>
  );
}

function Table({ data, title }: { data: [string, React.ReactNode][]; title: string }) {
  return <section><h3 className="t-th mb-2 text-fg-3">{title}</h3><dl className="divide-y divide-line rounded-md border border-line">{data.map(([k, v]) => <div key={k} className="grid grid-cols-[120px_1fr] gap-3 px-3 py-2.5"><dt className="t-caption pt-0.5 text-fg-3">{k}</dt><dd className="t-small">{v}</dd></div>)}</dl></section>;
}

export function DetailsPanel({ call, a, lines, repName, account }: { call: CallRow; a: Analysis; lines: Utterance[]; repName: string; account?: string }) {
  const rows: [string, React.ReactNode][] = [
    ["Call", call.label], ["Call ID", <span key="id" className="flex items-center gap-2"><code className="t-caption truncate text-fg-3">{call.id}</code><button type="button" onClick={async () => { await navigator.clipboard.writeText(call.id); toast.success("Call ID copied"); }} className="t-caption shrink-0 rounded-xs px-1.5 py-0.5 text-brand-fg hover:bg-brand-soft">Copy</button></span>],
    ["Added", new Date(call.created_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })], ["Length", <span key="l" className="num">{mmss(call.duration_sec)}</span>],
    ["Type", typeLabel(a.call_type)], ["Why this type", a.type_reason], ["Outcome", outcomeLabel(a.outcome)], ["Rep", repName], ["Customer", a.customer_name || "Not said on the call"],
    ...(account ? [["Account", account] as [string, React.ReactNode]] : []),
    ...(a.objections.length ? [["Objections", a.objections.map((o) => o.text).join("; ")] as [string, React.ReactNode]] : []),
    ...(a.opportunities.length ? [["Opportunities", a.opportunities.map((o) => o.text).join("; ")] as [string, React.ReactNode]] : []),
  ];
  const audit: [string, React.ReactNode][] = [
    ["Scorecard", a.scorecard ? SCORECARDS[a.scorecard].name : "Not scorable"], ["Scored by", a.model], ["Scored at", call.processed_at ? new Date(call.processed_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "Not yet"],
    ["Evidence", `${a.steps.filter((s) => s.passed && s.verified).length} of ${a.steps.filter((s) => s.passed).length} passed steps backed by a verified quote`],
    ["Grade", call.grade ? `${call.grade} (${BAND_LABEL[bandOf(call.grade, call.score, call.score_max)]})` : "Not scored"],
  ];
  return (
    <div className="flex flex-col gap-6 p-5 sm:p-6">
      <Table title="Call" data={rows} />
      <details className="group rounded-md border border-line">
        <summary className="t-label flex cursor-pointer list-none items-center justify-between px-3 py-2.5 text-fg-2 hover:bg-inset [&::-webkit-details-marker]:hidden">Scoring audit<span className="t-caption text-fg-3 group-open:hidden">Show</span></summary>
        <div className="border-t border-line p-3"><Table title="How this call was scored" data={audit} /></div>
      </details>
      <Button onClick={() => { const t = lines.map((u, i) => `[${mmss(u.start)}] ${a.roles?.[i] === "R" ? repName : "Customer"}: ${u.text}`).join("\n"); const url = URL.createObjectURL(new Blob([t], { type: "text/plain" })); Object.assign(document.createElement("a"), { href: url, download: `${call.label}.txt` }).click(); URL.revokeObjectURL(url); }}><Download />Download raw transcript</Button>
      <p className="t-caption text-fg-3">Re-scoring replaces this result; the latest run is shown. Every passed step must quote the rep&rsquo;s own words, checked against the transcript.</p>
    </div>
  );
}
