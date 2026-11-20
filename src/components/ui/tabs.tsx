"use client";
import { motion, useReducedMotion } from "motion/react";
import { useId } from "react";
import { cn } from "@/lib/cn";

type Item<T extends string> = { value: T; label: React.ReactNode; count?: number };
const spring = { type: "spring" as const, duration: 0.25, bounce: 0 };

// Underline tabs: the indicator slides between tabs (shared layoutId).
export function Tabs<T extends string>({ items, value, onChange, label, className }: { items: Item<T>[]; value: T; onChange: (v: T) => void; label: string; className?: string }) {
  const id = useId(), reduce = useReducedMotion();
  return (
    <div role="tablist" aria-label={label} className={cn("flex gap-5 border-b border-line", className)}>
      {items.map((t) => (
        <button key={t.value} role="tab" aria-selected={value === t.value} onClick={() => onChange(t.value)}
          className={cn("relative -mb-px flex h-11 items-center gap-1.5 whitespace-nowrap text-[14px] font-semibold transition-colors", value === t.value ? "text-fg" : "text-fg-3 hover:text-fg-2")}>
          {t.label}{t.count != null && <span className="t-plate text-[13px] text-fg-3">{t.count}</span>}
          {value === t.value && <motion.span layoutId={`tab${id}`} transition={reduce ? { duration: 0 } : spring} className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-grad" />}
        </button>
      ))}
    </div>
  );
}

// Segmented pill control with a sliding thumb.
export function Segmented<T extends string>({ items, value, onChange, label, size = "md" }: { items: Item<T>[]; value: T; onChange: (v: T) => void; label: string; size?: "sm" | "md" }) {
  const id = useId(), reduce = useReducedMotion();
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex max-w-full gap-0.5 overflow-x-auto rounded-full bg-inset p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {items.map((t) => (
        <button key={t.value} role="radio" aria-checked={value === t.value} onClick={() => onChange(t.value)}
          className={cn("press relative flex items-center gap-1.5 whitespace-nowrap rounded-full font-medium transition-colors", size === "sm" ? "h-7 px-2.5 text-[13px]" : "h-8 px-3 text-[14px]", value === t.value ? "text-fg" : "text-fg-3 hover:text-fg")}>
          {value === t.value && <motion.span layoutId={`seg${id}`} transition={reduce ? { duration: 0 } : spring} className="absolute inset-0 rounded-full bg-card shadow-sm ring-1 ring-line" />}
          <span className="relative">{t.label}</span>{t.count != null && <span className="num relative text-[12px] text-fg-3">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}
