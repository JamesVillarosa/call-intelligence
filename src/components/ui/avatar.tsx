import { User } from "lucide-react";
import { cn } from "@/lib/cn";

// Vivid gradient discs, white initials: readable in both themes.
const PALETTE: [string, string][] = [["linear-gradient(135deg,#0075ff,#4f5bff)", "#fff"], ["linear-gradient(135deg,#7551ff,#b04dff)", "#fff"], ["linear-gradient(135deg,#0099c7,#21a5d9)", "#fff"], ["linear-gradient(135deg,#01945f,#14b88a)", "#fff"], ["linear-gradient(135deg,#e05f14,#f08a3c)", "#fff"], ["linear-gradient(135deg,#c0223f,#e64a72)", "#fff"]];
const hash = (s: string) => [...s].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7);
export const initials = (name: string) => name.split(/\s+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

export function Avatar({ name, size = 28, kind = "person", className }: { name?: string | null; size?: number; kind?: "person" | "rep" | "customer" | "unknown"; className?: string }) {
  const style = { width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.38)) };
  if (kind === "customer") return <span className={cn("grid shrink-0 place-items-center rounded-full bg-inset text-fg-2 ring-1 ring-line", className)} style={style} aria-hidden><User style={{ width: size * 0.5, height: size * 0.5 }} /></span>;
  if (!name || kind === "unknown") return <span className={cn("grid shrink-0 place-items-center rounded-full border border-dashed border-line-strong text-fg-3", className)} style={style} aria-hidden>?</span>;
  if (kind === "rep") return <span className={cn("grid shrink-0 place-items-center rounded-full bg-brand-100 font-semibold text-fg", className)} style={style} aria-hidden>{initials(name)}</span>;
  const [bg, fg] = PALETTE[hash(name) % PALETTE.length];
  return <span className={cn("grid shrink-0 place-items-center rounded-full font-semibold", className)} style={{ ...style, background: bg, color: fg }} aria-hidden>{initials(name)}</span>;
}

export function AvatarGroup({ names, size = 24, max = 4 }: { names: string[]; size?: number; max?: number }) {
  return (
    <span className="flex -space-x-1.5">
      {names.slice(0, max).map((n) => <Avatar key={n} name={n} size={size} className="ring-2 ring-card" />)}
      {names.length > max && <span className="grid place-items-center rounded-full bg-inset text-[11px] font-medium text-fg-2 ring-2 ring-card" style={{ width: size, height: size }}>+{names.length - max}</span>}
    </span>
  );
}
