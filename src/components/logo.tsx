import { useId } from "react";

type Variant = "mark" | "tile" | "full" | "mono" | "stacked";

// The mark: an open "C" (the call) in a cyan-to-violet gradient, with the AI spark sitting in its opening.
export function LogoMark({ size = 32, tone = "color" }: { size?: number; tone?: "color" | "white" | "dark" }) {
  const id = useId().replace(/:/g, "");
  const solid = tone === "white" ? "#ffffff" : tone === "dark" ? "#0f1535" : null;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className="shrink-0">
      <defs>
        <linearGradient id={`a${id}`} x1="8" y1="5" x2="16" y2="28" gradientUnits="userSpaceOnUse"><stop stopColor="#21d4fd" /><stop offset=".5" stopColor="#0075ff" /><stop offset="1" stopColor="#7551ff" /></linearGradient>
        <linearGradient id={`b${id}`} x1="20" y1="9" x2="30" y2="22" gradientUnits="userSpaceOnUse"><stop stopColor="#a48bff" /><stop offset="1" stopColor="#0075ff" /></linearGradient>
      </defs>
      <path d="M21.66 9.57A10 10 0 1 0 21.66 22.43" fill="none" stroke={solid ?? `url(#a${id})`} strokeWidth="4.2" strokeLinecap="round" />
      <path d="M24.5 10.8Q25.23 15.27 29.7 16Q25.23 16.73 24.5 21.2Q23.77 16.73 19.3 16Q23.77 15.27 24.5 10.8Z" fill={solid ?? `url(#b${id})`} />
      <path d="M28.4 5.0Q28.669999999999998 6.630000000000001 30.299999999999997 6.9Q28.669999999999998 7.17 28.4 8.8Q28.13 7.17 26.5 6.9Q28.13 6.630000000000001 28.4 5.0Z" fill={solid ?? "#21d4fd"} />
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
