import { useId } from "react";

type Variant = "mark" | "tile" | "full" | "mono" | "stacked";

// Concept A: a voice waveform where the last bar turns mint and sparks upward, a call turning into insight.
function Bars({ small, fill, accent }: { small: boolean; fill: string; accent: string }) {
  return small ? (
    <g>
      <rect x="6" y="12" width="4" height="8" rx="2" fill={fill} />
      <rect x="12" y="8" width="4" height="16" rx="2" fill={fill} />
      <rect x="18" y="11" width="4" height="10" rx="2" fill={fill} />
      <rect x="24" y="9" width="3.4" height="14" rx="1.7" fill={accent} />
    </g>
  ) : (
    <g>
      <rect x="6" y="13.5" width="2.8" height="5" rx="1.4" fill={fill} />
      <rect x="10.6" y="10" width="2.8" height="12" rx="1.4" fill={fill} />
      <rect x="15.2" y="12" width="2.8" height="8" rx="1.4" fill={fill} />
      <rect x="19.8" y="9" width="2.8" height="14" rx="1.4" fill={fill} />
      <rect x="24.4" y="13" width="2.8" height="6" rx="1.4" fill={accent} />
      <path d="M25.6 5.2l.75 2.05 2.05.75-2.05.75-.75 2.05-.75-2.05-2.05-.75 2.05-.75z" fill={accent} />
    </g>
  );
}

export function LogoMark({ size = 32, tone = "color" }: { size?: number; tone?: "color" | "white" | "dark" }) {
  const id = useId().replace(/:/g, "");
  const small = size < 24;
  const tile = tone === "color" ? `url(#g${id})` : tone === "white" ? "#ffffff" : "#131826";
  const bar = tone === "white" ? "#131826" : "#ffffff";
  const accent = tone === "color" ? "#34D5B1" : bar;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className="shrink-0">
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7C5CFF" /><stop offset=".55" stopColor="#4F46E5" /><stop offset="1" stopColor="#2D9CDB" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill={tile} />
      <Bars small={small} fill={bar} accent={accent} />
    </svg>
  );
}

export function Logo({ variant = "full", size = 32, tone = "color" }: { variant?: Variant; size?: number; tone?: "color" | "white" | "dark" }) {
  if (variant === "mark" || variant === "tile") return <LogoMark size={size} tone={tone} />;
  if (variant === "mono") return <LogoMark size={size} tone={tone === "color" ? "dark" : tone} />;
  const word = tone === "white" ? "text-white" : "text-fg";
  const sub = tone === "white" ? "text-white/70" : "text-fg-3";
  if (variant === "stacked") {
    return (
      <span className="inline-flex flex-col items-center gap-3 text-center">
        <LogoMark size={size} tone={tone} />
        <span className="leading-tight"><span className={`block text-[18px] font-[650] tracking-[-0.01em] ${word}`}>Call Intelligence</span><span className={`t-caption ${sub}`}>Portfolio demo</span></span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={size} tone={tone} />
      <span className="leading-tight"><span className={`block text-[15px] font-[650] tracking-[-0.01em] ${word}`}>Call Intelligence</span><span className={`t-caption ${sub}`}>Portfolio demo</span></span>
    </span>
  );
}

// Splash and empty-state illustration: the mark's bars breathing.
export function WavePulse({ size = 56 }: { size?: number }) {
  const h = [0.35, 0.8, 0.55, 1, 0.45];
  return (
    <span className="inline-flex items-center gap-[3px]" style={{ height: size }} aria-hidden>
      {h.map((v, i) => <span key={i} className={`wave-bar w-1.5 rounded-full ${i === 4 ? "bg-mint-500" : "bg-brand-500"}`} style={{ height: size * v, ["--i" as string]: i }} />)}
    </span>
  );
}
