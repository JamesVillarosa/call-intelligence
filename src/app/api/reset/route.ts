import { NextResponse } from "next/server";
import { resetOverlay } from "@/lib/db";

export async function POST() {
  await resetOverlay();
  return NextResponse.json({ ok: true });
}
