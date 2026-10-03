import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { forwardRef } from "react";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-all duration-200 ease-out disabled:opacity-40 disabled:pointer-events-none active:scale-[0.97]",
  {
    variants: {
      variant: {
        primary:
          "bg-lavender text-lavender-ink hover:bg-lavender-strong shadow-soft hover:shadow-soft-lg hover:-translate-y-0.5",
        dark: "bg-teal text-white hover:bg-teal-ink shadow-soft hover:shadow-soft-lg hover:-translate-y-0.5",
        outline:
          "border border-line-strong bg-transparent text-ink hover:bg-paper-raised hover:border-ink/30",
        ghost: "bg-transparent text-ink-soft hover:bg-black/[0.04] hover:text-ink",
        subtle: "bg-black/[0.04] text-ink hover:bg-black/[0.07]",
      },
      size: {
        sm: "h-9 px-4 text-sm",
        md: "h-11 px-5 text-[15px]",
        lg: "h-14 px-7 text-base",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, ...props }, ref) => {
  return <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
});
Button.displayName = "Button";

export { Button, buttonVariants };
