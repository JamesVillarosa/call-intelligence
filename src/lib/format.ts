import { CALL_TYPES, OUTCOMES } from "./framework";

export const mmss = (s?: number | null) => (s == null ? "—" : `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`);
export const typeLabel = (t?: string | null) => (t ? CALL_TYPES[t as keyof typeof CALL_TYPES]?.label ?? t : "Processing");
export const outcomeLabel = (o?: string | null) => (o ? OUTCOMES[o as keyof typeof OUTCOMES] ?? o : "—");
export const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);
export const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

export const OUTCOME_TONE: Record<string, "good" | "warn" | "bad" | "muted"> = {
  booked: "good", saved: "good", resolved: "good",
  quoted: "warn", unresolved: "warn",
  lost: "bad", cancelled: "bad",
  no_conversation: "muted",
};

// Pipeline status as people read it. "uploaded" means waiting in the queue.
export const STATUS_LABEL: Record<string, string> = { uploaded: "Queued", transcribing: "Transcribing", analyzing: "Classifying and scoring", done: "Done", error: "Failed" };
