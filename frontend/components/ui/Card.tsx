import { cn } from "@/lib/utils";
import { HTMLAttributes, forwardRef } from "react";

const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-2xl border border-line bg-paper-raised shadow-soft transition-shadow duration-300",
      className,
    )}
    {...props}
  />
));
Card.displayName = "Card";

export { Card };
