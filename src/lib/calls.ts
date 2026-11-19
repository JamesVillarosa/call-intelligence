import { cache } from "react";
import { allCalls, type CallRow } from "./db";

// Every column except the transcript, so lists, the shell and rep views stay light.
export type CallLite = Omit<CallRow, "transcript" | "audio_path">;

// AI-written text sometimes uses long dashes; the product's copy style doesn't.
export function tidy<T>(v: T): T {
  if (typeof v === "string") return v.replace(/\s*[\u2014\u2013]\s*/g, ", ") as T;
  if (Array.isArray(v)) return v.map(tidy) as T;
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, tidy(x)])) as T;
  return v;
}

// cache(): the layout and the page share one query per request.
export const listCalls = cache(async (): Promise<CallLite[]> => {
  const data = (await allCalls()).sort((a, b) => a.label.localeCompare(b.label)).map(({ transcript: _t, audio_path: _a, ...c }) => c);
  return ((data ?? []) as CallLite[]).map((c) => ({ ...c, analysis: tidy(c.analysis) }));
});
