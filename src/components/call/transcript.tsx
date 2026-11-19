"use client";
import { Copy, Download, LocateFixed } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { StepResult, Utterance } from "@/lib/ai";
import { cn } from "@/lib/cn";
import { mmss } from "@/lib/format";
import { Avatar, Button, IconButton, SearchInput, StepPill, Switch } from "../ui";

export function Transcript({ lines, isRep, repName, steps, active, follow, onSeek, onStep, title }: {
  lines: Utterance[]; isRep: (i: number) => boolean; repName: string; steps: StepResult[]; active: number; follow: boolean;
  onSeek: (i: number) => void; onStep: (key: string) => void; title: string;
}) {
  const [q, setQ] = useState("");
  const [moments, setMoments] = useState(false);
  const [away, setAway] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const auto = useRef(false);
  const tagged = useMemo(() => {
    const m = new Map<number, StepResult[]>();
    steps.forEach((s) => s.passed && s.utterance >= 0 && m.set(s.utterance, [...(m.get(s.utterance) ?? []), s]));
    return m;
  }, [steps]);

  // The list scrolls inside its own card. It follows the playing line unless the user scrolls it by hand.
  const [outOfView, setOutOfView] = useState(false);
  useEffect(() => {
    const el = box.current?.querySelector<HTMLElement>(`[data-line="${active}"]`);
    if (!el || !box.current) return;
    const io = new IntersectionObserver(([e]) => setOutOfView(!e.isIntersecting), { root: box.current, threshold: 0.6 });
    io.observe(el);
    return () => io.disconnect();
  }, [active]);
  const scrollToActive = (smooth = true) => {
    const list = box.current, el = list?.querySelector<HTMLElement>(`[data-line="${active}"]`);
    if (!list || !el) return;
    auto.current = true;
    list.scrollTo({ top: el.offsetTop - list.clientHeight / 2 + el.clientHeight / 2, behavior: smooth && !matchMedia("(prefers-reduced-motion: reduce)").matches ? "smooth" : "auto" });
    setTimeout(() => (auto.current = false), 400);
  };
  useEffect(() => { if (follow && !away && active >= 0) scrollToActive(); }, [active, follow, away]); // eslint-disable-line react-hooks/exhaustive-deps

  const needle = q.trim().toLowerCase();
  const shown = lines.map((u, i) => ({ u, i })).filter(({ u, i }) => (!moments || tagged.has(i)) && (!needle || u.text.toLowerCase().includes(needle)));
  const text = () => lines.map((u, i) => `[${mmss(u.start)}] ${isRep(i) ? repName : "Customer"}: ${u.text}`).join("\n");
  const mark = (t: string) => {
    if (!needle) return t;
    const k = t.toLowerCase().indexOf(needle);
    return k < 0 ? t : <>{t.slice(0, k)}<mark className="rounded-xs bg-warning-100 text-fg">{t.slice(k, k + needle.length)}</mark>{t.slice(k + needle.length)}</>;
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-5 pb-4 sm:px-6">
        <SearchInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search transcript" aria-label="Search transcript" className="min-w-40 flex-1" />
        <Switch checked={moments} onChange={setMoments} label="Moments that matter" />
        <IconButton label="Copy transcript" size="icon-sm" onClick={async () => { await navigator.clipboard.writeText(text()); toast.success("Transcript copied"); }}><Copy /></IconButton>
        <IconButton label="Download transcript" size="icon-sm" onClick={() => { const url = URL.createObjectURL(new Blob([text()], { type: "text/plain" })); Object.assign(document.createElement("a"), { href: url, download: `${title}.txt` }).click(); URL.revokeObjectURL(url); }}><Download /></IconButton>
      </div>
      <div className="relative">
      <div ref={box} onWheel={() => !auto.current && setAway(true)} onTouchMove={() => !auto.current && setAway(true)} className="relative h-[560px] overflow-y-auto px-3 py-3 sm:px-4">
        {shown.length === 0 && <p className="t-small px-3 py-10 text-center text-fg-2">{lines.length ? "No lines match." : "No speech detected in this recording."}</p>}
        <ol>
          {shown.map(({ u, i }, k) => {
            const rep = isRep(i), first = k === 0 || shown[k - 1].i !== i - 1 || isRep(i - 1) !== rep;
            const live = i === active;
            return (
              <li key={i} data-line={i} className={cn("relative rounded-md transition-colors", first ? "mt-3 first:mt-0" : "mt-0.5", live ? "bg-brand-soft" : "hover:bg-inset/70")}>
                {live && <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-r-full bg-brand-600" aria-hidden />}
                <div className="flex gap-3 px-3 py-2">
                  <span className="w-8 shrink-0">{first && <Avatar name={rep ? repName : undefined} kind={rep ? "rep" : "customer"} size={32} />}</span>
                  <div className="min-w-0 flex-1">
                    {first && <p className={cn("t-label mb-0.5", rep ? "text-brand-fg" : "text-fg-2")}>{rep ? repName : "Customer"}</p>}
                    <p className="t-body select-text text-fg">{mark(u.text)}</p>
                    {tagged.get(i) && <div className="mt-2 flex flex-wrap gap-1.5">{tagged.get(i)!.map((s) => <StepPill key={s.key} label={s.label} passed onClick={() => onStep(s.key)} />)}</div>}
                  </div>
                  <button onClick={() => onSeek(i)} className="num t-caption h-6 shrink-0 rounded-full bg-inset px-2 text-fg-2 hover:bg-brand-soft hover:text-brand-fg" aria-label={`Play from ${mmss(u.start)}`}>{mmss(u.start)}</button>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
      {outOfView && active >= 0 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
          <Button size="sm" variant="primary" className="pointer-events-auto shadow-md" onClick={() => { setAway(false); scrollToActive(); }}><LocateFixed />Jump to current line</Button>
        </div>
      )}
      </div>
    </div>
  );
}
