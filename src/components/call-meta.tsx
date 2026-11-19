import { CalendarClock, CircleDashed, CreditCard, MessageCircle, TrendingUp, UserX, Wrench } from "lucide-react";
import { outcomeLabel, typeLabel } from "@/lib/format";
import { Badge, StatusDot, type Tone } from "./ui";

// Type chips are neutral: color is reserved for meaning (outcome, score).
const TYPE: Record<string, { icon: typeof Wrench }> = {
  sales: { icon: TrendingUp }, retention: { icon: UserX }, reservice: { icon: Wrench },
  scheduling: { icon: CalendarClock }, billing: { icon: CreditCard }, general: { icon: MessageCircle }, not_scorable: { icon: CircleDashed },
};
export function TypeChip({ type, size = "md" }: { type?: string | null; size?: "sm" | "md" }) {
  if (!type) return <span className="t-small text-fg-3">Processing</span>;
  const t = TYPE[type] ?? TYPE.general, I = t.icon;
  return <Badge size={size} icon={<I />}>{typeLabel(type)}</Badge>;
}

export const OUTCOME_TONES: Record<string, Tone> = { booked: "success", saved: "success", resolved: "success", quoted: "warning", unresolved: "warning", lost: "danger", cancelled: "danger", no_conversation: "neutral" };
export function Outcome({ outcome }: { outcome?: string | null }) {
  if (!outcome) return <span className="t-small text-fg-3">None</span>;
  return <span className="t-small inline-flex items-center gap-2 whitespace-nowrap"><StatusDot tone={OUTCOME_TONES[outcome] ?? "neutral"} />{outcomeLabel(outcome)}</span>;
}
