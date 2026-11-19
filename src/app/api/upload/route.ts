import { NextResponse } from "next/server";
import { readOverlay, templateFor, writeOverlay } from "@/lib/db";

// Demo upload: the file never leaves the browser. The call is scored with a sample recording.
export async function POST(req: Request) {
  const { name } = await req.json().catch(() => ({}));
  if (typeof name !== "string" || !/\.(mp3|wav|m4a|ogg|webm|mp4|aac|flac)$/i.test(name)) {
    return NextResponse.json({ error: "Upload an audio file (mp3, wav, m4a, ogg, webm)." }, { status: 400 });
  }
  const o = await readOverlay();
  const up = o.up ?? [];
  if (up.length >= 10) return NextResponse.json({ error: "The demo keeps up to 10 uploads. Reset the demo from your profile menu to start over." }, { status: 400 });
  const id = crypto.randomUUID();
  const label = name.replace(/\.[^.]+$/, "").slice(0, 60);
  await writeOverlay({ ...o, up: [...up, { id, label, from: templateFor(up.length), at: Date.now() }] });
  return NextResponse.json({ id });
}
