type Variant = "mark" | "tile" | "full" | "mono" | "stacked";

// The mark: a geometric "Ci" monogram on a flat blue tile. Flat on purpose so it holds up at 16px and in one color.
export function LogoMark({ size = 32, tone = "color" }: { size?: number; tone?: "color" | "white" | "dark" }) {
  const tile = tone === "color" ? "#0b5cff" : tone === "white" ? "#ffffff" : "#0f1535";
  const ink = tone === "white" ? "#0b5cff" : "#ffffff";
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className="shrink-0">
      <rect width="32" height="32" rx="8" fill={tile} />
      <path d="M17.9 11.2A7 7 0 1 0 17.9 20.8" fill="none" stroke={ink} strokeWidth="3.4" strokeLinecap="round" />
      <rect x="20.6" y="14" width="3.4" height="9.4" rx="1.7" fill={ink} />
      <circle cx="22.3" cy="9.6" r="2.1" fill={ink} />
    </svg>
  );
}

export function Logo({ variant = "full", size = 32, tone = "color" }: { variant?: Variant; size?: number; tone?: "color" | "white" | "dark" }) {
  if (variant === "mark" || variant === "tile") return <LogoMark size={size} tone={tone} />;
  if (variant === "mono") return <LogoMark size={size} tone={tone === "color" ? "dark" : tone} />;
  const word = tone === "white" ? "text-white" : "text-fg";
  const name = <span className={`whitespace-nowrap text-[16px] font-[750] leading-none tracking-[-0.025em] ${word}`}>Call Intelligence</span>;
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
