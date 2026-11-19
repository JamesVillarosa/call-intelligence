"use client";
import { Upload } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { plural } from "@/lib/display";
import { emit } from "@/lib/events";
import { Button, DateRangePicker } from "./ui";

export function UploadTrigger({ size = "md" }: { size?: "sm" | "md" }) {
  return <Button variant="primary" size={size} onClick={() => emit("upload")}><Upload />Upload call</Button>;
}

// Date range kept in the URL so filtered views are shareable.
export function DateFilter() {
  const sp = useSearchParams(), router = useRouter(), path = usePathname();
  return (
    <DateRangePicker value={{ from: sp.get("from") ?? undefined, to: sp.get("to") ?? undefined }} onChange={(v) => {
      const q = new URLSearchParams(sp);
      for (const k of ["from", "to"] as const) { if (v[k]) q.set(k, v[k]!); else q.delete(k); }
      router.replace(`${path}${q.size ? `?${q}` : ""}`, { scroll: false });
    }} />
  );
}

// The same count wording everywhere. The parts always add up to the total.
export function CountLine({ total, status }: { total: number; status: { scored: number; notScorable: number; failed: number; processing: number; queued: number } }) {
  const parts: React.ReactNode[] = [<span key="s"><span className="num">{status.scored}</span> scored</span>];
  if (status.notScorable) parts.push(<span key="n"><span className="num">{status.notScorable}</span> not scorable</span>);
  if (status.processing) parts.push(<span key="p" className="text-brand-fg"><span className="num">{status.processing}</span> processing</span>);
  if (status.queued) parts.push(<span key="q"><span className="num">{status.queued}</span> queued</span>);
  if (status.failed) parts.push(<Link key="f" href="/calls?status=error" className="text-danger-fg underline decoration-danger-fg/30 hover:decoration-danger-fg"><span className="num">{status.failed}</span> failed</Link>);
  return <>{plural(total, "call")}: {parts.map((p, i) => <span key={i}>{i > 0 && ", "}{p}</span>)}</>;
}
