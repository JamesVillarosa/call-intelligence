"use client";
import { Command } from "cmdk";
import {
  Bell, Building2, HeartHandshake, PhoneIncoming, Sparkles, UserX, Check, ChevronDown, ChevronRight, CircleHelp, Keyboard, LayoutDashboard, Menu as MenuIcon, RotateCcw, 
  PanelLeftClose, PanelLeftOpen, Phone, Search, Upload, Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocal } from "@/lib/use-local";
import type { CallLite } from "@/lib/calls";
import { cn } from "@/lib/cn";
import { ago, plural } from "@/lib/display";
import { toast } from "sonner";
import { emit, on } from "@/lib/events";
import { money, typeLabel } from "@/lib/format";
import { Logo } from "../logo";
import { Avatar, Dialog, Kbd, Menu, Popover, Sheet } from "../ui";
import { RepDrawer } from "./rep-drawer";
import { UploadDialog } from "./upload-dialog";

const KIND_ICON: Record<string, typeof Bell> = { cancel: UserX, complaint: HeartHandshake, callback: PhoneIncoming, coach: Sparkles };

const NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/calls", label: "Calls", icon: Phone },
  { href: "/reps", label: "Reps", icon: Users },
];
const SHORTCUTS: [string, string][] = [["⌘ K", "Open command palette"], ["G then O", "Go to Overview"], ["G then C", "Go to Calls"], ["G then R", "Go to Reps"], ["U", "Upload a call"], ["/", "Search"], ["J / K", "Next / previous call"], ["Space", "Play or pause audio"], ["← / →", "Seek 5 seconds (Shift: 15)"], ["?", "Show shortcuts"]];

export type TodoLite = { id: string; title: string; kind: string; rep: string | null; value: number; urgent: boolean; created: string };

export function AppShell({ calls, todo, children }: { calls: CallLite[]; todo: TodoLite[]; children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useLocal("sidebar-collapsed", false);
  // The drawer remembers the page it was opened on, so navigating closes it.
  const [drawerAt, setDrawerAt] = useState<string | null>(null);
  const drawer = drawerAt === path;
  const setDrawer = (o: boolean) => setDrawerAt(o ? path : null);
  const [palette, setPalette] = useState(false);
  const [help, setHelp] = useState(false);

  useEffect(() => on("help", () => setHelp(true)), []);
  // While any call is processing, refresh in the background and announce each call as it finishes.
  const busy = calls.some((c) => c.status === "uploaded" || c.status === "transcribing" || c.status === "analyzing");
  const prev = useRef(new Map(calls.map((c) => [c.id, c.status])));
  useEffect(() => {
    for (const c of calls) {
      const was = prev.current.get(c.id);
      if (was && was !== c.status && c.status === "done") toast.success(`${c.analysis?.customer_name || c.label} scored`);
      if (was && was !== c.status && c.status === "error") toast.error(`${c.label} failed to score`);
    }
    prev.current = new Map(calls.map((c) => [c.id, c.status]));
  }, [calls]);
  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(t);
  }, [busy, router]);
  useEffect(() => on("palette", () => setPalette(true)), []);

  // Global shortcuts. Ignored while typing in a field.
  useEffect(() => {
    let g = 0;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPalette((o) => !o); return; }
      const t = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey || t.closest("input, textarea, select, [contenteditable=true], [role=dialog]")) return;
      // "?" is Shift+/ on most layouts, so check it before "/".
      if (e.key === "?") { e.preventDefault(); setHelp(true); return; }
      const k = e.key.toLowerCase();
      if (g && Date.now() - g < 900) {
        g = 0;
        if (k === "o") router.push("/"); else if (k === "c") router.push("/calls"); else if (k === "r") router.push("/reps");
        return;
      }
      if (k === "g") g = Date.now();
      else if (k === "u") emit("upload");
      else if (e.key === "/" && !document.querySelector<HTMLInputElement>("[data-page-search]")) { e.preventDefault(); setPalette(true); }
      else if (e.key === "/") { e.preventDefault(); document.querySelector<HTMLInputElement>("[data-page-search]")?.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  const toggle = () => setCollapsed(!collapsed);
  const crumbs = useMemo(() => {
    const seg = path.split("/").filter(Boolean);
    if (!seg.length) return [{ label: "Overview" }];
    const out: { label: string; href?: string }[] = [{ label: seg[0] === "calls" ? "Calls" : seg[0] === "reps" ? "Reps" : seg[0], href: seg.length > 1 ? `/${seg[0]}` : undefined }];
    if (seg[1]) out.push({ label: seg[0] === "calls" ? calls.find((c) => c.id === seg[1])?.label ?? "Call" : decodeURIComponent(seg[1]) });
    return out;
  }, [path, calls]);

  const side = (mini: boolean) => (
    <div className="flex h-full flex-col gap-1 px-3 pb-3 pt-4">
      <div className={cn("flex items-center px-1", mini ? "justify-center" : "justify-between")}>
        <Link href="/" aria-label="Call Intelligence home">{mini ? <Logo variant="mark" size={32} /> : <Logo variant="full" size={32} />}</Link>
      </div>
      {!mini && (
        <Menu align="start" label="Workspace" trigger={
          <button className="press mt-4 flex w-full items-center gap-2.5 rounded-md border border-line bg-card p-2 text-left shadow-xs hover:border-line-strong">
            <span className="grid size-8 place-items-center rounded-sm bg-inset text-fg-2"><Building2 className="size-4" /></span>
            <span className="min-w-0 flex-1 leading-tight"><span className="t-label block truncate">Northwind Pest Co.</span><span className="t-caption text-fg-3">Workspace</span></span>
            <ChevronDown className="size-4 text-fg-3" />
          </button>
        } items={[{ label: "Northwind Pest Co.", icon: <Check />, onSelect: () => {} }, "separator", { label: "Add a workspace", onSelect: () => {} }]} />
      )}
      <p className={cn("t-th mb-1 mt-6 px-3 text-fg-3", mini && "sr-only")}>Workspace</p>
      <nav aria-label="Main" className="flex flex-col gap-0.5">
        {NAV.map(({ href, label, icon: I }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <Link key={href} href={href} aria-current={active ? "page" : undefined} title={mini ? label : undefined}
              className={cn("press relative flex h-10 items-center gap-3 rounded-sm px-3 text-[14px] font-medium transition-colors", mini && "justify-center px-0",
                active ? "bg-brand-soft text-brand-fg before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-r-full before:bg-brand-600" : "text-fg-2 hover:bg-inset hover:text-fg")}>
              <I className="size-[18px]" strokeWidth={1.75} />{!mini && <span className="flex-1">{label}</span>}
              {!mini && href === "/calls" && <span className="num rounded-full bg-inset px-2 text-[12px] text-fg-2">{calls.length}</span>}
            </Link>
          );
        })}
      </nav>
      <p className={cn("t-th mb-1 mt-6 px-3 text-fg-3", mini && "sr-only")}>Actions</p>
      <button onClick={() => emit("upload")} title={mini ? "Upload call" : undefined} className={cn("press flex h-10 items-center gap-3 rounded-sm px-3 text-[14px] font-medium text-fg-2 hover:bg-inset hover:text-fg", mini && "justify-center px-0")}>
        <Upload className="size-[18px]" strokeWidth={1.75} />{!mini && <span className="flex-1 text-left">Upload call</span>}{!mini && <Kbd>U</Kbd>}
      </button>
      <div className="mt-auto flex flex-col gap-1">
        {!mini && (
          <p className="t-caption px-3 pb-2 text-fg-3">Fictional demo data</p>
        )}
        <button onClick={() => setHelp(true)} title="Help and shortcuts" className={cn("press flex h-9 items-center gap-3 rounded-sm px-3 text-[14px] text-fg-2 hover:bg-inset hover:text-fg", mini && "justify-center px-0")}>
          <CircleHelp className="size-[18px]" strokeWidth={1.75} />{!mini && "Help and shortcuts"}
        </button>
        <button onClick={toggle} className={cn("press hidden h-9 items-center gap-3 rounded-sm px-3 text-[14px] text-fg-2 hover:bg-inset hover:text-fg lg:flex", mini && "justify-center px-0")} aria-label={mini ? "Expand sidebar" : "Collapse sidebar"}>
          {mini ? <PanelLeftOpen className="size-[18px]" strokeWidth={1.75} /> : <><PanelLeftClose className="size-[18px]" strokeWidth={1.75} />Collapse</>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="lg:flex">
      <aside className={cn("sticky top-0 hidden h-dvh shrink-0 border-r border-line bg-card transition-[width] duration-200 lg:block", collapsed ? "w-[72px]" : "w-[264px]")}>{side(collapsed)}</aside>
      <Sheet open={drawer} onOpenChange={setDrawer} title="Navigation" side="left">{side(false)}</Sheet>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-bg/80 px-4 backdrop-blur-md sm:px-8">
          <button onClick={() => setDrawer(true)} className="press -ml-1 grid size-10 place-items-center rounded-sm hover:bg-inset lg:hidden" aria-label="Open navigation"><MenuIcon className="size-5" /></button>
          <span className="lg:hidden"><Logo variant="mark" size={28} /></span>
          <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1.5 text-[14px] md:flex">
            {crumbs.map((c, i) => (
              <span key={i} className="flex min-w-0 items-center gap-1.5">
                {i > 0 && <ChevronRight className="size-4 shrink-0 text-fg-3" />}
                {c.href ? <Link href={c.href} className="truncate text-fg-2 hover:text-fg">{c.label}</Link> : <span className="truncate font-medium">{c.label}</span>}
              </span>
            ))}
          </nav>
          <button onClick={() => setPalette(true)} aria-label="Search calls, reps and actions (Ctrl K)" className="press ml-auto flex h-10 min-w-0 items-center gap-2 rounded-sm border border-line bg-card px-3 text-[14px] text-fg-3 shadow-xs hover:border-line-strong md:ml-6 md:w-80">
            <Search className="size-4 shrink-0" /><span className="hidden truncate sm:inline">Search calls, reps, actions</span><span className="ml-auto hidden gap-0.5 sm:flex"><Kbd>⌘</Kbd><Kbd>K</Kbd></span>
          </button>
          <div className="flex items-center gap-1 md:ml-auto">
            <Popover align="end" className="w-80 p-0" trigger={
              <button className="press relative grid size-10 place-items-center rounded-sm text-fg-2 hover:bg-inset hover:text-fg" aria-label={`${todo.length} open to-dos`}>
                <Bell className="size-[18px]" />{todo.length > 0 && <span className="num absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-brand-600 px-1 text-[11px] font-semibold text-white ring-2 ring-bg">{todo.length}</span>}
              </button>
            }>
              <div className="flex items-center border-b border-line px-4 py-3"><p className="t-label">To do <span className="num text-fg-3">{todo.length}</span></p>
                {todo.length > 0 && <button onClick={async () => { const r = await Promise.allSettled(todo.map((t) => fetch(`/api/calls/${t.id}`, { method: "PATCH", body: JSON.stringify({ done: true }) }))); toast.success(`Marked ${r.filter((x) => x.status === "fulfilled").length} done`); router.refresh(); }} className="t-label ml-auto text-brand-fg hover:underline">Mark all done</button>}</div>
              <ul className="max-h-96 overflow-y-auto py-1">
                {todo.length === 0 && <li className="t-small px-4 py-6 text-center text-fg-2">All caught up.</li>}
                {todo.slice(0, 10).map((t) => { const K = KIND_ICON[t.kind] ?? Bell; return (
                  <li key={t.id + t.kind}><Link href={`/calls/${t.id}`} className="flex gap-3 px-4 py-3 hover:bg-inset">
                    <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-inset text-fg-2"><K className="size-3.5" /></span>
                    <span className="min-w-0 flex-1"><span className="t-small block font-medium">{t.title}</span>
                      <span className="t-caption mt-0.5 flex flex-wrap items-center gap-x-2 text-fg-3">{t.rep && <span>{t.rep}</span>}{t.value > 0 && <span className="num">{money(t.value)}/yr</span>}{t.urgent && <span className="text-danger-fg">Due today</span>}<span>{ago(t.created)}</span></span></span>
                  </Link></li>
                ); })}
              </ul>
              <Link href="/#todo" className="t-label block border-t border-line px-4 py-3 text-brand-fg hover:bg-inset">Open the to-do queue</Link>
            </Popover>
            <Menu label="Account" trigger={<button className="press ml-1 rounded-full" aria-label="Account menu"><Avatar name="Office Manager" size={34} /></button>} items={[
              { label: "Keyboard shortcuts", icon: <Keyboard />, shortcut: "?", onSelect: () => setHelp(true) },
              { label: "Reset demo", icon: <RotateCcw />, onSelect: async () => { await fetch("/api/reset", { method: "POST" }); router.refresh(); } },
            ]} />
          </div>
        </header>
        <main id="main" className="pb-24">{children}</main>
      </div>

      <Palette open={palette} onOpenChange={setPalette} calls={calls} />
      <Dialog open={help} onOpenChange={setHelp} title="Keyboard shortcuts" description="Every action works without a mouse.">
        <ul className="divide-y divide-line">
          {SHORTCUTS.map(([k, d]) => <li key={k} className="t-small flex items-center justify-between py-2.5"><span className="text-fg-2">{d}</span><span className="flex gap-1">{k.split(" ").map((p, i) => p === "then" || p === "/" ? <span key={i} className="t-caption self-center text-fg-3">{p}</span> : <Kbd key={i}>{p}</Kbd>)}</span></li>)}
        </ul>
      </Dialog>
      <UploadDialog />
      <RepDrawer calls={calls} />
    </div>
  );
}

function Palette({ open, onOpenChange, calls }: { open: boolean; onOpenChange: (o: boolean) => void; calls: CallLite[] }) {
  const router = useRouter();
  const [recents] = useLocal<string[]>("recent-calls", []);
  const [q, setQ] = useState("");
  const hl = (t: string) => { const k = q ? t.toLowerCase().indexOf(q.toLowerCase()) : -1; return k < 0 ? t : <>{t.slice(0, k)}<mark className="rounded-xs bg-warning-100 text-fg">{t.slice(k, k + q.length)}</mark>{t.slice(k + q.length)}</>; };
  const recentCalls = q ? [] : (recents.map((id) => calls.find((c) => c.id === id)).filter(Boolean) as CallLite[]);
  const go = (href: string) => { onOpenChange(false); router.push(href); };
  const reps = [...new Set(calls.map((c) => c.rep).filter(Boolean))] as string[];
  const row = (c: CallLite) => (
    <Command.Item key={c.id} value={`${c.label} ${c.analysis?.customer_name ?? ""} ${c.rep ?? ""} ${c.analysis?.summary ?? ""}`} onSelect={() => go(`/calls/${c.id}`)} className={item}>
      <Phone className="size-4 text-fg-3" />
      <span className="min-w-0 flex-1"><span className="block truncate font-medium">{hl(c.analysis?.customer_name || c.label)}{c.analysis?.customer_name && <span className="ml-2 font-normal text-fg-3">{hl(c.label)}</span>}</span><span className="t-caption block truncate text-fg-3">{hl(c.rep ?? "Unknown rep")}, {typeLabel(c.call_type)}</span></span>
      {c.status === "done" && c.score_max ? <span className="num t-caption text-fg-2">{Math.round(((c.score ?? 0) / c.score_max) * 100)}%</span> : c.status === "error" ? <span className="t-caption text-danger-fg">Failed</span> : null}
    </Command.Item>
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Command palette" wide>
      <Command label="Command palette" className="-mx-6 -my-5" loop>
        <div className="flex items-center gap-2 border-b border-line px-5"><Search className="size-4 text-fg-3" /><Command.Input value={q} onValueChange={setQ} autoFocus placeholder={`Search ${calls.length} calls, reps and actions`} className="h-12 flex-1 bg-transparent text-[15px] outline-none placeholder:text-fg-3 focus-visible:shadow-none" /></div>
        <Command.List className="max-h-[60dvh] overflow-y-auto p-2">
          <Command.Empty className="t-small px-4 py-10 text-center text-fg-2">No matches for &ldquo;{q}&rdquo;. Try a customer name, a rep, or words from the call like &ldquo;mice&rdquo;.</Command.Empty>
          <Command.Group heading="Reps" className={group}>{reps.map((r) => <Command.Item key={r} value={`rep ${r}`} onSelect={() => { onOpenChange(false); emit("rep", r); }} className={item}><Avatar name={r} size={22} /><span className="flex-1">{hl(r)}</span><span className="t-caption text-fg-3">{plural(calls.filter((c) => c.rep === r).length, "call")}</span></Command.Item>)}</Command.Group>
          {recentCalls.length > 0 && <Command.Group heading="Recent" className={group}>{recentCalls.map(row)}</Command.Group>}
          <Command.Group heading="Calls" className={group}>{calls.filter((c) => !recentCalls.includes(c)).map(row)}</Command.Group>
          <Command.Group heading="Pages" className={group}>
            {NAV.map((n) => <Command.Item key={n.href} value={`page ${n.label}`} onSelect={() => go(n.href)} className={item}><n.icon className="size-4 text-fg-3" />{n.label}</Command.Item>)}
          </Command.Group>
          <Command.Group heading="Actions" className={group}>
            <Command.Item value="upload call" onSelect={() => { onOpenChange(false); emit("upload"); }} className={item}><Upload className="size-4 text-fg-3" />Upload a call<span className="ml-auto"><Kbd>U</Kbd></span></Command.Item>
            <Command.Item value="go to reps page" onSelect={() => go("/reps")} className={item}><Users className="size-4 text-fg-3" />Go to Reps</Command.Item>
            <Command.Item value="go to overview page" onSelect={() => go("/")} className={item}><LayoutDashboard className="size-4 text-fg-3" />Go to Overview</Command.Item>
            <Command.Item value="go to to do queue" onSelect={() => go("/#todo")} className={item}><Bell className="size-4 text-fg-3" />Go to the to-do queue</Command.Item>
            <Command.Item value="needs attention calls" onSelect={() => go("/calls?attention=1")} className={item}><Phone className="size-4 text-fg-3" />Calls that need attention</Command.Item>
          </Command.Group>
        </Command.List>
        <div className="t-caption flex gap-4 border-t border-line px-5 py-2.5 text-fg-3"><span><Kbd>↑</Kbd> <Kbd>↓</Kbd> to move</span><span><Kbd>↵</Kbd> to open</span><span><Kbd>esc</Kbd> to close</span></div>
      </Command>
    </Dialog>
  );
}
const group = "[&_[cmdk-group-heading]]:t-th [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-fg-3";
const item = "flex h-11 cursor-pointer items-center gap-3 rounded-sm px-3 text-[14px] data-[selected=true]:bg-brand-soft data-[selected=true]:text-fg";
