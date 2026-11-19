import { cva, type VariantProps } from "class-variance-authority";
import { ArrowDownRight, ArrowUpRight, Check, Minus, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { BAND_LABEL, type Band } from "@/lib/display";

export type Tone = "neutral" | "brand" | "success" | "warning" | "orange" | "danger" | "info" | "gold" | "mint";
const soft: Record<Tone, string> = {
  neutral: "bg-inset text-fg-2", brand: "bg-brand-soft text-brand-fg", success: "bg-success-soft text-success-fg", warning: "bg-warning-soft text-warning-fg",
  orange: "bg-orange-soft text-orange-fg", danger: "bg-danger-soft text-danger-fg", info: "bg-info-soft text-info-fg", gold: "bg-gold-soft text-gold-fg", mint: "bg-info-soft text-info-fg",
};
export const dotColor: Record<Tone, string> = {
  neutral: "bg-n-400", brand: "bg-brand-500", success: "bg-success-500", warning: "bg-warning-500", orange: "bg-orange-500", danger: "bg-danger-500", info: "bg-info-500", gold: "bg-gold-500", mint: "bg-info-500",
};
export const toneText: Record<Tone, string> = {
  neutral: "text-fg-2", brand: "text-brand-fg", success: "text-success-fg", warning: "text-warning-fg", orange: "text-orange-fg", danger: "text-danger-fg", info: "text-info-fg", gold: "text-gold-fg", mint: "text-info-fg",
};

const badge = cva("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-medium [&_svg]:size-3.5", {
  variants: { size: { sm: "h-6 px-2 text-[12px]", md: "h-6 px-2.5 text-[13px]", lg: "h-7 px-3 text-[13px]" } },
  defaultVariants: { size: "md" },
});
export function Badge({ tone = "neutral", size, dot, icon, className, children }: { tone?: Tone; dot?: boolean; icon?: React.ReactNode; className?: string; children: React.ReactNode } & VariantProps<typeof badge>) {
  return <span className={cn(badge({ size }), soft[tone], className)}>{dot && <span className={cn("size-1.5 rounded-full", dotColor[tone])} />}{icon}{children}</span>;
}

export function StatusDot({ tone = "neutral", pulse, label }: { tone?: Tone; pulse?: boolean; label?: string }) {
  return <span className={cn("inline-block size-2 shrink-0 rounded-full", dotColor[tone], pulse && "pulse-dot")} role={label ? "img" : undefined} aria-label={label} />;
}

export const BAND_TONE: Record<Band, Tone> = { gold: "gold", green: "success", close: "warning", work: "orange", critical: "danger", none: "neutral" };
export function BandBadge({ band, size }: { band: Band } & VariantProps<typeof badge>) {
  return <Badge tone={BAND_TONE[band]} size={size} dot>{BAND_LABEL[band]}</Badge>;
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-xs border border-line bg-inset px-1 font-sans text-[11px] font-medium text-fg-2 shadow-xs">{children}</kbd>;
}

export function StepPill({ label, passed, onClick }: { label: string; passed: boolean; onClick?: () => void }) {
  const C = onClick ? "button" : "span";
  return (
    <C onClick={onClick} className={cn("inline-flex h-6 items-center gap-1 rounded-full px-2 text-[12px] font-medium [&_svg]:size-3", passed ? "bg-success-soft text-success-fg" : "bg-warning-soft text-warning-fg", onClick && "press hover:brightness-95")}>
      {passed ? <Check strokeWidth={2.5} /> : <X strokeWidth={2.5} />}{label}
    </C>
  );
}

// Delta vs a previous value. Without real history it renders nothing.
export function DeltaChip({ value, suffix = "", invert }: { value: number | null; suffix?: string; invert?: boolean }) {
  if (value == null) return null;
  const up = value > 0, flat = value === 0;
  const good = invert ? !up : up;
  return (
    <Badge size="sm" tone={flat ? "neutral" : good ? "success" : "danger"} icon={flat ? <Minus /> : up ? <ArrowUpRight /> : <ArrowDownRight />}>
      <span className="num">{up ? "+" : ""}{value}{suffix}</span>
    </Badge>
  );
}
