"use client";
import { ChevronLeft, ChevronRight, Ellipsis, Link2, Pause, Play, Printer, RefreshCw, TriangleAlert, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { CallRow } from "@/lib/db";
import { cn } from "@/lib/cn";
import { band as bandOf, talkTime, verdictText } from "@/lib/display";
import { recent } from "@/lib/events";
import { mmss, money, STATUS_LABEL } from "@/lib/format";
import { SCORECARDS } from "@/lib/framework";
import { Outcome, TypeChip } from "../call-meta";
import { Avatar, Badge, Button, Card, IconButton, Kbd, Menu, ScoreRing, Tabs, Tooltip } from "../ui";
import { CoachingPanel, DetailsPanel, ScorecardPanel } from "./panels";
import { Player } from "./player";
import { Transcript } from "./transcript";

type Tab = "score" | "coach" | "details";

export function CallDetail({ call, prev, next, index, total }: { call: CallRow; prev?: string; next?: string; index: number; total: number }) {
  const router = useRouter();
  const audio = useRef<HTMLAudioElement>(null);
  const [now, setNow] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [task, setTask] = useState(call.analysis?.task ?? {});
  const [tab, setTab] = useState<Tab>("score");
  const [focus, setFocus] = useState<string | null>(null);
  const a = call.analysis;
  const lines = useMemo(() => call.transcript?.utterances ?? [], [call.transcript]);
  const duration = call.duration_sec ?? call.transcript?.duration ?? 0;
  const active = lines.findIndex((u, i) => now >= u.start && now < (lines[i + 1]?.start ?? u.end + 1));
  const isRep = (i: number) => (a?.roles ? a.roles[i] === "R" : a?.rep_speaker === lines[i]?.speaker);
  const repName = a?.rep_name && a.rep_name !== "Unknown" ? a.rep_name : "Rep";
  const card = a?.scorecard ? SCORECARDS[a.scorecard] : null;
  const b = bandOf(call.grade, call.score, call.score_max);
  const verdict = card ? verdictText(a?.steps ?? []) : null;
  const account = (a?.outcome_detail + " " + a?.summary).match(/account\s*(?:number\s*)?#?\s*(\d{3,})/i)?.[1];
  const assignee = call.rep ?? "Office";
  const talk = useMemo(() => talkTime(lines, isRep), [lines]); // eslint-disable-line react-hooks/exhaustive-deps
  const markers = [
    ...(a?.steps ?? []).filter((s) => s.passed && s.utterance >= 0 && lines[s.utterance]).map((s) => ({ t: lines[s.utterance].start, label: s.label, quote: s.quote, passed: true })),
    // Missed steps have no line of their own; coaching says where they should have happened.
    ...(a?.coaching.fixes ?? []).filter((f) => f.utterance >= 0 && lines[f.utterance]).map((f) => ({ t: lines[f.utterance].start, label: `${f.step} missed`, quote: f.say_instead, passed: false })),
  ];

  useEffect(() => { recent.add(call.id); }, [call.id]);
  // Deep links like ?line=12 (from "Hear it") cue the audio to that line once it can play.
  useEffect(() => {
    const n = Number(new URLSearchParams(location.search).get("line"));
    const el = audio.current;
    if (!el || !Number.isInteger(n) || !lines[n]) return;
    const go = () => { el.currentTime = lines[n].start; };
    if (el.readyState >= 1) go(); else el.addEventListener("loadedmetadata", go, { once: true });
  }, [lines]);
  useEffect(() => {
    if (call.status === "done" || call.status === "error") return;
    const t = setInterval(() => router.refresh(), 2500);
    return () => clearInterval(t);
  }, [call.status, router]);

  const seekLine = (i: number) => { if (lines[i] && audio.current) { audio.current.currentTime = lines[i].start; audio.current.play().catch(() => {}); } };
  const seekBy = (d: number) => { if (audio.current) audio.current.currentTime = Math.max(0, Math.min(duration, audio.current.currentTime + d)); };
  const toggle = () => { const el = audio.current; if (!el) return; if (el.paused) el.play(); else el.pause(); };
  const ctl = {
    seek: (t: number) => { if (audio.current) audio.current.currentTime = t; },
    toggle,
    rate: (r: number) => { if (audio.current) audio.current.playbackRate = r; },
    volume: (v: number, muted: boolean) => { if (audio.current) { audio.current.volume = v; audio.current.muted = muted; } },
  };

  // Space plays, arrows seek, J/K move between calls.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea, select, button, a, [role=dialog], [role=menu], [role=slider]") || e.metaKey || e.ctrlKey) return;
      if (e.key === " ") { e.preventDefault(); toggle(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); seekBy(e.shiftKey ? -15 : -5); }
      else if (e.key === "ArrowRight") { e.preventDefault(); seekBy(e.shiftKey ? 15 : 5); }
      else if (e.key === "j" && next) router.push(`/calls/${next}`);
      else if (e.key === "k" && prev) router.push(`/calls/${prev}`);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  async function rerun() {
    setBusy(true);
    const t = toast.loading("Re-scoring. This takes about a minute.");
    const r = await fetch(`/api/calls/${call.id}/process`, { method: "POST" });
    setBusy(false);
    toast[r.ok ? "success" : "error"](r.ok ? "Re-scored with the latest model" : "Re-score didn't finish. Try again in a minute.", { id: t });
    router.refresh();
  }
  async function update(body: { assignee?: string; done?: boolean }, msg: string) {
    const before = task;
    setTask({ ...task, ...body });
    const r = await fetch(`/api/calls/${call.id}`, { method: "PATCH", body: JSON.stringify(body) });
    if (!r.ok) { setTask(before); toast.error("Couldn't save. Try again."); return; }
    toast.success(msg, body.done ? { action: { label: "Undo", onClick: () => update({ done: false }, "Reopened") } } : undefined);
    router.refresh();
  }
  const onStep = (key: string) => { setTab("score"); setFocus(key); setTimeout(() => setFocus(null), 1800); };
  const primary = task.done ? <Button onClick={() => update({ done: false }, "Reopened")}>Reopen</Button>
    : task.assignee ? <Button variant="primary" onClick={() => update({ done: true }, "Marked done")}>Mark done</Button>
    : <Button variant="primary" onClick={() => update({ assignee }, `Assigned to ${assignee}`)}><UserPlus />Assign to {assignee}</Button>;

  return (
    <div className="mx-auto max-w-[1320px] px-4 pb-28 pt-6 sm:px-8 lg:pb-12">
      <audio ref={audio} src={`/api/calls/${call.id}/audio`} preload="metadata" onTimeUpdate={(e) => setNow(e.currentTarget.currentTime)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} />

      <div className="mb-4 flex items-center gap-2">
        <Tooltip content="Previous call (K)"><Link aria-disabled={!prev} href={prev ? `/calls/${prev}` : "#"} className={cn("press grid size-9 place-items-center rounded-sm border border-line bg-card hover:bg-inset", !prev && "pointer-events-none opacity-40")} aria-label="Previous call"><ChevronLeft className="size-4" /></Link></Tooltip>
        <Tooltip content="Next call (J)"><Link aria-disabled={!next} href={next ? `/calls/${next}` : "#"} className={cn("press grid size-9 place-items-center rounded-sm border border-line bg-card hover:bg-inset", !next && "pointer-events-none opacity-40")} aria-label="Next call"><ChevronRight className="size-4" /></Link></Tooltip>
        <span className="num t-small text-fg-2">{index} of {total}</span>
        <span className="t-caption ml-2 hidden items-center gap-1 text-fg-3 sm:flex"><Kbd>J</Kbd><Kbd>K</Kbd> to move</span>
      </div>

      <header className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <h1 className="t-h1 break-words">{a?.customer_name || call.label}</h1>
          {a?.customer_name && <p className="t-small mt-0.5 text-fg-3">{call.label}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {a && <TypeChip type={a.call_type} />}
            {a && <Badge size="md"><Outcome outcome={a.outcome} /></Badge>}
            <Menu align="start" label="Rep" trigger={<button className="press t-small inline-flex h-7 items-center gap-2 rounded-xs border border-line bg-card pl-1 pr-3 hover:bg-inset"><Avatar name={call.rep} kind={call.rep ? "rep" : "unknown"} size={22} />{call.rep ?? "Rep unknown"}</button>}
              items={[{ label: `Assign follow-up to ${call.rep ?? "rep"}`, onSelect: () => call.rep && update({ assignee: call.rep }, `Assigned to ${call.rep}`) }, { label: "Assign follow-up to Office", onSelect: () => update({ assignee: "Office" }, "Assigned to Office") }]} />
            <Badge size="md"><span className="num">{mmss(duration)}</span></Badge>
            <Badge size="md">{new Date(call.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</Badge>
            {account && <Badge size="md">Account {account}</Badge>}
            {task.assignee && !task.done && <Badge tone="brand" size="md">Assigned to {task.assignee}</Badge>}
            {task.done && <Badge tone="success" size="md" className="pop">Done</Badge>}
          </div>
        </div>
        <div className="flex flex-col gap-4 lg:items-end">
          {call.status === "done" && (
            <div className="flex flex-wrap gap-2">
              <Button onClick={rerun} loading={busy}>{!busy && <RefreshCw />}{busy ? "Re-scoring" : "Re-score"}</Button>
              {primary}
              <Menu label="More" trigger={<IconButton label="More actions" variant="secondary"><Ellipsis /></IconButton>} items={[
                { label: "Copy link", icon: <Link2 />, onSelect: async () => { await navigator.clipboard.writeText(location.href); toast.success("Link copied"); } },
                { label: "Print or save as PDF", icon: <Printer />, onSelect: () => window.print() },
              ]} />
            </div>
          )}
          {card && call.score_max ? (
            <div className="flex items-center gap-4">
              <p className="t-small max-w-60 text-fg-2 lg:text-right">{verdict}</p>
              <ScoreRing value={call.score ?? 0} max={call.score_max} band={b} size={80} stroke={8} label={`${Math.round(((call.score ?? 0) / call.score_max) * 100)}%`} sub={`${call.score}/${call.score_max}`} />
            </div>
          ) : a ? <Badge size="lg">Not scorable</Badge> : null}
        </div>
      </header>

      {call.status !== "done" && (
        <Card className={cn("mt-6 flex items-center gap-3 p-4", call.status === "error" && "border-danger-500/40 bg-danger-soft")}>
          {call.status === "error" ? <><TriangleAlert className="size-5 text-danger-fg" /><p className="t-small flex-1"><b>Processing didn&rsquo;t finish.</b> {call.error}</p><Button size="sm" onClick={rerun} loading={busy}>Retry</Button></>
            : <><span className="pulse-dot size-2.5 rounded-xs bg-brand-500" /><p className="t-small font-medium">{STATUS_LABEL[call.status]}. This page fills in by itself.</p></>}
        </Card>
      )}

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,58fr)_minmax(0,42fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          {a && (
            <Card className="rise p-5 sm:p-6">
              <h2 className="t-h3">Summary</h2>
              <p className="t-body mt-1 text-fg-2">{a.summary}</p>
              <div className="mt-4 rounded-md bg-inset p-4"><p className="t-caption text-fg-3">Outcome</p><p className="t-small mt-0.5 font-medium">{a.outcome_detail}</p></div>
              <div className="mt-4 flex flex-wrap gap-2 [&>span]:h-auto [&>span]:min-h-7 [&>span]:whitespace-normal [&>span]:py-1">
                {a.details?.pests?.length ? <Badge size="lg">Pests: {a.details.pests.join(", ")}</Badge> : null}
                {a.details?.service && <Badge size="lg">Service: {a.details.service}</Badge>}
                {a.details?.price_quoted && <Badge size="lg">Quoted: {a.details.price_quoted}</Badge>}
                {a.details?.appointment && <Badge size="lg">Appointment: {a.details.appointment}</Badge>}
                {(a.details?.monthly_value ?? 0) > 0 && <Badge size="lg" tone="warning"><span className="num">{money((a.details!.monthly_value ?? 0) * 12)}/yr value</span></Badge>}
                {a.details?.wins?.length ? <Badge size="lg" tone="mint">Cares about: {a.details.wins.join(", ")}</Badge> : null}
              </div>
              {a.follow_up?.needed && <p className="t-small mt-4 rounded-md border border-line-strong p-3"><b className="text-fg">Next step{a.follow_up.urgency === "today" ? ", due today" : ""}: </b>{a.follow_up.action}</p>}
            </Card>
          )}
          <Card className="rise p-5 sm:p-6" style={{ ["--i" as string]: 1 }}>
            <Player src={`/api/calls/${call.id}/audio`} id={call.id} duration={duration} now={now} playing={playing} ctl={ctl} markers={markers} talk={talk} repName={repName} />
          </Card>
          <Card className="rise overflow-hidden pt-5" style={{ ["--i" as string]: 2 }}>
            <h2 className="t-h3 mb-4 px-5 sm:px-6">Transcript</h2>
            <Transcript lines={lines} isRep={isRep} repName={repName} steps={a?.steps ?? []} active={playing || now > 0 ? active : -1} follow={playing} onSeek={seekLine} onStep={onStep} title={call.label} />
          </Card>
        </div>

        {a && (
          <Card className="rise flex flex-col overflow-hidden lg:h-[calc(100dvh-7rem)] lg:min-h-[560px]" style={{ ["--i" as string]: 1 }}>
            <div className="flex-none border-b border-line px-5 sm:px-6">
              <Tabs className="border-0" label="Call analysis" value={tab} onChange={setTab} items={[...(card ? [{ value: "score" as Tab, label: "Scorecard" }, { value: "coach" as Tab, label: "Coaching", count: a.coaching.fixes?.length }] : []), { value: "details" as Tab, label: "Details" }]} />
            </div>
            <div key={tab} className="rise min-h-0 flex-1 overflow-y-auto">
              {tab === "score" && card && <ScorecardPanel call={call} a={a} card={card} lines={lines} onSeek={seekLine} focus={focus} />}
              {tab === "coach" && card && <CoachingPanel call={call} a={a} card={card} lines={lines} onSeek={seekLine} repName={repName} onCoached={() => update({ done: true }, "Marked as coached")} />}
              {(tab === "details" || !card) && <DetailsPanel call={call} a={a} lines={lines} repName={repName} account={account} />}
            </div>
          </Card>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t border-line bg-elevated/95 p-3 backdrop-blur lg:hidden">
        <Button variant="secondary" className="flex-1" onClick={toggle}>{playing ? <Pause /> : <Play />}{playing ? "Pause" : "Play"}</Button>
        <div className="flex-1 [&>button]:w-full">{call.status === "done" && primary}</div>
      </div>
    </div>
  );
}
