import { cookies } from "next/headers";
import raw from "@/data/calls.json";

// Public demo: calls are fictional fixtures in src/data/calls.json (built by scripts/generate-demo.mts).
// What a visitor changes (assign, done, delete, upload) lives in their own cookie, so visitors never see each other's edits.
export type CallRow = {
  id: string;
  label: string;
  audio_path: string;
  duration_sec: number | null;
  status: "uploaded" | "transcribing" | "analyzing" | "done" | "error";
  error: string | null;
  transcript: import("./ai").Transcript | null;
  analysis: import("./ai").Analysis | null;
  call_type: string | null;
  rep: string | null;
  score: number | null;
  score_max: number | null;
  grade: string | null;
  outcome: string | null;
  reviewed: boolean;
  created_at: string;
  processed_at: string | null;
};

type Fixture = Omit<CallRow, "created_at" | "processed_at"> & { days_ago: number };
type Task = NonNullable<CallRow["analysis"]>["task"];
type Upload = { id: string; label: string; from: string; at: number };
export type Overlay = { del?: string[]; task?: Record<string, Task>; up?: Upload[] };

const FIXTURES = raw as unknown as Fixture[];
const COOKIE = "demo";
const HOUR = 36e5;
// Simulated pipeline timing for uploads, in ms since the upload started.
export const STAGES = { transcribing: 4000, analyzing: 10000 };

export async function readOverlay(): Promise<Overlay> {
  try { return JSON.parse((await cookies()).get(COOKIE)?.value ?? "{}"); } catch { return {}; }
}
export async function writeOverlay(o: Overlay) {
  (await cookies()).set(COOKIE, JSON.stringify(o), { path: "/", httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 30 });
}
export async function resetOverlay() { (await cookies()).delete(COOKIE); }

// Dates are relative to now, so date filters always have data no matter when someone visits.
function dated(f: Fixture, i: number): CallRow {
  const { days_ago, ...c } = f;
  const at = Date.now() - days_ago * 24 * HOUR - ((i * 5) % 8 + 1) * HOUR;
  return { ...c, created_at: new Date(at).toISOString(), processed_at: new Date(at + 90_000).toISOString() };
}

function uploaded(u: Upload, i: number): CallRow | null {
  const src = FIXTURES.find((f) => f.id === u.from);
  if (!src) return null;
  const age = Date.now() - u.at;
  const status = age < STAGES.transcribing ? "transcribing" : age < STAGES.analyzing ? "analyzing" : "done";
  const base = dated({ ...src, days_ago: 0 }, i);
  return {
    ...base, id: u.id, label: u.label, status, created_at: new Date(u.at).toISOString(),
    ...(status !== "done" && { analysis: null, score: null, score_max: null, grade: null, outcome: null, call_type: null, rep: null, processed_at: null }),
  };
}

export async function allCalls(): Promise<CallRow[]> {
  const o = await readOverlay();
  const del = new Set(o.del ?? []);
  const rows = [...FIXTURES.map(dated), ...(o.up ?? []).map(uploaded).filter((r): r is CallRow => !!r)];
  return rows.filter((r) => !del.has(r.id)).map((r) => {
    const task = o.task?.[r.id];
    if (!task || !r.analysis) return r;
    return { ...r, analysis: { ...r.analysis, task }, reviewed: task.done ?? r.reviewed };
  });
}

export async function getCall(id: string) {
  return (await allCalls()).find((c) => c.id === id) ?? null;
}

// Uploads are scored with one of the sample calls, rotating so repeated uploads differ.
export function templateFor(n: number) {
  const scored = FIXTURES.filter((f) => f.analysis && f.call_type !== "not_scorable");
  return scored[n % scored.length].id;
}
