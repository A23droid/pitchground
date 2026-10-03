"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export function Progress({
  value,
  className,
  trackClassName,
  barClassName,
}: {
  value: number;
  className?: string;
  trackClassName?: string;
  barClassName?: string;
}) {
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-black/[0.06]", trackClassName, className)}>
      <motion.div
        className={cn("h-full rounded-full bg-lavender-ink", barClassName)}
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}
