"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const STEPS = ["Speak", "Analyze", "Diagnose", "Challenge", "Retry", "Measure"] as const;
export type LoopStep = (typeof STEPS)[number];

export function StageProgress({ current }: { current: LoopStep }) {
  const currentIndex = STEPS.indexOf(current);
  return (
    <div className="flex items-center gap-1.5">
      {STEPS.map((step, i) => {
        const state = i < currentIndex ? "done" : i === currentIndex ? "active" : "pending";
        return (
          <div key={step} className="flex shrink-0 items-center gap-1.5">
            <div
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-300",
                state === "active" && "bg-teal text-white",
                state === "done" && "bg-teal-soft text-teal-ink",
                state === "pending" && "bg-black/[0.04] text-muted",
              )}
            >
              {state === "active" && (
                <motion.span
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-white"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.4, repeat: Infinity }}
                />
              )}
              {step}
            </div>
            {i < STEPS.length - 1 && <span className="h-px w-3 shrink-0 bg-line-strong" />}
          </div>
        );
      })}
    </div>
  );
}
