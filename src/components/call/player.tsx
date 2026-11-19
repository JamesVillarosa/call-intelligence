"use client";
import { Pause, Play, RotateCcw, RotateCw, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { mmss } from "@/lib/format";
import { Menu, Tooltip } from "../ui";

const BARS = 140;
export type Marker = { t: number; label: string; quote: string; passed: boolean };

// Peaks from the real audio; if decoding fails, a stable placeholder shape so the player still works.
function usePeaks(src: string, seed: string) {
  const [peaks, setPeaks] = useState<number[] | null>(null);
  const [real, setReal] = useState(false);
  useEffect(() => {
    let dead = false;
    const fallback = () => { let h = [...seed].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7); return Array.from({ length: BARS }, () => { h = (h * 1103515245 + 12345) >>> 0; return 0.25 + ((h >>> 16) % 1000) / 1600; }); };
    (async () => {
      try {
        const buf = await (await fetch(src)).arrayBuffer();
        const ctx = new AudioContext();
        const audio = await ctx.decodeAudioData(buf);
        ctx.close();
        const data = audio.getChannelData(0), size = Math.floor(data.length / BARS), out: number[] = [];
        for (let i = 0; i < BARS; i++) { let sum = 0, n = 0; for (let j = i * size; j < (i + 1) * size; j += 8) { sum += data[j] * data[j]; n++; } out.push(Math.sqrt(sum / (n || 1))); }
        const max = Math.max(...out, 0.01);
        // RMS loudness shows speech vs pauses; a power curve keeps quiet stretches visible.
        if (!dead) { setPeaks(out.map((v) => Math.max(0.06, Math.pow(v / max, 0.8)))); setReal(true); }
      } catch { if (!dead) setPeaks(fallback()); }
    })();
    return () => { dead = true; };
  }, [src, seed]);
  return { peaks, real };
}

export type Controls = { seek: (t: number) => void; toggle: () => void; rate: (r: number) => void; volume: (v: number, muted: boolean) => void };

export function Player({ src, id, duration, now, playing, ctl, markers, talk, repName }: {
  src: string; id: string; duration: number; now: number; playing: boolean; ctl: Controls;
  markers: Marker[]; talk: { rep: number; customer: number } | null; repName: string;
}) {
  const { peaks, real } = usePeaks(src, id);
  const wave = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [drag, setDrag] = useState(false);
  const [rate, setRate] = useState(1);
  const [muted, setMuted] = useState(false);
  const [vol, setVol] = useState(1);
  const p = duration ? now / duration : 0;
  const seek = (t: number) => ctl.seek(Math.max(0, Math.min(duration, t)));
  const at = (x: number) => { const r = wave.current!.getBoundingClientRect(); return Math.max(0, Math.min(1, (x - r.left) / r.width)) * duration; };
  const toggle = ctl.toggle;

  return (
    <div>
      <div className="flex items-center gap-3">
        <button onClick={toggle} aria-label={playing ? "Pause" : "Play"} className="press grid size-12 shrink-0 place-items-center rounded-full bg-brand-600 text-white shadow-xs hover:bg-brand-700">
          {playing ? <Pause className="size-5" fill="currentColor" /> : <Play className="ml-0.5 size-5" fill="currentColor" />}
        </button>
        <button onClick={() => seek(now - 10)} aria-label="Back 10 seconds" className="press grid size-9 place-items-center rounded-sm text-fg-2 hover:bg-inset hover:text-fg"><RotateCcw className="size-4" /></button>
        <button onClick={() => seek(now + 10)} aria-label="Forward 10 seconds" className="press grid size-9 place-items-center rounded-sm text-fg-2 hover:bg-inset hover:text-fg"><RotateCw className="size-4" /></button>
        <span className="num t-small text-fg-2"><span className="font-semibold text-fg">{mmss(now)}</span> / {mmss(duration)}</span>
        <div className="ml-auto flex items-center gap-1">
          <Menu label="Playback speed" trigger={<button className="press num h-8 rounded-sm border border-line px-2.5 text-[13px] font-medium hover:bg-inset">{rate}×</button>}
            items={[0.75, 1, 1.25, 1.5, 2].map((r) => ({ label: `${r}×${r === rate ? " (current)" : ""}`, onSelect: () => { setRate(r); ctl.rate(r); } }))} />
          <button onClick={() => { const m = !muted; setMuted(m); ctl.volume(vol, m); }} aria-label={muted ? "Unmute" : "Mute"} className="press grid size-9 place-items-center rounded-sm text-fg-2 hover:bg-inset hover:text-fg">{muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}</button>
          <input type="range" min={0} max={1} step={0.05} value={muted ? 0 : vol} aria-label="Volume" onChange={(e) => { const v = +e.target.value; setVol(v); setMuted(v === 0); ctl.volume(v, v === 0); }} className="hidden w-20 accent-brand-600 sm:block" />
        </div>
      </div>

      <div className="relative mt-5">
      <div
        ref={wave} role="slider" tabIndex={0} aria-label="Seek" aria-valuemin={0} aria-valuemax={Math.round(duration)} aria-valuenow={Math.round(now)} aria-valuetext={`${mmss(now)} of ${mmss(duration)}`}
        className="relative h-16 cursor-pointer touch-none select-none"
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setDrag(true); seek(at(e.clientX)); }}
        onPointerMove={(e) => { const t = at(e.clientX); setHover(t); if (drag) seek(t); }}
        onPointerUp={() => setDrag(false)} onPointerLeave={() => !drag && setHover(null)}
      >
        {!peaks && <span className="skeleton absolute inset-0 rounded-sm" aria-hidden />}
        <svg width="100%" height="64" viewBox={`0 0 ${BARS * 4} 64`} preserveAspectRatio="none" aria-hidden className={peaks ? "absolute inset-0" : "hidden"}>
          <defs><linearGradient id="played" x1="0" x2="1"><stop stopColor="#4f46e5" /><stop offset="1" stopColor="#4f46e5" /></linearGradient></defs>
          {(peaks ?? []).map((v, i) => {
            const h = Math.max(6, v * 60);
            return <rect key={i} x={i * 4} y={(64 - h) / 2} width="2.6" height={h} rx="1.3" fill={now > 0 && i / BARS < p ? "url(#played)" : "#c4c9d4"} className="grow-y" style={{ ["--i" as string]: i % 30 }} />;
          })}
        </svg>
        {now > 0 && <span className="pointer-events-none absolute inset-y-0 w-0.5 rounded-full bg-fg" style={{ left: `${p * 100}%` }} aria-hidden />}
        {hover != null && <span className="num t-caption pointer-events-none absolute -top-7 -translate-x-1/2 rounded-xs bg-n-900 px-1.5 py-0.5 text-white" style={{ left: `${(hover / (duration || 1)) * 100}%` }}>{mmss(hover)}</span>}
      </div>
        {markers.map((m, i) => (
          <Tooltip key={i} content={<span><b>{m.label}</b>{m.quote && <><br />&ldquo;{m.quote}&rdquo;</>}</span>}>
            <button onClick={() => seek(m.t)} aria-label={`${m.label} at ${mmss(m.t)}`}
              className="group absolute -bottom-4 grid size-6 -translate-x-1/2 place-items-center" style={{ left: `${(m.t / (duration || 1)) * 100}%` }}><span className={`size-3 rounded-full ring-2 ring-card transition-transform group-hover:scale-150 ${m.passed ? "bg-success-500" : "bg-danger-500"}`} /></button>
          </Tooltip>
        ))}
      </div>
      <p className="t-caption mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-fg-3">
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-success-500" />Step hit</span>
        {markers.some((m) => !m.passed) && <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-danger-500" />Step missed, where coaching says it belonged</span>}
        {!real && peaks && <span>Waveform shape is approximate for this recording.</span>}
        <Tooltip content="Space plays or pauses. Left and right arrows seek 5 seconds, with Shift 15."><button type="button" className="ml-auto grid size-6 place-items-center rounded-full border border-line text-[12px] font-semibold text-fg-2 hover:bg-inset" aria-label="Player keyboard shortcuts">?</button></Tooltip>
      </p>
      {talk && (
        <div className="mt-4">
          <div className="t-caption mb-1.5 flex justify-between text-fg-2"><span>Talk time: <b className="text-fg">{repName}</b> <span className="num">{talk.rep}%</span></span><span>Customer <span className="num">{talk.customer}%</span></span></div>
          <div className="flex h-2 overflow-hidden rounded-full bg-inset" role="img" aria-label={`${repName} talked ${talk.rep} percent, customer ${talk.customer} percent`}>
            <span className="grow h-full bg-brand-500" style={{ width: `${talk.rep}%` }} /><span className="h-full flex-1 bg-n-300" />
          </div>
        </div>
      )}
    </div>
  );
}
