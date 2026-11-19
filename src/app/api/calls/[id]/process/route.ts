import { NextResponse } from "next/server";
import { getCall, STAGES } from "@/lib/db";

// Demo pipeline: waits out the simulated transcribe and score stages, then reports done.
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const call = await getCall((await params).id);
  if (!call) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const left = call.status === "done" ? 2500 : STAGES.analyzing - (Date.now() - Date.parse(call.created_at)) + 200;
  await new Promise((r) => setTimeout(r, Math.max(0, left)));
  return NextResponse.json({ ok: true });
}
