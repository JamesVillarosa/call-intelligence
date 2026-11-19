"use client";
import { Calendar, Check, ChevronDown, Search } from "lucide-react";
import { Checkbox as C, Slider as SL, Switch as SW } from "radix-ui";
import { forwardRef } from "react";
import { cn } from "@/lib/cn";
import { Popover } from "./overlay";

const field = "h-10 w-full rounded-sm border border-line bg-card px-3 text-[14px] text-fg shadow-xs outline-none transition-[border-color,box-shadow] placeholder:text-fg-3 hover:border-line-strong focus:border-brand-500 focus:shadow-[var(--ring)]";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...p }, ref) => <input ref={ref} className={cn(field, className)} {...p} />);
Input.displayName = "Input";

export const SearchInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { hint?: React.ReactNode }>(({ className, hint, ...p }, ref) => (
  <span className={cn("relative block", className)}>
    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-3" />
    <input ref={ref} type="search" className={cn(field, "pl-9", hint ? "pr-12" : "")} {...p} />
    {hint && <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2">{hint}</span>}
  </span>
));
SearchInput.displayName = "SearchInput";

export function Select({ value, onChange, options, label, className }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; label: string; className?: string }) {
  return (
    <span className={cn("relative inline-block", className)}>
      <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className={cn(field, "appearance-none pr-9")}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-fg-3" />
    </span>
  );
}

export function Checkbox({ checked, onChange, label }: { checked: boolean | "indeterminate"; onChange: (v: boolean) => void; label: string }) {
  return (
    <C.Root checked={checked} onCheckedChange={(v) => onChange(v === true)} aria-label={label}
      className="grid size-4 shrink-0 place-items-center rounded-[5px] border border-line-strong bg-card transition-colors data-[state=checked]:border-brand-600 data-[state=checked]:bg-brand-600 data-[state=indeterminate]:border-brand-600 data-[state=indeterminate]:bg-brand-600">
      <C.Indicator className="text-white">{checked === "indeterminate" ? <span className="block h-0.5 w-2 rounded bg-white" /> : <Check className="size-3" strokeWidth={3} />}</C.Indicator>
    </C.Root>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-[14px] text-fg">
      <SW.Root checked={checked} onCheckedChange={onChange} className="relative h-6 w-10 shrink-0 rounded-full bg-n-300 transition-colors data-[state=checked]:bg-brand-600">
        <SW.Thumb className="block size-5 translate-x-0.5 rounded-full bg-white shadow-sm transition-transform duration-200 data-[state=checked]:translate-x-[18px]" />
      </SW.Root>
      {label}
    </label>
  );
}

export function RangeSlider({ value, onChange, min = 0, max = 100, label }: { value: [number, number]; onChange: (v: [number, number]) => void; min?: number; max?: number; label: string }) {
  return (
    <SL.Root value={value} onValueChange={(v) => onChange([v[0], v[1]])} min={min} max={max} step={5} minStepsBetweenThumbs={1} className="relative flex h-5 w-full touch-none select-none items-center" aria-label={label}>
      <SL.Track className="relative h-1.5 grow rounded-full bg-inset"><SL.Range className="absolute h-full rounded-full bg-brand-500" /></SL.Track>
      {[0, 1].map((i) => <SL.Thumb key={i} aria-label={i ? "Maximum" : "Minimum"} className="block size-4 rounded-full border-2 border-brand-600 bg-card shadow-sm" />)}
    </SL.Root>
  );
}

// Filter trigger + checklist popover for picking several values.
export function MultiSelect({ label, options, value, onChange }: { label: string; options: { value: string; label: string; count?: number }[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <Popover trigger={
      <button type="button" aria-label={`Filter by ${label.toLowerCase()}${value.length ? `, ${value.length} selected` : ""}`} className={cn("press inline-flex h-10 items-center gap-2 rounded-sm border bg-card px-3 text-[14px] font-medium shadow-xs hover:border-line-strong", value.length ? "border-brand-line text-brand-fg" : "border-line text-fg")}>
        {label}{value.length > 0 && <span className="num grid h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1 text-[11px] text-white">{value.length}</span>}<ChevronDown className="size-4 text-fg-3" />
      </button>
    } className="w-60 p-1">
      <ul role="listbox" aria-multiselectable aria-label={label}>
        {options.map((o) => {
          const on = value.includes(o.value);
          return (
            <li key={o.value} role="option" aria-selected={on}>
              <button onClick={() => onChange(on ? value.filter((v) => v !== o.value) : [...value, o.value])} className="flex h-9 w-full items-center gap-2.5 rounded-sm px-2.5 text-left text-[14px] hover:bg-inset">
                <span className={cn("grid size-4 place-items-center rounded-[5px] border", on ? "border-brand-600 bg-brand-600 text-white" : "border-line-strong")}>{on && <Check className="size-3" strokeWidth={3} />}</span>
                <span className="flex-1 truncate">{o.label}</span>{o.count != null && <span className="num t-caption text-fg-3">{o.count}</span>}
              </button>
            </li>
          );
        })}
      </ul>
      {value.length > 0 && <button onClick={() => onChange([])} className="mt-1 w-full rounded-sm border-t border-line px-2.5 py-2 text-left text-[13px] font-medium text-brand-fg hover:bg-inset">Clear</button>}
    </Popover>
  );
}

export type DateRange = { from?: string; to?: string };
const PRESETS: [string, number | null][] = [["All time", null], ["Last 7 days", 7], ["Last 30 days", 30], ["Last 90 days", 90]];
export function DateRangePicker({ value, onChange }: { value: DateRange; onChange: (v: DateRange) => void }) {
  const label = value.from || value.to ? `${value.from ?? "Start"} to ${value.to ?? "Today"}` : "All time";
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return (
    <Popover trigger={<button className="press inline-flex h-10 items-center gap-2 rounded-sm border border-line bg-card px-3 text-[14px] font-medium shadow-xs hover:border-line-strong"><Calendar className="size-4 text-fg-3" />{label}<ChevronDown className="size-4 text-fg-3" /></button>} align="end" className="w-72">
      <div className="grid grid-cols-2 gap-1">
        {PRESETS.map(([l, d]) => <button key={l} onClick={() => onChange(d == null ? {} : { from: iso(new Date(Date.now() - d * 864e5)) })} className="rounded-sm px-2.5 py-2 text-left text-[13px] font-medium hover:bg-inset">{l}</button>)}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-line pt-3">
        <label className="t-caption text-fg-2">From<Input type="date" value={value.from ?? ""} onChange={(e) => onChange({ ...value, from: e.target.value || undefined })} className="mt-1 h-9 px-2 text-[13px]" /></label>
        <label className="t-caption text-fg-2">To<Input type="date" value={value.to ?? ""} onChange={(e) => onChange({ ...value, to: e.target.value || undefined })} className="mt-1 h-9 px-2 text-[13px]" /></label>
      </div>
      <p className="t-caption mt-3 text-fg-3">Filters by the date each call was added.</p>
    </Popover>
  );
}
