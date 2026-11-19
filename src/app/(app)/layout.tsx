import { AppShell } from "@/components/shell/app-shell";
import { listCalls } from "@/lib/calls";
import type { CallRow } from "@/lib/db";
import { insights } from "@/lib/insights";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const calls = await listCalls();
  const created = new Map(calls.map((c) => [c.id, c.created_at]));
  const todo = insights(calls as CallRow[]).attention.map((a) => ({ id: a.id, title: a.title, kind: a.kind, rep: a.rep, value: a.kind === "coach" ? 0 : a.value, urgent: a.urgent, created: created.get(a.id) ?? "" }));
  return <AppShell calls={calls} todo={todo}>{children}</AppShell>;
}
