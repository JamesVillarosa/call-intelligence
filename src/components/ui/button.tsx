import { cva, type VariantProps } from "class-variance-authority";
import { LoaderCircle } from "lucide-react";
import { forwardRef } from "react";
import { cn } from "@/lib/cn";

export const buttonStyles = cva(
  "press inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-medium transition-[background-color,border-color,color,box-shadow] duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-brand-600 text-white shadow-xs hover:bg-brand-700",
        secondary: "border border-line bg-card text-fg shadow-xs hover:border-line-strong hover:bg-inset",
        ghost: "text-fg-2 hover:bg-inset hover:text-fg",
        danger: "bg-danger-600 text-white shadow-sm hover:bg-danger-700",
        soft: "bg-brand-soft text-brand-fg hover:bg-brand-100",
      },
      size: { sm: "h-8 rounded-sm px-3 text-[13px]", md: "h-10 rounded-sm px-4 text-[14px]", lg: "h-12 rounded-md px-5 text-[15px]", icon: "size-9 rounded-sm", "icon-sm": "size-8 rounded-sm" },
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
