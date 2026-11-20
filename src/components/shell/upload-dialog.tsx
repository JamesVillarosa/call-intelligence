"use client";
import { Check, FileAudio, LoaderCircle, RotateCcw, Upload, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { band } from "@/lib/display";
import { on } from "@/lib/events";
import { mmss } from "@/lib/format";
import { LogoMark, WavePulse } from "../logo";
import { BandBadge, Button, Dialog, ScoreRing } from "../ui";

type Stage = "upload" | "transcribe" | "score" | "done";
type Job = { file: File; duration?: number; id?: string; stage: Stage; error?: { stage: Stage; message: string }; result?: { score: number | null; score_max: number | null; grade: string | null; label: string } };
const STEPS: { key: Stage; label: string; eta: string }[] = [
  { key: "upload", label: "Uploading", eta: "a few seconds" },
  { key: "transcribe", label: "Transcribing", eta: "10 to 20 seconds" },
  { key: "score", label: "Classifying and scoring", eta: "20 to 60 seconds" },
];
const MAX_MB = 100;
const order: Stage[] = ["upload", "transcribe", "score", "done"];

export function UploadDialog() {
  const [open, setOpen] = useState(false);
  const [drag, setDrag] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [problem, setProblem] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  useEffect(() => on("upload", () => setOpen(true)), []);
  const patch = (f: File, p: Partial<Job>) => setJobs((js) => js.map((j) => (j.file === f ? { ...j, ...p } : j)));

  async function run(file: File, existingId?: string) {
    let id = existingId;
    try {
      if (!id) {
        patch(file, { stage: "upload", error: undefined });
        const res = await fetch("/api/upload", { method: "POST", body: JSON.stringify({ name: file.name }) });
        const up = await res.json();
        if (!res.ok) throw new Error(up.error ?? "Upload failed");
        id = up.id as string;
        patch(file, { id });
        await new Promise((r) => setTimeout(r, 900 + Math.min(file.size / 2e5, 1500))); // demo: the file stays in the browser
      }
      patch(file, { stage: "transcribe", error: undefined });
      const poll = setInterval(async () => {
        const s = await fetch(`/api/calls/${id}`).then((r) => r.json()).catch(() => null);
        if (s?.status === "analyzing") patch(file, { stage: "score" });
      }, 1500);
      const done = await fetch(`/api/calls/${id}/process`, { method: "POST" });
      clearInterval(poll);
      const body = await done.json().catch(() => ({}));
      if (!done.ok) throw new Error(body.error ?? "Processing didn't finish. Retry, it usually works the second time.");
      const result = await fetch(`/api/calls/${id}`).then((r) => r.json());
      patch(file, { stage: "done", result });
      router.refresh();
    } catch (e) {
      setJobs((js) => js.map((j) => (j.file === file ? { ...j, error: { stage: j.stage, message: e instanceof Error ? e.message : "Something went wrong" } } : j)));
    }
  }

  function pick(files: FileList | File[] | null) {
    setProblem("");
    const list = [...(files ?? [])];
    const bad = list.find((f) => !f.type.startsWith("audio/") && !/\.(mp3|wav|m4a|ogg|webm|aac|flac)$/i.test(f.name));
    const big = list.find((f) => f.size > MAX_MB * 1e6);
    if (bad) return setProblem(`${bad.name} isn't an audio file. Use MP3, WAV, M4A or similar.`);
    if (big) return setProblem(`${big.name} is larger than ${MAX_MB} MB. Trim it or export at a lower bitrate.`);
    const fresh = list.map((file) => ({ file, stage: "upload" as Stage }));
    setJobs((js) => [...js, ...fresh]);
    for (const j of fresh) {
      const a = new Audio(URL.createObjectURL(j.file));
      a.onloadedmetadata = () => patch(j.file, { duration: a.duration });
      run(j.file);
    }
  }

  const busy = jobs.some((j) => j.stage !== "done" && !j.error);
  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o && !busy) setJobs([]); }} title="Upload a call" description="Drop a recording to transcribe, classify and score it. Recordings are matched to a sample call for scoring in this workspace." wide>
      <input ref={input} type="file" accept="audio/*" multiple hidden onChange={(e) => { pick(e.target.files); e.target.value = ""; }} />
      <button
        onClick={() => input.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files); }}
        className={cn("flex w-full flex-col items-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors", drag ? "border-brand-500 bg-brand-soft" : "border-line-strong hover:border-brand-400 hover:bg-inset")}>
        {drag ? <WavePulse size={44} /> : <span className="grid size-12 place-items-center rounded-md bg-brand-soft text-brand-fg"><Upload className="size-5" /></span>}
        <span className="t-h3 mt-4">{drag ? "Drop to upload" : "Drop recordings here or browse"}</span>
        <span className="t-small mt-1 text-fg-2">MP3, WAV or M4A, up to {MAX_MB} MB each. Several at once is fine.</span>
      </button>
      {problem && <p role="alert" className="t-small mt-3 rounded-sm bg-danger-soft px-3 py-2 text-danger-fg">{problem}</p>}

      {jobs.length > 0 && (
        <ul className="mt-5 flex flex-col gap-3" aria-live="polite">
          {jobs.map((j, k) => {
            const at = order.indexOf(j.stage);
            return (
              <li key={k} className="rounded-md border border-line p-4">
                <div className="flex items-center gap-3">
                  <FileAudio className="size-5 shrink-0 text-fg-3" />
                  <div className="min-w-0 flex-1">
                    <p className="t-label truncate">{j.file.name}</p>
                    <p className="t-caption num text-fg-3">{(j.file.size / 1e6).toFixed(1)} MB{j.duration ? ` · ${mmss(j.duration)}` : ""}</p>
                  </div>
                  {j.stage === "done" && j.result && j.id && (
                    <div className="pop flex items-center gap-3">
                      {j.result.score_max ? <><ScoreRing value={j.result.score ?? 0} max={j.result.score_max} band={band(j.result.grade, j.result.score, j.result.score_max)} size={40} label={j.result.score} /><BandBadge band={band(j.result.grade, j.result.score, j.result.score_max)} size="sm" /></> : <span className="t-caption text-fg-3">Not scorable</span>}
                      <Link href={`/calls/${j.id}`} onClick={() => setOpen(false)} className="t-label rounded-sm bg-brand-600 px-3 py-2 text-white hover:bg-brand-700">Open call</Link>
                    </div>
                  )}
                </div>
                {j.stage !== "done" && (
                  <ol className="mt-4 grid gap-2 sm:grid-cols-3">
                    {STEPS.map((s, i) => {
                      const failed = j.error?.stage === s.key, active = i === at && !j.error, ok = i < at;
                      return (
                        <li key={s.key} className={cn("rounded-sm border px-3 py-2.5", failed ? "border-danger-500/40 bg-danger-soft" : active ? "border-brand-line bg-brand-soft" : "border-line")}>
                          <p className="t-label flex items-center gap-2">
                            {failed ? <X className="size-4 text-danger-fg" /> : ok ? <Check className="size-4 text-success-fg" /> : active ? <LoaderCircle className="size-4 animate-spin text-brand-fg" /> : <span className="size-4 rounded-xs border border-line-strong" />}
                            {s.label}
                          </p>
                          <p className="t-caption mt-0.5 text-fg-3">{failed ? "Failed" : ok ? "Done" : active ? `About ${s.eta}` : "Waiting"}</p>
                        </li>
                      );
                    })}
                  </ol>
                )}
                {j.error && (
                  <div className="mt-3 flex items-center gap-3">
                    <p className="t-small flex-1 text-danger-fg">{j.error.message}</p>
                    <Button size="sm" onClick={() => run(j.file, j.error!.stage === "upload" ? undefined : j.id)}><RotateCcw />Retry</Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {jobs.length === 0 && <p className="t-caption mt-4 flex items-center gap-2 text-fg-3"><LogoMark size={16} />Recordings stay private to your workspace.</p>}
    </Dialog>
  );
}
