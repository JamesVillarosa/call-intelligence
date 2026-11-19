import { Info } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { Tooltip } from "./overlay";

export function KpiCard({ label, help, value, denom, delta, spark, href, i = 0 }: { label: string; help: string; value: React.ReactNode; denom?: React.ReactNode; delta?: React.ReactNode; spark?: React.ReactNode; href?: string; i?: number }) {
  const body = (
    <>
      <div className="flex items-center gap-1.5">
        <span className="t-label text-fg-2">{label}</span>
        <Tooltip content={help}><span role="img" className="text-fg-3 hover:text-fg-2" aria-label={`${label}: ${help}`}><Info className="size-3.5" /></span></Tooltip>
        <span className="ml-auto">{delta}</span>
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="t-h1 num">{value}</div>
          {denom && <div className="t-small mt-1 text-fg-2">{denom}</div>}
        </div>
        {spark}
      </div>
    </>
  );
  const cls = cn("rise relative block rounded-lg border border-line bg-card p-5 shadow-xs", href && "lift hover:border-line-strong");
  return href ? <Link href={href} className={cls} style={{ ["--i" as string]: i }}>{body}</Link> : <div className={cls} style={{ ["--i" as string]: i }}>{body}</div>;
}
