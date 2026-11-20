"use client";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowDown, ArrowUp, Bookmark, ChevronsUpDown, Columns3, Download, Ellipsis, ExternalLink, Link2, RefreshCw, Rows2, Rows3, SlidersHorizontal, Trash2, UserPlus, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { CallLite } from "@/lib/calls";
import { cn } from "@/lib/cn";
import { band, BAND_LABEL, filterCalls, plural, type CallFilter } from "@/lib/display";
import { mmss, outcomeLabel, STATUS_LABEL, typeLabel } from "@/lib/format";
import { CALL_TYPES } from "@/lib/framework";
import { Outcome, TypeChip } from "../call-meta";
import { Avatar, BAND_COLOR, Button, Card, Checkbox, DateRangePicker, Dialog, EmptyState, IconButton, Kbd, Menu, MultiSelect, Popover, RangeSlider, ScoreRing, SearchInput, Segmented, Switch, Tooltip } from "../ui";

export type Row = Omit<CallLite, "analysis"> & { analysis: null; scorecard: string | null; summary: string | null; customer_name: string | null; assignee: string | null; missedSteps: string[]; stepLabels: string[] };
const COLS = ["type", "rep", "outcome", "score", "length", "date"] as const;
type Col = (typeof COLS)[number];
const COL_LABEL: Record<Col, string> = { type: "Type", rep: "Rep", outcome: "Outcome", score: "Score", length: "Length", date: "Added" };
const VIEWS = "saved-call-views";

function readFilter(sp: URLSearchParams): CallFilter & { status?: string } {
  const list = (k: string) => sp.get(k)?.split(",").filter(Boolean);
  return {
    type: sp.get("type") ?? undefined, q: sp.get("q") ?? undefined, reps: list("rep"), outcomes: list("outcome"),
    min: sp.has("min") ? Number(sp.get("min")) : undefined, max: sp.has("max") ? Number(sp.get("max")) : undefined,
    attention: sp.get("attention") === "1", missed: sp.get("missed") ?? undefined, from: sp.get("from") ?? undefined, to: sp.get("to") ?? undefined,
    sort: sp.get("sort") ?? undefined, dir: (sp.get("dir") as "asc" | "desc") ?? undefined, status: sp.get("status") ?? undefined,
  };
}

export function CallsTable({ rows }: { rows: Row[] }) {
  const sp = useSearchParams(), router = useRouter(), path = usePathname();
  const f = readFilter(new URLSearchParams(sp));
  const [q, setQ] = useState(f.q ?? "");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [cursor, setCursor] = useState(0);
  const [anchor, setAnchor] = useState<number | null>(null);
  const [dense, setDense] = useState(false);
  const [hidden, setHidden] = useState<Col[]>([]);
  const [views, setViews] = useState<{ name: string; query: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState<Row[]>([]);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => { try { setViews(JSON.parse(localStorage.getItem(VIEWS) ?? "[]")); setDense(localStorage.getItem("density") === "compact"); setHidden(JSON.parse(localStorage.getItem("hidden-cols") ?? "[]")); } catch {} }, []);

  const set = useCallback((patch: Record<string, string | undefined | null>) => {
    const next = new URLSearchParams(sp);
    for (const [k, v] of Object.entries(patch)) { if (v == null || v === "") next.delete(k); else next.set(k, v); }
    router.replace(`${path}${next.size ? `?${next}` : ""}`, { scroll: false });
  }, [sp, router, path]);
  useEffect(() => { const t = setTimeout(() => { if ((f.q ?? "") !== q) set({ q }); }, 250); return () => clearTimeout(t); }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  const scoped = useMemo(() => rows.filter((r) => (f.status ? r.status === f.status : true)), [rows, f.status]);
  const list = useMemo(() => filterCalls(scoped, f), [scoped, sp]); // eslint-disable-line react-hooks/exhaustive-deps
  const typeCounts = (t?: string) => filterCalls(scoped, { ...f, type: t }).length;
  const types = Object.keys(CALL_TYPES).filter((t) => rows.some((r) => r.call_type === t));
  const reps = [...new Set(rows.map((r) => r.rep ?? "Unknown"))].sort();
  const outcomes = [...new Set(rows.map((r) => r.outcome).filter(Boolean))] as string[];
  const show = (c: Col) => !hidden.includes(c);

  // Keyboard: J/K or arrows move, Enter opens, X selects.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea, select, [role=dialog], [role=menu]") || e.metaKey || e.ctrlKey) return;
      if (e.key === "j" || e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => Math.min(c + 1, list.length - 1)); }
      else if (e.key === "k" || e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
      else if (e.key === "Enter" && list[cursor]) router.push(`/calls/${list[cursor].id}`);
      else if (e.key === "x" && list[cursor]) toggle(cursor, false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  useEffect(() => { document.querySelector(`[data-row="${cursor}"]`)?.scrollIntoView({ block: "nearest" }); }, [cursor]);

  function toggle(i: number, shift: boolean) {
    setSel((s) => {
      const n = new Set(s);
      if (shift && anchor != null) { const [a, b] = [Math.min(anchor, i), Math.max(anchor, i)]; list.slice(a, b + 1).forEach((r) => n.add(r.id)); }
      else if (n.has(list[i].id)) n.delete(list[i].id); else n.add(list[i].id);
      return n;
    });
    setAnchor(i);
  }
  const sortBy = (key: string) => set({ sort: key, dir: f.sort === key && f.dir !== "desc" ? "desc" : "asc" });
  const chosen = list.filter((r) => sel.has(r.id));

  async function bulkAssign(to: "rep" | "Office") {
    setBusy(true);
    const res = await Promise.allSettled(chosen.map((r) => fetch(`/api/calls/${r.id}`, { method: "PATCH", body: JSON.stringify({ assignee: to === "rep" ? r.rep ?? "Office" : "Office" }) }).then((x) => { if (!x.ok) throw new Error(); })));
    setBusy(false); setSel(new Set());
    const ok = res.filter((x) => x.status === "fulfilled").length;
    toast[ok === res.length ? "success" : "error"](`Assigned ${ok} of ${res.length} calls`);
    router.refresh();
  }
  async function rescore(ids: string[]) {
    setBusy(true);
    const t = toast.loading(`Re-scoring ${ids.length} call${ids.length > 1 ? "s" : ""}. This takes about a minute each.`);
    let ok = 0;
    for (const id of ids) { const r = await fetch(`/api/calls/${id}/process`, { method: "POST" }); if (r.ok) ok++; }
    setBusy(false); setSel(new Set());
    toast[ok === ids.length ? "success" : "error"](`Re-scored ${ok} of ${ids.length}`, { id: t });
    router.refresh();
  }
  async function remove() {
    setBusy(true);
    const res = await Promise.allSettled(toDelete.map((r) => fetch(`/api/calls/${r.id}`, { method: "DELETE" }).then((x) => { if (!x.ok) throw new Error(); })));
    setBusy(false); setToDelete([]); setSel(new Set());
    const ok = res.filter((x) => x.status === "fulfilled").length;
    toast[ok === res.length ? "success" : "error"](`Deleted ${ok} of ${plural(res.length, "call")}`);
    router.refresh();
  }
  function exportCsv() {
    const head = ["Call", "Customer", "Type", "Rep", "Outcome", "Score", "Max", "Grade", "Length (s)", "Summary"];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const body = (chosen.length ? chosen : list).map((r) => [r.label, r.customer_name, typeLabel(r.call_type), r.rep, outcomeLabel(r.outcome), r.score, r.score_max, r.grade, r.duration_sec, r.summary].map(esc).join(","));
    const url = URL.createObjectURL(new Blob([[head.join(","), ...body].join("\n")], { type: "text/csv" }));
    Object.assign(document.createElement("a"), { href: url, download: "calls.csv" }).click();
    URL.revokeObjectURL(url);
  }
  function saveView() {
    const name = prompt("Name this view", "My view")?.trim();
    if (!name) return;
    const next = [...views.filter((v) => v.name !== name), { name, query: sp.toString() }];
    setViews(next); localStorage.setItem(VIEWS, JSON.stringify(next)); toast.success(`Saved "${name}"`);
  }

  const chips: [string, string, Record<string, null>][] = [
    ...(f.q ? [["q", `Search: ${f.q}`, { q: null }] as [string, string, Record<string, null>]] : []),
    ...(f.reps?.map((r) => [`rep${r}`, `Rep: ${r}`, { rep: f.reps!.filter((x) => x !== r).join(",") || null }] as [string, string, Record<string, null>]) ?? []),
    ...(f.outcomes?.map((o) => [`o${o}`, outcomeLabel(o), { outcome: f.outcomes!.filter((x) => x !== o).join(",") || null }] as [string, string, Record<string, null>]) ?? []),
    ...(f.min != null || f.max != null ? [["score", `Score ${f.min ?? 0} to ${f.max ?? 100}%`, { min: null, max: null }] as [string, string, Record<string, null>]] : []),
    ...(f.attention ? [["att", "Needs attention", { attention: null }] as [string, string, Record<string, null>]] : []),
    ...(f.missed ? [["missed", `Missed: ${f.missed}`, { missed: null }] as [string, string, Record<string, null>]] : []),
    ...(f.status ? [["status", f.status === "error" ? "Failed to process" : `Status: ${f.status}`, { status: null }] as [string, string, Record<string, null>]] : []),
    ...(f.from || f.to ? [["date", `Added ${f.from ?? "start"} to ${f.to ?? "today"}`, { from: null, to: null }] as [string, string, Record<string, null>]] : []),
  ];
  const clearAll = () => { setQ(""); router.replace(path, { scroll: false }); };

  const virtual = list.length > 100;
  const v = useVirtualizer({ count: list.length, getScrollElement: () => scroller.current, estimateSize: () => (dense ? 52 : 68), overscan: 10, enabled: virtual });
  const items = virtual ? v.getVirtualItems().map((x) => ({ i: x.index, start: x.start })) : list.map((_, i) => ({ i, start: 0 }));
  const pad = dense ? "py-2" : "py-3.5";

  const Th = ({ k, label, right }: { k: string; label: string; right?: boolean }) => (
    <th scope="col" aria-sort={f.sort === k ? (f.dir === "desc" ? "descending" : "ascending") : "none"} className={cn("t-th px-3 py-3 text-fg-3", right && "text-right")}>
      <button onClick={() => sortBy(k)} className={cn("inline-flex items-center gap-1 hover:text-fg", f.sort === k && "text-fg")}>{label}{f.sort === k ? (f.dir === "desc" ? <ArrowDown className="size-3.5" /> : <ArrowUp className="size-3.5" />) : <ChevronsUpDown className="size-3.5 opacity-40" />}</button>
    </th>
  );

  return (
    <div className="mt-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Segmented label="Call type" value={f.type ?? "all"} onChange={(t) => set({ type: t === "all" ? null : t })} items={[{ value: "all", label: "All", count: typeCounts(undefined) }, ...types.map((t) => ({ value: t, label: typeLabel(t), count: typeCounts(t) }))]} />
          <SearchInput data-page-search value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search calls" aria-label="Search calls by customer, rep or topic" hint={<Kbd>/</Kbd>} className="w-full sm:ml-auto sm:w-80" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MultiSelect label="Rep" value={f.reps ?? []} onChange={(v) => set({ rep: v.join(",") })} options={reps.map((r) => ({ value: r, label: r, count: rows.filter((x) => (x.rep ?? "Unknown") === r).length }))} />
          <MultiSelect label="Outcome" value={f.outcomes ?? []} onChange={(v) => set({ outcome: v.join(",") })} options={outcomes.map((o) => ({ value: o, label: outcomeLabel(o), count: rows.filter((x) => x.outcome === o).length }))} />
          <Popover trigger={<Button className={cn(f.min != null || f.max != null ? "border-brand-line text-brand-fg" : "")}><SlidersHorizontal />Score</Button>} className="w-64">
            <p className="t-label">Score range</p>
            <p className="num t-caption mt-0.5 text-fg-3">{f.min ?? 0}% to {f.max ?? 100}%</p>
            <div className="mt-4"><RangeSlider label="Score range" value={[f.min ?? 0, f.max ?? 100]} onChange={([a, b]) => set({ min: a ? String(a) : null, max: b < 100 ? String(b) : null })} /></div>
          </Popover>
          <DateRangePicker value={{ from: f.from, to: f.to }} onChange={(d) => set({ from: d.from, to: d.to })} />
          <span className="ml-1"><Switch checked={!!f.attention} onChange={(on) => set({ attention: on ? "1" : null })} label="Needs attention" /></span>
          <div className="ml-auto flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={saveView}><Bookmark />Save view</Button>
            <Menu label="Columns" trigger={<IconButton label="Columns" size="icon-sm"><Columns3 /></IconButton>} items={COLS.map((c) => ({ label: `${show(c) ? "Hide" : "Show"} ${COL_LABEL[c].toLowerCase()}`, onSelect: () => { const n = show(c) ? [...hidden, c] : hidden.filter((x) => x !== c); setHidden(n); localStorage.setItem("hidden-cols", JSON.stringify(n)); } }))} />
            <IconButton label={dense ? "Comfortable rows" : "Compact rows"} size="icon-sm" onClick={() => { setDense(!dense); localStorage.setItem("density", dense ? "comfortable" : "compact"); }}>{dense ? <Rows2 /> : <Rows3 />}</IconButton>
            <IconButton label="Export CSV" size="icon-sm" onClick={exportCsv}><Download /></IconButton>
          </div>
        </div>
        {(views.length > 0 || chips.length > 0) && (
          <div className="flex flex-wrap items-center gap-2">
            {views.map((vw) => (
              <span key={vw.name} className="inline-flex items-center rounded-xs border border-brand-line bg-brand-soft text-[13px] font-medium text-brand-fg">
                <button onClick={() => router.replace(`${path}?${vw.query}`, { scroll: false })} className="flex items-center gap-1.5 py-1 pl-3"><Bookmark className="size-3.5" />{vw.name}</button>
                <button aria-label={`Delete view ${vw.name}`} onClick={() => { const n = views.filter((x) => x !== vw); setViews(n); localStorage.setItem(VIEWS, JSON.stringify(n)); }} className="px-2 py-1 opacity-60 hover:opacity-100"><X className="size-3.5" /></button>
              </span>
            ))}
            {chips.map(([k, label, patch]) => (
              <button key={k} onClick={() => { if ("q" in patch) setQ(""); set(patch); }} className="press inline-flex h-7 items-center gap-1.5 rounded-xs bg-inset pl-3 pr-2 text-[13px] font-medium text-fg-2 hover:text-fg">{label}<X className="size-3.5" /></button>
            ))}
            {chips.length > 0 && <button onClick={clearAll} className="t-label px-1 text-brand-fg hover:underline">Clear all</button>}
          </div>
        )}
      </div>

      <Card className="mt-4 overflow-hidden">
        {list.length === 0 ? (
          <EmptyState title={rows.length ? "No calls match these filters" : "No calls yet"} body={rows.length ? "Try a different search or remove a filter." : "Upload your first recording to see it here."} action={rows.length ? <Button onClick={clearAll}>Clear filters</Button> : undefined} />
        ) : (
          <>
            {/* Desktop table */}
            <div ref={scroller} className={cn("hidden overflow-x-auto md:block", virtual && "max-h-[70dvh] overflow-y-auto")}>
              <table className="w-full min-w-[960px] text-left" aria-label="Calls" aria-rowcount={list.length}>
                <thead className="sticky top-0 z-10 border-b border-line bg-card/95 backdrop-blur">
                  <tr>
                    <th className="w-10 py-3 pl-5"><Checkbox label="Select all" checked={sel.size === 0 ? false : sel.size === list.length ? true : "indeterminate"} onChange={(on) => setSel(on ? new Set(list.map((r) => r.id)) : new Set())} /></th>
                    <Th k="label" label="Call" />
                    {show("type") && <Th k="type" label="Type" />}
                    {show("rep") && <Th k="rep" label="Rep" />}
                    {show("outcome") && <Th k="outcome" label="Outcome" />}
                    {show("score") && <Th k="score" label="Score" />}
                    {show("length") && <Th k="length" label="Length" right />}
                    {show("date") && <Th k="date" label="Added" />}
                    <th className="w-10 pr-3"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody style={virtual ? { height: v.getTotalSize(), position: "relative" } : undefined}>
                  {items.map(({ i, start }) => {
                    const r = list[i], b = band(r.grade, r.score, r.score_max), on = sel.has(r.id), active = i === cursor, failed = r.status === "error", working = r.status !== "done" && !failed;
                    return (
                      <tr key={r.id} data-row={i} aria-selected={on} onClick={(e) => { if ((e.target as HTMLElement).closest("button, a, [role=checkbox]")) return; setCursor(i); router.push(`/calls/${r.id}`); }}
                        className={cn("group relative cursor-pointer border-b border-line transition-colors last:border-0 hover:bg-inset/70", on && "bg-brand-soft/60", active && "bg-inset/70")}
                        style={virtual ? { position: "absolute", top: 0, transform: `translateY(${start}px)`, width: "100%", display: "table", tableLayout: "fixed" } : undefined}>
                        <td className={cn("relative select-none pl-5", pad)} onMouseDown={(e) => e.shiftKey && e.preventDefault()} onClick={(e) => { e.stopPropagation(); toggle(i, e.shiftKey); }}>
                          <span className={cn("absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-brand-500 transition-opacity", active || on ? "opacity-100" : "opacity-0 group-hover:opacity-100")} aria-hidden />
                          <Checkbox label={`Select ${r.label}`} checked={on} onChange={() => {}} />
                        </td>
                        <td className={cn("max-w-[270px] px-3", pad)}>
                          <Link href={`/calls/${r.id}`} className="block focus-visible:rounded-sm" onFocus={() => setCursor(i)}>
                            <span className="flex items-center gap-2"><span className="truncate text-[15px] font-medium">{r.customer_name || r.label}</span>{r.customer_name && <span className="t-caption shrink-0 text-fg-3">{r.label}</span>}</span>
                            {!dense && <span className="t-small block truncate text-fg-2">{r.status === "done" ? r.summary : r.status === "error" ? <span className="text-danger-fg">Scoring failed. {r.error}</span> : <span className="pulse-dot text-brand-fg">{STATUS_LABEL[r.status]}</span>}</span>}
                          </Link>
                        </td>
                        {show("type") && <td className={cn("px-3", pad)}>{failed ? <span className="t-small text-fg-3">Unknown</span> : <TypeChip type={r.call_type} size="sm" />}</td>}
                        {show("rep") && <td className={cn("px-3", pad)}>{r.rep ? <span className="t-small flex items-center gap-2"><Avatar name={r.rep} size={24} />{r.rep}</span> : <span className="t-small flex items-center gap-2 text-fg-3"><Avatar kind="unknown" size={24} />Unknown</span>}</td>}
                        {show("outcome") && <td className={cn("px-3", pad)}>{failed ? <span className="t-small text-fg-3">None</span> : <Outcome outcome={r.outcome} />}</td>}
                        {show("score") && <td className={cn("px-3", pad)}>{working ? <span className="t-small pulse-dot text-brand-fg">{(r.duration_sec ?? 0) > 600 ? "Long call, about 2 min" : STATUS_LABEL[r.status]}</span> : failed ? <Button size="sm" onClick={() => rescore([r.id])} disabled={busy}><RefreshCw />Retry</Button> : r.score_max ? (
                          <Tooltip content={`${r.score} of ${r.score_max} points on the ${r.scorecard ?? "scorecard"}`}>
                            <span className="flex items-center gap-2.5"><ScoreRing value={r.score ?? 0} max={r.score_max} band={b} size={32} /><span className="leading-tight"><span className="num t-small block font-semibold">{Math.round(((r.score ?? 0) / r.score_max) * 100)}%</span><span className="t-caption flex items-center gap-1 whitespace-nowrap text-fg-2"><span className="size-1.5 rounded-xs" style={{ background: BAND_COLOR[b] }} />{BAND_LABEL[b]}</span></span></span>
                          </Tooltip>
                        ) : <span className="t-small text-fg-3">Not scorable</span>}</td>}
                        {show("length") && <td className={cn("num t-small px-3 text-right text-fg-2", pad)}>{mmss(r.duration_sec)}</td>}
                        {show("date") && <td className={cn("t-small whitespace-nowrap px-3 text-fg-2", pad)}><Tooltip content={new Date(r.created_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}><span>{new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span></Tooltip></td>}
                        <td className="pr-4 text-right">
                          <Menu label="Call actions" trigger={<IconButton label={`Actions for ${r.label}`} size="icon-sm" className="opacity-60 group-hover:opacity-100"><Ellipsis /></IconButton>} items={[
                            { label: "Open", icon: <ExternalLink />, onSelect: () => router.push(`/calls/${r.id}`) },
                            { label: `Assign to ${r.rep ?? "Office"}`, icon: <UserPlus />, onSelect: async () => { const x = await fetch(`/api/calls/${r.id}`, { method: "PATCH", body: JSON.stringify({ assignee: r.rep ?? "Office" }) }); toast[x.ok ? "success" : "error"](x.ok ? `Assigned to ${r.rep ?? "Office"}` : "Couldn't assign"); } },
                            { label: "Re-score", icon: <RefreshCw />, onSelect: () => rescore([r.id]) },
                            { label: "Copy link", icon: <Link2 />, onSelect: async () => { await navigator.clipboard.writeText(`${location.origin}/calls/${r.id}`); toast.success("Link copied"); } },
                            "separator",
                            { label: "Delete", icon: <Trash2 />, danger: true, onSelect: () => setToDelete([r]) },
                          ]} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <ul className="divide-y divide-line md:hidden">
              {list.map((r) => {
                const b = band(r.grade, r.score, r.score_max);
                return (
                  <li key={r.id}>
                    <Link href={`/calls/${r.id}`} className="flex gap-3 px-4 py-4 active:bg-inset">
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2"><span className="truncate text-[15px] font-medium">{r.customer_name || r.label}</span>{r.customer_name && <span className="t-caption shrink-0 text-fg-3">{r.label}</span>}</p>
                        <p className="t-small mt-0.5 line-clamp-2 text-fg-2">{r.status === "error" ? r.error : r.summary}</p>
                        <div className="mt-2.5 flex flex-wrap items-center gap-2"><TypeChip type={r.call_type} size="sm" /><span className="t-caption flex items-center gap-1.5 text-fg-2"><Avatar name={r.rep} kind={r.rep ? "person" : "unknown"} size={20} />{r.rep ?? "Unknown"}</span><span className="num t-caption text-fg-3">{mmss(r.duration_sec)}</span></div>
                      </div>
                      {r.status === "error" ? <span className="t-caption self-center font-medium text-danger-fg">Failed</span> : r.score_max ? <div className="flex flex-col items-center gap-1"><ScoreRing value={r.score ?? 0} max={r.score_max} band={b} size={44} label={`${Math.round(((r.score ?? 0) / r.score_max) * 100)}`} /><span className="t-caption text-fg-2">{BAND_LABEL[b]}</span></div> : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Card>
      <p className="t-caption mt-3 hidden text-fg-3 md:block"><Kbd>J</Kbd> <Kbd>K</Kbd> to move, <Kbd>↵</Kbd> to open, <Kbd>X</Kbd> to select, Shift+click to select a range. Showing <span className="num">{list.length}</span> of <span className="num">{rows.length}</span>.</p>

      {chosen.length > 0 && (
        <div className="fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
          <div className="rise flex items-center gap-2 rounded-lg border border-line bg-elevated p-2 pl-4 shadow-lg" role="toolbar" aria-label="Bulk actions">
            <span className="t-label num mr-2">{chosen.length} selected</span>
            <Button size="sm" disabled={busy} onClick={() => bulkAssign("rep")}><UserPlus />Assign to rep</Button>
            <Button size="sm" disabled={busy} onClick={() => rescore(chosen.map((r) => r.id))}><RefreshCw />Re-score</Button>
            <Button size="sm" disabled={busy} onClick={exportCsv}><Download />Export CSV</Button>
            <Button size="sm" variant="danger" disabled={busy} onClick={() => setToDelete(chosen)}><Trash2 />Delete</Button>
            <IconButton label="Clear selection" size="icon-sm" onClick={() => setSel(new Set())}><X /></IconButton>
          </div>
        </div>
      )}
      <Dialog open={toDelete.length > 0} onOpenChange={(o) => !o && !busy && setToDelete([])}
        title={toDelete.length === 1 ? `Delete ${toDelete[0].label}?` : `Delete ${plural(toDelete.length, "call")}?`}
        description="The recording, transcript and score are removed for good. This can't be undone."
        footer={<><Button onClick={() => setToDelete([])} disabled={busy}>Cancel</Button><Button variant="danger" loading={busy} onClick={remove}><Trash2 />Delete</Button></>}>
        {toDelete.length > 1 && <p className="t-small text-fg-2">{toDelete.map((r) => r.label).join(", ")}</p>}
      </Dialog>
      {rows.some((r) => r.status === "error") && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-md border border-danger-500/25 bg-danger-soft px-4 py-3">
          <span className="t-small text-danger-fg">{plural(rows.filter((r) => r.status === "error").length, "call")} failed to score and {rows.filter((r) => r.status === "error").length === 1 ? "is" : "are"} left out of every metric.</span>
          <span className="ml-auto flex gap-2">
            {!f.status && <Button size="sm" variant="ghost" onClick={() => set({ status: "error" })}>Show only failed</Button>}
            <Button size="sm" onClick={() => rescore(rows.filter((r) => r.status === "error").map((r) => r.id))} disabled={busy}><RefreshCw />Retry all failed</Button>
          </span>
        </div>
      )}
    </div>
  );
}
