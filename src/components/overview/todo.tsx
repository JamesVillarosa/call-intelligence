"use client";
import { BellOff, Check, Copy, Ellipsis, ExternalLink, HeartHandshake, MessageSquareQuote, PhoneIncoming, RotateCcw, Sparkles, UserX } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useLocal } from "@/lib/use-local";
import { toast } from "sonner";
import type { Attention } from "@/lib/insights";
import { cn } from "@/lib/cn";
import { money } from "@/lib/format";
import { Avatar, Badge, Button, Dialog, IconButton, Menu, Tabs, type Tone } from "../ui";

const KIND: Record<Attention["kind"], { label: string; tone: Tone; chip: string; icon: typeof Check }> = {
  cancel: { label: "Win back", tone: "danger", chip: "text-danger-fg", icon: UserX },
  complaint: { label: "At risk", tone: "warning", chip: "text-warning-fg", icon: HeartHandshake },
  callback: { label: "Call back", tone: "info", chip: "text-info-fg", icon: PhoneIncoming },
  coach: { label: "Coach", tone: "brand", chip: "text-fg-2", icon: Sparkles },
};
type Item = Attention & { done?: boolean };
const SNOOZE = "snoozed-todos";

async function patch(id: string, body: object) {
  const r = await fetch(`/api/calls/${id}`, { method: "PATCH", body: JSON.stringify(body) });
  if (!r.ok) throw new Error();
}

export function TodoQueue({ open, closed }: { open: Attention[]; closed: Attention[] }) {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([...open, ...closed.map((c) => ({ ...c, done: true }))]);
  const [tab, setTab] = useState<"today" | "week" | "done">("today");
  const [all, setAll] = useState(false);
  const [leaving, setLeaving] = useState<string | null>(null);
  const [draft, setDraft] = useState<Item | null>(null);
  const [snoozed, setSnoozed] = useLocal<Record<string, number>>(SNOOZE, {});
  const [now] = useState(() => Date.now());
  const key = (a: Item) => a.id + a.kind;
  const isSnoozed = (a: Item) => (snoozed[key(a)] ?? 0) > now;

  const groups = useMemo(() => ({
    today: items.filter((a) => !a.done && a.urgent && !isSnoozed(a)),
    week: items.filter((a) => !a.done && (!a.urgent || isSnoozed(a))),
    done: items.filter((a) => a.done),
  }), [items, snoozed]); // eslint-disable-line react-hooks/exhaustive-deps
  const list = groups[tab];
  const openRevenue = items.filter((a) => !a.done).reduce((n, a) => n + (a.kind === "coach" ? 0 : a.value), 0);

  const update = (a: Item, p: Partial<Item>) => setItems((l) => l.map((x) => (key(x) === key(a) ? { ...x, ...p } : x)));
  async function assign(a: Item, who: string) {
    update(a, { assignee: who });
    try { await patch(a.id, { assignee: who }); toast.success(`Assigned to ${who}`); router.refresh(); }
    catch { update(a, { assignee: a.assignee }); toast.error("Couldn't assign. Try again."); }
  }
  async function setDone(a: Item, done: boolean) {
    if (done) { setLeaving(key(a)); await new Promise((r) => setTimeout(r, 420)); }
    update(a, { done }); setLeaving(null);
    try {
      await patch(a.id, { done });
      if (done) toast.success("Marked done", { action: { label: "Undo", onClick: () => setDone({ ...a, done: true }, false) } });
      else toast("Moved back to your queue");
      router.refresh();
    } catch { update(a, { done: !done }); toast.error("Couldn't save. Try again."); }
  }
  function snooze(a: Item) {
    const next = { ...snoozed, [key(a)]: now + 864e5 };
    setSnoozed(next);
    toast("Snoozed until tomorrow", { action: { label: "Undo", onClick: () => { const n = { ...next }; delete n[key(a)]; setSnoozed(n); } } });
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 px-5 sm:px-6">
        <Tabs label="To-do groups" value={tab} onChange={setTab} items={[{ value: "today", label: "Today", count: groups.today.length }, { value: "week", label: "This week", count: groups.week.length }, { value: "done", label: "Done", count: groups.done.length }]} className="border-0" />
        {openRevenue > 0 && <p className="t-small pb-3 text-fg-2"><span className="num font-semibold text-fg">{money(openRevenue)}</span>/yr open</p>}
      </div>
      <ul className="border-t border-line">
        {list.length === 0 && <li className="t-small px-6 py-12 text-center text-fg-2">{tab === "done" ? "Nothing completed yet. Finished items land here." : tab === "today" ? "Nothing due today. Check This week." : "All caught up."}</li>}
        {(all ? list : list.slice(0, 5)).map((a, i) => {
          const k = KIND[a.kind], Icon = k.icon, gone = leaving === key(a);
          const primary = a.done ? <Button size="sm" onClick={() => setDone(a, false)}><RotateCcw />Reopen</Button>
            : !a.assignee ? <Button size="sm" onClick={() => assign(a, a.rep ?? "Office")}>Assign to {a.rep ?? "Office"}</Button>
            : a.message ? <Button size="sm" variant="soft" onClick={() => setDraft(a)}><MessageSquareQuote />Draft text</Button>
            : <Button size="sm" onClick={() => setDone(a, true)}><Check />Mark done</Button>;
          return (
            <li key={key(a)} className="fold rise border-b border-line last:border-0" data-gone={gone} style={{ ["--i" as string]: i }}>
              <div>
                <div className={cn("relative flex flex-col gap-3 py-4 pl-5 pr-4 transition-colors hover:bg-inset/60 sm:flex-row sm:items-center sm:pr-5", a.done && "opacity-70")}>
                  <span className={cn("hidden size-9 shrink-0 place-items-center rounded-sm sm:grid", gone ? "pop bg-success-500 text-white" : k.chip)}>
                    {gone ? <Check className="size-4" strokeWidth={3} /> : <Icon className="size-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge tone={k.tone} size="sm">{k.label}</Badge>
                      {!a.done && <span className={cn("t-caption", a.urgent ? "font-semibold text-danger-fg" : "text-fg-3")}>{a.urgent ? "Due today" : "This week"}</span>}
                      {a.value > 0 && a.kind !== "coach" && <Badge size="sm"><span className="num">{money(a.value)}/yr</span></Badge>}
                      {isSnoozed(a) && <Badge size="sm" icon={<BellOff />}>Snoozed</Badge>}
                    </div>
                    <Link href={`/calls/${a.id}`} className="t-label mt-1.5 block text-[15px] hover:text-brand-fg">{a.title}</Link>
                    <p className="t-small mt-0.5 line-clamp-2 text-fg-2">{a.detail}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 sm:ml-2">
                    {a.assignee && <span className="t-caption flex items-center gap-1.5 text-fg-2" title={`Assigned to ${a.assignee}`}><Avatar name={a.assignee} size={22} /><span className="hidden xl:inline">{a.assignee}</span></span>}
                    {primary}
                    <Menu label="More actions" trigger={<IconButton label="More actions" size="icon-sm"><Ellipsis /></IconButton>} items={[
                      { label: "Open call", icon: <ExternalLink />, onSelect: () => router.push(`/calls/${a.id}`) },
                      ...(a.message ? [{ label: "Draft text", icon: <MessageSquareQuote />, onSelect: () => setDraft(a) }] : []),
                      { label: a.assignee === "Office" ? `Reassign to ${a.rep ?? "rep"}` : "Reassign to Office", icon: <RotateCcw />, onSelect: () => assign(a, a.assignee === "Office" && a.rep ? a.rep : "Office") },
                      ...(!a.done ? [{ label: "Snooze until tomorrow", icon: <BellOff />, onSelect: () => snooze(a) }, { label: "Mark done", icon: <Check />, onSelect: () => setDone(a, true) }] : []),
                    ]} />
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {list.length > 5 && <button onClick={() => setAll(!all)} className="t-label w-full border-t border-line py-3 text-brand-fg hover:bg-inset">{all ? "Show fewer" : `Show all ${list.length}`}</button>}
      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)} title="Follow-up text" description="Written from what the customer said on the call. Edit before sending."
        footer={<><Button onClick={() => setDraft(null)}>Close</Button><Button variant="primary" onClick={async () => { await navigator.clipboard.writeText(draft!.message!); toast.success("Copied. Paste it into your texting tool."); }}><Copy />Copy text</Button></>}>
        <p className="t-body whitespace-pre-wrap rounded-md bg-inset p-4">{draft?.message}</p>
      </Dialog>
    </div>
  );
}
