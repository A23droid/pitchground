"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Walks through a list of processing stages one at a time so the mock
 * pipeline reads as real AI work rather than a static spinner. Each stage
 * gets ~700-900ms; onDone fires once the last stage completes.
 */
export function AnalyzingState({ stages, onDone }: { stages: readonly string[]; onDone: () => void }) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (activeIndex >= stages.length) {
      const t = setTimeout(onDone, 500);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setActiveIndex((i) => i + 1), 750);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex]);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-8 py-16 text-center">
      <div className="relative flex h-16 w-16 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-lavender opacity-40" />
        <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-lavender">
          <Loader2 className="h-6 w-6 animate-spin text-lavender-ink" strokeWidth={2.2} />
        </span>
      </div>

      <div className="flex w-full flex-col gap-2.5">
        {stages.map((stage, i) => {
          const state = i < activeIndex ? "done" : i === activeIndex ? "active" : "pending";
          return (
            <motion.div
              key={stage}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: state === "pending" ? 0.35 : 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="flex items-center justify-center gap-2.5 text-sm"
            >
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full border transition-colors",
                  state === "done" && "border-teal bg-teal text-white",
                  state === "active" && "border-lavender-ink bg-lavender",
                  state === "pending" && "border-line-strong bg-transparent",
                )}
              >
                <AnimatePresence mode="wait">
                  {state === "done" && (
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}>
                      <Check size={11} strokeWidth={3} />
                    </motion.span>
                  )}
                </AnimatePresence>
              </span>
              <span className={cn("font-medium", state === "active" ? "text-ink" : "text-ink-soft")}>{stage}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
