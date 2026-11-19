import { useId } from "react";
import { cn } from "@/lib/cn";
import { type Band } from "@/lib/display";

export const BAND_COLOR: Record<Band, string> = { gold: "#ca8a04", green: "#059669", close: "#d97706", work: "#ea580c", critical: "#e11d48", none: "#9aa2b3" };

// Animated ring. Gold gets a slow shimmer stroke; color is always paired with a label elsewhere.
export function ScoreRing({ value, max, band, size = 40, stroke, label, sub }: { value: number; max: number; band: Band; size?: number; stroke?: number; label?: React.ReactNode; sub?: React.ReactNode }) {
  const w = stroke ?? Math.max(3, Math.round(size / 11));
  const r = (size - w) / 2, c = 2 * Math.PI * r, p = max ? Math.min(value / max, 1) : 0;
  return (
    <span className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }} role="img" aria-label={`Score ${value} of ${max}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--inset)" strokeWidth={w} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={BAND_COLOR[band]} strokeWidth={w} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - p)} className="ring-fill" style={{ ["--c" as string]: c }} />
        {band === "gold" && <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#fef9c3" strokeOpacity=".7" strokeWidth={w / 2} strokeDasharray={`${c * 0.08} ${c}`} className="animate-[spin_3s_linear_infinite] origin-center motion-reduce:hidden" />}
      </svg>
      {label != null && (
        <span className="absolute inset-0 grid place-items-center text-center leading-none">
          <span><span className="num block font-semibold" style={{ fontSize: Math.max(11, size * 0.24) }}>{label}</span>{sub && <span className="t-caption mt-1 block text-fg-3">{sub}</span>}</span>
        </span>
      )}
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
    <span className="flex gap-1" role="img" aria-label={`${value} of ${total}`}>
      {Array.from({ length: total }, (_, k) => <span key={k} className="h-1.5 flex-1 rounded-full" style={{ background: k < value ? BAND_COLOR[band] : "var(--inset)" }} />)}
    </span>
  );
}

export function Sparkline({ data, width = 96, height = 40, color = "#4f46e5", fluid, label }: { data: number[]; width?: number; height?: number; color?: string; fluid?: boolean; label?: string }) {
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
