import { CallsTable } from "@/components/calls/calls-table";
import { CountLine, UploadTrigger } from "@/components/page-bits";
import type { CallRow } from "@/lib/db";
import { insights } from "@/lib/insights";
import { listCalls } from "@/lib/calls";
import { SCORECARDS } from "@/lib/framework";

export const metadata = { title: "Calls" };
export const dynamic = "force-dynamic";

export default async function Calls() {
  const calls = await listCalls();
  const s = insights(calls as CallRow[]);
  const rows = calls.map((c) => ({
    ...c, analysis: null,
    scorecard: c.analysis?.scorecard ? SCORECARDS[c.analysis.scorecard].name : null,
    summary: c.analysis?.summary ?? null, customer_name: c.analysis?.customer_name ?? null, assignee: c.analysis?.task?.assignee ?? null,
    missedSteps: [...new Set((c.analysis?.steps ?? []).filter((s) => !s.passed && !s.auto).map((s) => s.label))],
    stepLabels: [...new Set((c.analysis?.steps ?? []).filter((s) => !s.auto).map((s) => s.label))],
  }));
  return (
    <div className="mx-auto max-w-[1320px] px-4 py-8 sm:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <h1 className="t-h1">Calls</h1>
          <p className="t-body mt-1 text-fg-2"><CountLine total={s.total} status={s.status} />. Open any call for the transcript, score and coaching.</p>
        </div>
        <UploadTrigger />
      </div>
      <CallsTable rows={rows} />
    </div>
  );
}
