import { NextResponse } from "next/server";
import { getCall } from "@/lib/db";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const call = await getCall((await params).id);
  return call ? NextResponse.redirect(new URL(`/audio/${call.audio_path}`, req.url)) : NextResponse.json({ error: "Not found" }, { status: 404 });
}
