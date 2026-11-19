import { TriangleAlert } from "lucide-react";
import { cn } from "@/lib/cn";
import { WavePulse } from "../logo";

export const Skeleton = ({ className }: { className?: string }) => <span className={cn("skeleton block", className)} aria-hidden />;

export function EmptyState({ title, body, action, className }: { title: string; body?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-14 text-center", className)}>
      <WavePulse size={40} />
      <p className="t-h3 mt-5">{title}</p>
      {body && <p className="t-small mt-1.5 max-w-sm text-fg-2">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = "Something went wrong", body, action }: { title?: string; body?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div role="alert" className="flex flex-col items-center px-6 py-14 text-center">
      <span className="grid size-11 place-items-center rounded-full bg-danger-soft text-danger-fg"><TriangleAlert className="size-5" /></span>
      <p className="t-h3 mt-4">{title}</p>
      {body && <p className="t-small mt-1.5 max-w-sm text-fg-2">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
