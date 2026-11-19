import { NextResponse } from "next/server";
import { getCall, readOverlay, writeOverlay } from "@/lib/db";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const call = await getCall((await params).id);
  if (!call) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { id, status, error, label, score, score_max, grade } = call;
  return NextResponse.json({ id, status, error, label, score, score_max, grade });
}

// Task flow: assign to a person or the office, then mark done. Saved in the visitor's demo cookie.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const assignee = typeof body.assignee === "string" ? body.assignee.slice(0, 60) : null;
  const done = typeof body.done === "boolean" ? body.done : null;
  if (assignee === null && done === null) return NextResponse.json({ error: "Send assignee or done" }, { status: 400 });
  const call = await getCall(id);
  if (!call?.analysis) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const task = { ...call.analysis.task, ...(assignee !== null && { assignee, assigned_at: new Date().toISOString() }), ...(done !== null && { done }) };
  const o = await readOverlay();
  await writeOverlay({ ...o, task: { ...o.task, [id]: task } });
  return NextResponse.json({ task });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await getCall(id))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const o = await readOverlay();
  const { [id]: _t, ...task } = o.task ?? {};
  await writeOverlay({ ...o, task, del: [...(o.del ?? []), id], up: o.up?.filter((u) => u.id !== id) });
  return NextResponse.json({ ok: true });
}
