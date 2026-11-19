"use client";
import { X } from "lucide-react";
import { Dialog as D, DropdownMenu as M, Popover as P, Tooltip as T } from "radix-ui";
import { cn } from "@/lib/cn";

const pop = "z-50 rounded-md border border-line bg-elevated shadow-lg outline-none data-[state=open]:animate-[rise_160ms_var(--ease-out)] origin-[var(--radix-popper-transform-origin)]";

export function Tooltip({ content, children, side = "top" }: { content: React.ReactNode; children: React.ReactNode; side?: "top" | "bottom" | "left" | "right" }) {
  return (
    <T.Provider delayDuration={200} skipDelayDuration={300}>
      <T.Root>
        <T.Trigger asChild>{children}</T.Trigger>
        <T.Portal>
          <T.Content side={side} sideOffset={6} className="z-50 max-w-xs rounded-sm bg-n-900 px-2.5 py-1.5 text-[12px] leading-4 text-white shadow-lg data-[state=delayed-open]:animate-[rise_140ms_var(--ease-out)]">
            {content}<T.Arrow className="fill-n-900" />
          </T.Content>
        </T.Portal>
      </T.Root>
    </T.Provider>
  );
}

export function Popover({ trigger, children, align = "start", className }: { trigger: React.ReactNode; children: React.ReactNode; align?: "start" | "center" | "end"; className?: string }) {
  return (
    <P.Root>
      <P.Trigger asChild>{trigger}</P.Trigger>
      <P.Portal><P.Content align={align} sideOffset={6} className={cn(pop, "p-3", className)}>{children}</P.Content></P.Portal>
    </P.Root>
  );
}

export type MenuItem = { label: string; icon?: React.ReactNode; onSelect: () => void; danger?: boolean; shortcut?: string } | "separator";
export function Menu({ trigger, items, align = "end", label }: { trigger: React.ReactNode; items: MenuItem[]; align?: "start" | "end"; label?: string }) {
  return (
    <M.Root>
      <M.Trigger asChild>{trigger}</M.Trigger>
      <M.Portal>
        <M.Content align={align} sideOffset={6} className={cn(pop, "min-w-48 p-1")} aria-label={label}>
          {items.map((it, i) => it === "separator" ? <M.Separator key={i} className="my-1 h-px bg-line" /> : (
            <M.Item key={it.label} onSelect={it.onSelect} className={cn("flex h-9 cursor-pointer select-none items-center gap-2.5 rounded-sm px-2.5 text-[14px] outline-none data-[highlighted]:bg-inset [&_svg]:size-4 [&_svg]:text-fg-3", it.danger ? "text-danger-fg" : "text-fg")}>
              {it.icon}<span className="flex-1">{it.label}</span>{it.shortcut && <span className="t-caption text-fg-3">{it.shortcut}</span>}
            </M.Item>
          ))}
        </M.Content>
      </M.Portal>
    </M.Root>
  );
}

export function Dialog({ open, onOpenChange, title, description, children, footer, wide }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; description?: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean }) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-40 bg-n-950/40 backdrop-blur-[2px] data-[state=open]:animate-[fade_200ms_ease]" />
        <D.Content className={cn("fixed left-1/2 top-1/2 z-50 max-h-[90dvh] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-line bg-elevated shadow-lg outline-none data-[state=open]:animate-[dialog_240ms_var(--ease-out)]", wide ? "max-w-2xl" : "max-w-lg")}>
          <div className="flex items-start gap-3 px-6 pt-6">
            <div className="min-w-0 flex-1">
              <D.Title className="t-h3">{title}</D.Title>
              {description ? <D.Description className="t-small mt-1 text-fg-2">{description}</D.Description> : <D.Description className="sr-only">{title}</D.Description>}
            </div>
            <D.Close className="press -mr-2 -mt-1 grid size-9 place-items-center rounded-sm text-fg-3 hover:bg-inset hover:text-fg" aria-label="Close"><X className="size-4" /></D.Close>
          </div>
          <div className="px-6 py-5">{children}</div>
          {footer && <div className="flex justify-end gap-2 border-t border-line px-6 py-4">{footer}</div>}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}

export function Sheet({ open, onOpenChange, title, children, side = "right" }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; children: React.ReactNode; side?: "left" | "right" }) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-40 bg-n-950/40 data-[state=open]:animate-[fade_200ms_ease]" />
        <D.Content className={cn("fixed inset-y-0 z-50 flex w-[min(480px,100vw)] flex-col border-line bg-elevated shadow-lg outline-none", side === "right" ? "right-0 border-l data-[state=open]:animate-[sheet-r_280ms_var(--ease-out)]" : "left-0 w-[min(300px,85vw)] border-r data-[state=open]:animate-[sheet-l_280ms_var(--ease-out)]")}>
          <D.Title className="sr-only">{title}</D.Title>
          <D.Description className="sr-only">{title}</D.Description>
          {children}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
export const SheetClose = D.Close;
