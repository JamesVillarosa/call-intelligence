import { cn } from "@/lib/cn";

export function Card({ className, interactive, as: C = "section", ...p }: React.HTMLAttributes<HTMLElement> & { interactive?: boolean; as?: "section" | "div" | "article" }) {
  return <C className={cn("surface rounded-xl", interactive && "lift cursor-pointer", className)} {...p} />;
}
export function CardHeader({ title, sub, action, icon, className }: { title: React.ReactNode; sub?: React.ReactNode; action?: React.ReactNode; icon?: React.ReactNode; className?: string }) {
  return (
    <header className={cn("flex items-start gap-3 px-5 pt-5 sm:px-6", className)}>
      {icon && <span className="grid size-9 shrink-0 place-items-center rounded-sm bg-brand-soft text-brand-fg [&_svg]:size-[18px]">{icon}</span>}
      <div className="min-w-0 flex-1">
        <h2 className="t-h3">{title}</h2>
        {sub && <p className="t-small mt-0.5 text-fg-2">{sub}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </header>
  );
}
export const CardBody = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => <div className={cn("px-5 py-5 sm:px-6", className)} {...p} />;
export const CardFooter = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => <div className={cn("flex items-center gap-2 border-t border-line px-5 py-3 sm:px-6", className)} {...p} />;
