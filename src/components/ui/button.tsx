import { cva, type VariantProps } from "class-variance-authority";
import { LoaderCircle } from "lucide-react";
import { forwardRef } from "react";
import { cn } from "@/lib/cn";

export const buttonStyles = cva(
  "press inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-semibold transition-[background-color,border-color,color] duration-150 ease-[var(--ease-out)] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-grad text-white glow hover:brightness-110 transition-[filter,transform]",
        secondary: "border border-line bg-card text-fg shadow-xs hover:border-line-strong hover:bg-inset",
        ghost: "text-fg-2 hover:bg-inset hover:text-fg",
        danger: "border border-transparent bg-danger-600 text-white hover:bg-danger-700",
        soft: "border border-transparent bg-brand-soft text-brand-fg hover:border-brand-line",
      },
      size: { sm: "h-8 rounded-full px-3.5 text-[13px]", md: "h-10 rounded-full px-5 text-[14px]", lg: "h-12 rounded-full px-6 text-[15px]", icon: "size-9 rounded-full", "icon-sm": "size-8 rounded-full" },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonStyles> & { loading?: boolean };
export const Button = forwardRef<HTMLButtonElement, Props>(({ className, variant, size, loading, children, disabled, ...p }, ref) => (
  <button ref={ref} className={cn(buttonStyles({ variant, size }), className)} disabled={disabled || loading} aria-busy={loading || undefined} {...p}>
    {loading && <LoaderCircle className="animate-spin" />}
    {children}
  </button>
));
Button.displayName = "Button";

export const IconButton = forwardRef<HTMLButtonElement, Props & { label: string }>(({ label, size = "icon", variant = "ghost", ...p }, ref) => (
  <Button ref={ref} size={size} variant={variant} aria-label={label} title={label} {...p} />
));
IconButton.displayName = "IconButton";
