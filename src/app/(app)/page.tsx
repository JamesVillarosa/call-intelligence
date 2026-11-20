import { ArrowRight, CalendarCheck, CircleDollarSign, Gauge, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { CallMix, ScoreTrend } from "@/components/overview/lazy";
import { BreakdownBars, CoachCard, Heatmap, TeamBoard } from "@/components/overview/panels";
import { TodoQueue } from "@/components/overview/todo";
import { DateFilter, UploadTrigger } from "@/components/page-bits";
import { Badge, buttonStyles, Card, CardHeader, CountUp, EmptyState, KpiCard, ScoreRing } from "@/components/ui";
import { BAND_LABEL, bandOfPct, filterCalls, headline, heatmap, pillars, trend } from "@/lib/display";
import { CountLine } from "@/components/page-bits";
import { listCalls } from "@/lib/calls";
import { allCalls } from "@/lib/db";
import type { CallRow } from "@/lib/db";
import { pct, typeLabel } from "@/lib/format";
import { CALL_TYPES } from "@/lib/framework";
import { insights, type Attention } from "@/lib/insights";

export const metadata = { title: "Overview" };
export const dynamic = "force-dynamic";


export default async function Overview({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const sp = await searchParams;
  const all = await listCalls();
  const rows = filterCalls(all.map((c) => ({ ...c, summary: c.analysis?.summary })), { from: sp.from, to: sp.to }) as unknown as CallRow[];
  const s = insights(rows);
  const h = headline(s);
  const header = (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
      <div className="min-w-0 flex-1">
        <h1 className="t-h1">Overview</h1>
        <p className="t-body mt-1 text-fg-2"><CountLine total={s.total} status={s.status} /></p>
      </div>
      <div className="flex flex-wrap items-center gap-2"><DateFilter /><Link href="/calls" className={buttonStyles({ variant: "secondary" })}>All calls</Link><UploadTrigger /></div>
    </div>
  );

  if (!s.done) {
    return (
      <div className="mx-auto max-w-[1320px] px-4 py-8 sm:px-8">
        {header}
        <Card className="mt-8"><EmptyState title="Upload your first call" body="You'll get the transcript, call type and outcome, a score against your call manuals, and coaching for the rep." action={<UploadTrigger />} /></Card>
      </div>
    );
  }

  // Failed calls can still carry an older analysis; charts and rates use analyzed calls only.
  const done = rows.filter((r) => r.status === "done");
  const ordered = trend(done);
  const byId = new Map(done.map((r) => [r.id, r]));
  const inOrder = ordered.map((t) => byId.get(t.id)!);
  const sales = inOrder.filter((r) => r.call_type === "sales");
  const saves = inOrder.filter((r) => r.call_type === "retention");
  const listOf = (rs: CallRow[]) => rs.slice(0, 6).map((r) => r.analysis?.customer_name || r.label).join(", ") + (rs.length > 6 ? ` and ${rs.length - 6} more` : "");
  const bookingRate = pct(s.booked, s.sales);
  const avgBand = bandOfPct(s.avgScore);
  const pill = pillars(done);
  const heat = heatmap(done);
  const top = s.breakdown[0];
  const best = top ? done.filter((r) => r.analysis?.steps?.some((x) => x.label === top.label && x.passed)).sort((a, b) => (b.score ?? 0) / (b.score_max || 1) - (a.score ?? 0) / (a.score_max || 1))[0] : undefined;
  const reps = [...new Set(ordered.map((t) => t.rep).filter(Boolean))] as string[];
  // Exact seconds for the coach card: where the example missed the step, and where the best call hit it.
  const ex = top?.misses.find((m) => m.line >= 0) ?? top?.misses[0];
  const hitLine = best?.analysis?.steps.find((x) => x.label === top?.label && x.passed && x.utterance >= 0)?.utterance ?? -1;
  const tx = (await allCalls()).filter((c) => c.id === ex?.id || c.id === best?.id);
  const startOf = (id?: string, line = -1) => (tx?.find((t) => t.id === id)?.transcript as CallRow["transcript"])?.utterances[line]?.start;
  const exStart = ex && ex.line >= 0 ? startOf(ex.id, ex.line) : undefined;
  const closed: Attention[] = rows.filter((r) => r.analysis?.task?.done).map((r) => ({
    id: r.id, kind: r.call_type === "retention" ? "cancel" : r.call_type === "sales" && r.outcome !== "booked" ? "callback" : "coach",
    title: r.analysis!.customer_name || r.label, detail: r.analysis!.follow_up?.action || r.analysis!.coaching.headline, rep: r.rep,
    value: (r.analysis!.details?.monthly_value ?? 0) * 12, urgent: false, assignee: r.analysis!.task?.assignee,
  }));
  const typeLabels = Object.fromEntries(Object.keys(CALL_TYPES).map((k) => [k, typeLabel(k)]));
  const cta = s.failed ? { href: "/calls?status=error", text: `Review ${s.failed} call${s.failed > 1 ? "s" : ""} to retry` } : { href: "/calls?attention=1", text: "Review calls that need attention" };

  return (
    <div className="mx-auto flex max-w-[1320px] flex-col gap-6 px-4 py-8 sm:px-8">
      {header}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <KpiCard i={1} icon={<CalendarCheck />} label="Booking rate" help={`Sales calls that ended booked. ${listOf(sales)}.`} href="/calls?type=sales"
          value={s.sales ? <CountUp value={bookingRate} suffix="%" /> : "None"} denom={`${s.booked} of ${s.sales} sales calls`} />
        <KpiCard i={2} icon={<ShieldCheck />} label="Cancels saved" help={s.retention ? `Cancellation calls where the customer stayed. ${listOf(saves)}.` : "No cancellation calls yet."} href="/calls?type=retention"
          value={s.retention ? <><CountUp value={s.saved} /><span className="text-fg-3">/{s.retention}</span></> : "None"} denom={s.retention ? `${pct(s.saved, s.retention)}% of cancel calls` : "No cancel calls yet"} />
        <KpiCard i={3} icon={<Gauge />} label="Average score" help="Each scored call's points as a share of its scorecard (Sales 17, Office 12, Retention 12), averaged." href="/calls?sort=score&dir=asc"
          value={s.avgScore == null ? "None" : <CountUp value={s.avgScore} suffix="%" />} denom={`${s.gold} gold, ${s.below} below standard`} />
        <KpiCard i={4} icon={<CircleDollarSign />} label="Open revenue" help="Yearly value of unbooked sales leads and unsaved cancels, from the monthly price said on each call." href="/#todo"
          value={<CountUp value={s.atRisk} prefix="$" />} denom="per year, still on the table" />
      </div>

      <section className="grid gap-6 lg:grid-cols-12" aria-label="Summary">
        <div className="bg-hero rise relative isolate overflow-hidden rounded-xl p-6 text-white shadow-lg sm:p-8 lg:col-span-8" style={{ ["--i" as string]: 5 }}>
          <span aria-hidden className="absolute -right-24 -top-24 -z-10 size-80 rounded-full border-[40px] border-white/[.06]" />
          <span aria-hidden className="absolute -bottom-32 right-24 -z-10 size-72 rounded-full bg-cyan-400/30 blur-3xl" />
          <svg aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-28 w-full opacity-30" viewBox="0 0 400 100" preserveAspectRatio="none"><path d="M0 70 C40 40 80 90 120 60 S200 20 240 50 320 90 400 40" fill="none" stroke="white" strokeWidth="1.5" /><path d="M0 85 C50 60 90 100 140 75 S220 45 270 70 340 95 400 60" fill="none" stroke="white" strokeWidth="1" strokeOpacity=".6" /></svg>
          <p className="text-[13px] font-semibold text-white/70">This period at Northwind Pest Co.</p>
          <h2 className="mt-2 max-w-[24ch] text-[26px] font-bold leading-[32px] tracking-[-0.03em] sm:max-w-[30ch] sm:text-[34px] sm:leading-[40px]">{h.lead}<span className="bg-gradient-to-r from-cyan-300 to-white bg-clip-text text-transparent">{h.figure}</span>{h.rest}</h2>
          <div className="mt-5 flex flex-wrap gap-2">{h.chips.map((c) => <span key={c.text} className="inline-flex h-7 items-center gap-1.5 rounded-full bg-white/12 px-3 text-[13px] font-semibold ring-1 ring-white/15 backdrop-blur"><span className={`size-2 rounded-full ${c.tone === "good" ? "bg-success-500" : c.tone === "bad" ? "bg-danger-500" : c.tone === "warn" ? "bg-warning-500" : "bg-white/60"}`} />{c.text}</span>)}</div>
          <div className="mt-7 flex flex-wrap gap-2">
            <Link href={cta.href} className="press group inline-flex h-11 items-center gap-2 rounded-full bg-white pl-5 pr-1.5 text-[14px] font-bold text-brand-700 shadow-lg hover:bg-white/95">{cta.text}<span className="grid size-8 place-items-center rounded-full bg-brand-500 text-white transition-transform duration-300 ease-[var(--ease-out)] group-hover:translate-x-0.5"><ArrowRight className="size-4" /></span></Link>
            <Link href="#coach" className="press inline-flex h-11 items-center rounded-full px-5 text-[14px] font-bold text-white ring-1 ring-white/30 hover:bg-white/10">See coaching plan</Link>
          </div>
        </div>
        {s.avgScore != null && (
          <div className="surface rise flex flex-col rounded-xl p-6 lg:col-span-4" style={{ ["--i" as string]: 6 }}>
            <h2 className="t-h3">Team average</h2>
            <p className="t-small text-fg-2">Across {s.scored} scored calls</p>
            <div className="my-auto flex justify-center pt-6"><ScoreRing value={s.avgScore} max={100} band={avgBand} size={168} stroke={14} label={`${s.avgScore}%`} /></div>
            <div className="mt-6 flex items-center justify-between rounded-lg bg-inset px-4 py-3">
              <span className="t-caption text-fg-3">0%</span>
              <span className="text-center"><span className="t-label block">{BAND_LABEL[avgBand]}</span><span className="t-caption text-fg-3">{s.gold} gold, {s.below} below</span></span>
              <span className="t-caption text-fg-3">100%</span>
            </div>
          </div>
        )}
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-12">
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-8">
          <Card className="rise"><CardHeader title="Score trend" sub="Each point is one call's score, in the order calls were analyzed. Click a point to open the call." /><div className="px-5 pb-5 pt-4 sm:px-6"><ScoreTrend points={ordered} reps={reps} /></div></Card>

          <section aria-label="Framework health">
            <h2 className="t-h3 mb-3">Framework health</h2>
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
              {pill.map((p, i) => (
                <Link key={p.name} href={p.weakest ? `/calls?missed=${encodeURIComponent(p.weakest)}` : "/calls"} className="rise lift surface flex flex-col items-start rounded-xl p-5" style={{ ["--i" as string]: i }}>
                  <p className="t-label">{p.name}</p><div className="mt-3"><ScoreRing value={p.rate ?? 0} max={100} band={bandOfPct(p.rate)} size={96} label={`${p.rate ?? 0}%`} sub="of steps hit" /></div>
                  {p.weakest && <p className="t-small mt-4 text-fg-2">Weakest step<span className="block font-medium text-fg">{p.weakest}</span></p>}
                </Link>
              ))}
            </div>
          </section>

          <Card className="rise scroll-mt-24" id="todo"><CardHeader title="To do" sub="Highest value first. Assign it, act on it, then mark it done." /><div className="pt-2"><TodoQueue open={s.attention} closed={closed} /></div></Card>
          <Card className="rise"><CardHeader title="Call mix" sub="Click a type to see those calls" /><div className="px-5 pb-5 pt-4 sm:px-6"><CallMix mix={s.mix} labels={typeLabels} /></div></Card>
        </div>

        <div className="flex min-w-0 flex-col gap-6 lg:col-span-4">
          <Card className="rise"><CardHeader title="Where calls break down" sub="Steps missed most, worst first" /><div className="pt-3"><BreakdownBars rows={s.breakdown.slice(0, 6).map((b) => ({ label: b.label, missed: b.total - b.pass, total: b.total }))} /></div></Card>
          {top && <div id="coach" className="rise scroll-mt-24"><CoachCard step={top.label} missed={top.total - top.pass} total={top.total} say={ex?.say} clip={ex && exStart != null ? { src: `/api/calls/${ex.id}/audio`, start: exStart } : undefined} bestHref={best && hitLine >= 0 ? `/calls/${best.id}?line=${hitLine}` : undefined} /></div>}
          <Card className="rise"><CardHeader title="Team" sub="Average score per rep" /><div className="pt-4"><TeamBoard team={s.team} /></div></Card>
        </div>
      </div>

      <Card className="rise"><CardHeader title="Missed steps by rep" sub="Share of each rep's scored calls that missed the step. Click a cell to see those calls." /><div className="pt-4"><Heatmap {...heat} /></div></Card>
    </div>
  );
}
