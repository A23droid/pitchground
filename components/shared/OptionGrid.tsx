"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export function OptionGrid<T extends string>({
  options,
  value,
  onChange,
  columns = 2,
}: {
  options: { value: T; label: string; description?: string }[];
  value: T;
  onChange: (v: T) => void;
  columns?: 1 | 2 | 3;
}) {
  const colClass = columns === 3 ? "sm:grid-cols-3" : columns === 2 ? "sm:grid-cols-2" : "";
  return (
    <div className={cn("grid grid-cols-1 gap-2.5", colClass)}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <motion.button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "rounded-xl border px-4 py-3 text-left transition-all duration-200",
              active
                ? "border-lavender-ink/40 bg-lavender shadow-soft"
                : "border-line bg-paper-raised hover:border-line-strong hover:bg-black/[0.02]",
            )}
          >
            <p className={cn("text-sm font-semibold", active ? "text-lavender-ink" : "text-ink")}>{opt.label}</p>
            {opt.description && (
              <p className={cn("mt-0.5 text-xs leading-relaxed", active ? "text-lavender-ink/80" : "text-ink-soft")}>
                {opt.description}
              </p>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

export function ChipGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = opt === value;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200",
              active
                ? "border-teal bg-teal text-white shadow-soft"
                : "border-line bg-paper-raised text-ink-soft hover:border-line-strong hover:text-ink",
            )}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
