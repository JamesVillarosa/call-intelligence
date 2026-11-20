import { useId } from "react";
import { cn } from "@/lib/cn";
import { type Band } from "@/lib/display";

export const BAND_COLOR: Record<Band, string> = { gold: "var(--band-gold)", green: "var(--band-green)", close: "var(--band-close)", work: "var(--band-work)", critical: "var(--band-critical)", none: "var(--band-none)" };

// Gauge ring in the band color with a soft track; the number sits inside. Color is always paired with a label elsewhere.
export function ScoreRing({ value, max, band, size = 40, stroke, label, sub }: { value: number; max: number; band: Band; size?: number; stroke?: number; label?: React.ReactNode; sub?: React.ReactNode }) {
  const p = max ? Math.min(value / max, 1) : 0;
  const w = stroke ?? Math.max(3, Math.round(size * 0.085));
  const r = (size - w) / 2, c = 2 * Math.PI * r;
  return (
    <span className="inline-flex shrink-0 flex-col items-start gap-2" role="img" aria-label={`Score ${value} of ${max}`}>
      <span className="relative grid place-items-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--inset)" strokeWidth={w} />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={BAND_COLOR[band]} strokeWidth={w} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(p, 0.02))} className="ring-fill" style={{ ["--c" as string]: c, filter: size >= 120 ? `drop-shadow(0 0 6px ${BAND_COLOR[band]})` : undefined }} />
        </svg>
        {label != null && <span className="t-plate absolute leading-none text-fg" style={{ fontSize: Math.max(10, Math.round(size * (String(label).length > 4 ? 0.2 : 0.26))) }}>{label}</span>}
      </span>
      {sub && <span className="t-caption block leading-tight text-fg-3">{sub}</span>}
    </span>
  );
}

export function ScoreBar({ value, max = 100, band, className, i = 0 }: { value: number; max?: number; band: Band; className?: string; i?: number }) {
  return (
    <span className={cn("block h-1.5 w-full overflow-hidden rounded-full bg-inset", className)} role="presentation">
      <span className="grow block h-full rounded-full" style={{ width: `${Math.max((value / max) * 100, 2)}%`, background: BAND_COLOR[band], ["--i" as string]: i }} />
    </span>
  );
}

// Segmented meter: n of total steps, one segment each.
export function ProgressMeter({ value, total, band }: { value: number; total: number; band: Band }) {
  return (
    <span className="flex gap-[2px]" role="img" aria-label={`${value} of ${total}`}>
      {Array.from({ length: total }, (_, k) => <span key={k} className="h-1.5 flex-1 rounded-full" style={{ background: k < value ? BAND_COLOR[band] : "var(--inset)" }} />)}
    </span>
  );
}

export function Sparkline({ data, width = 96, height = 40, color = "var(--chart-1)", fluid, label }: { data: number[]; width?: number; height?: number; color?: string; fluid?: boolean; label?: string }) {
  const id = `sp${useId().replace(/:/g, "")}`;
  if (data.length < 2) return <span style={{ width, height }} className="inline-block" aria-hidden />;
  const max = Math.max(...data, 1), min = Math.min(...data, 0);
  const x = (i: number) => (i / (data.length - 1)) * (width - 4) + 2;
  const y = (v: number) => height - 4 - ((v - min) / (max - min || 1)) * (height - 8);
  const d = data.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <svg width={fluid ? "100%" : width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="overflow-visible" role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {label && <title>{label}</title>}
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".2" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <path d={`${d} L${x(data.length - 1)},${height} L${x(0)},${height}Z`} fill={`url(#${id})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(data.length - 1)} cy={y(data[data.length - 1])} r="2.5" fill={color} />
    </svg>
  );
}
