"use client";
import { Check, Copy, Play } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";

export function Quote({ children, onPlay, time, label = "Say this instead", className }: { children: string; onPlay?: () => void; time?: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <figure className={cn("rounded-md border border-brand-line bg-brand-soft/60 p-4", className)}>
      <figcaption className="t-caption flex items-center gap-2 text-brand-fg">{label}</figcaption>
      <blockquote className="t-small mt-1.5 text-fg">&ldquo;{children}&rdquo;</blockquote>
      <div className="mt-3 flex gap-1.5">
        <button onClick={async () => { await navigator.clipboard.writeText(children); setCopied(true); setTimeout(() => setCopied(false), 1600); }} className="press inline-flex h-8 items-center gap-1.5 rounded-sm bg-card px-2.5 text-[13px] font-medium text-fg shadow-xs ring-1 ring-line hover:bg-inset">
          {copied ? <Check className="pop size-3.5 text-success-fg" /> : <Copy className="size-3.5" />}{copied ? "Copied" : "Copy"}
        </button>
        {onPlay && <button onClick={onPlay} className="press inline-flex h-8 items-center gap-1.5 rounded-sm px-2.5 text-[13px] font-medium text-brand-fg hover:bg-brand-soft"><Play className="size-3.5" />{time ? `Hear it at ${time}` : "Hear it"}</button>}
      </div>
    </figure>
  );
}
