import { useId } from "react";

type Variant = "mark" | "tile" | "full" | "mono" | "stacked";

// The mark: a speech bubble holding a voice waveform, with a spark where the call gets understood.
export function LogoMark({ size = 32, tone = "color" }: { size?: number; tone?: "color" | "white" | "dark" }) {
  const id = useId().replace(/:/g, "");
  const ink = tone === "white" ? "#0062e0" : "#ffffff";
  const bar = tone === "white" ? "#ffffff" : tone === "dark" ? "#0f1535" : "#0062e0";
  const tile = tone === "color" ? `url(#g${id})` : tone === "white" ? "#ffffff" : "#0f1535";
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className="shrink-0">
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse"><stop stopColor="#21a5ff" /><stop offset=".5" stopColor="#0075ff" /><stop offset="1" stopColor="#7551ff" /></linearGradient>
        <linearGradient id={`h${id}`} x1="0" y1="0" x2="0" y2="16" gradientUnits="userSpaceOnUse"><stop stopColor="#fff" stopOpacity=".28" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={tile} />
      {tone === "color" && <rect x=".5" y=".5" width="31" height="31" rx="8.5" fill={`url(#h${id})`} stroke="#fff" strokeOpacity=".18" />}
      <path d="M10 10h7a5 5 0 0 1 5 5v3a5 5 0 0 1-5 5h-5.5l-3.8 3v-3.3A5 5 0 0 1 5 18v-3a5 5 0 0 1 5-5z" fill={ink} />
      <rect x="8.4" y="14.5" width="2.2" height="4" rx="1.1" fill={bar} />
      <rect x="12.4" y="12.5" width="2.2" height="8" rx="1.1" fill={bar} />
      <rect x="16.4" y="13.75" width="2.2" height="5.5" rx="1.1" fill={bar} />
      <path d="M25 3.5l1.1 2.4 2.4 1.1-2.4 1.1L25 10.5l-1.1-2.4-2.4-1.1 2.4-1.1z" fill={ink} />
    </svg>
  );
}

export function Logo({ variant = "full", size = 32, tone = "color" }: { variant?: Variant; size?: number; tone?: "color" | "white" | "dark" }) {
  if (variant === "mark" || variant === "tile") return <LogoMark size={size} tone={tone} />;
  if (variant === "mono") return <LogoMark size={size} tone={tone === "color" ? "dark" : tone} />;
  const word = tone === "white" ? "text-white" : "text-fg";
  const name = <span className={`whitespace-nowrap text-[16px] font-[800] leading-none tracking-[-0.03em] ${word}`}>Call<span className="font-[500] opacity-70"> Intelligence</span></span>;
  if (variant === "stacked") return <span className="inline-flex flex-col items-center gap-3 text-center"><LogoMark size={size} tone={tone} />{name}</span>;
  return <span className="inline-flex items-center gap-2.5"><LogoMark size={size} tone={tone} />{name}</span>;
}

// Splash and empty-state illustration: signal bars breathing in the brand gradient.
export function WavePulse({ size = 56 }: { size?: number }) {
  const h = [0.35, 0.8, 0.55, 1, 0.45];
  return (
    <span className="inline-flex items-center gap-[4px]" style={{ height: size }} aria-hidden>
      {h.map((v, i) => <span key={i} className="wave-bar w-1.5 rounded-full bg-grad" style={{ height: size * v, ["--i" as string]: i }} />)}
    </span>
  );
}
