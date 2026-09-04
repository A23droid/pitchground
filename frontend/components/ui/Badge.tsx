import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

const badgeVariants = cva("inline-flex items-center gap-1.5 rounded-full font-medium", {
  variants: {
    variant: {
      dark: "bg-teal text-white",
      lavender: "bg-lavender text-lavender-ink",
      amber: "bg-amber-soft text-amber-ink",
      rose: "bg-rose-soft text-rose-ink",
      teal: "bg-teal-soft text-teal-ink",
      outline: "border border-line-strong text-ink-soft",
    },
    size: {
      sm: "text-xs px-2.5 py-1",
      md: "text-sm px-3.5 py-1.5",
    },
  },
  defaultVariants: { variant: "dark", size: "md" },
});

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}
