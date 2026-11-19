"use client";
import { X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { CallLite } from "@/lib/calls";
import { on } from "@/lib/events";
import { RepProfile } from "../rep-profile";
import { Sheet, SheetClose } from "../ui";

export function RepDrawer({ calls }: { calls: CallLite[] }) {
  const [name, setName] = useState<string | null>(null);
  useEffect(() => on("rep", (n) => setName(n)), []);
  return (
    <Sheet open={!!name} onOpenChange={(o) => !o && setName(null)} title={name ? `${name}, rep profile` : "Rep"}>
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-6">
        <span className="t-label text-fg-2">Rep profile</span>
        <div className="flex items-center gap-2">
          {name && <Link href={`/reps?rep=${encodeURIComponent(name)}`} onClick={() => setName(null)} className="t-label text-brand-fg hover:underline">Open full page</Link>}
          <SheetClose className="press grid size-9 place-items-center rounded-sm text-fg-3 hover:bg-inset hover:text-fg" aria-label="Close"><X className="size-4" /></SheetClose>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6">{name && <RepProfile calls={calls} name={name} compact />}</div>
    </Sheet>
  );
}
