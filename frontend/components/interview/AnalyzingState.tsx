"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/** Runs the actual analysis once; the animation indicates waiting, not completed work. */
export function AnalyzingState({ stages, onDone }: { stages: readonly string[]; onDone: () => void | Promise<void> }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const callback = useRef(onDone);
  const started = useRef(false);
  useEffect(() => { callback.current = onDone; });
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled && !started.current) {
        started.current = true;
        void callback.current();
      }
    });
    const timer = setInterval(() => setActiveIndex((i) => (i + 1) % Math.max(1, stages.length)), 1500);
    return () => { cancelled = true; clearInterval(timer); };
  }, [stages.length]);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center justify-center gap-10 py-16 text-center min-h-[50vh] sm:min-h-0">
      <div className="relative flex h-24 w-24 items-center justify-center">
        {/* Expanding rings */}
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute inset-0 rounded-full border-[1.5px] border-lavender-ink"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
              scale: [0.8, 2],
              opacity: [0.6, 0],
            }}
            transition={{
              duration: 2.4,
              repeat: Infinity,
              delay: i * 0.8,
              ease: "easeOut",
            }}
          />
        ))}
        {/* Center core */}
        <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-teal backdrop-blur-sm">
          <motion.div
            className="h-3 w-3 rounded-full bg-[#e3d6f8]"
            animate={{ scale: [0.85, 1.15, 0.85] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </div>

      <div className="flex w-full flex-col gap-2.5">
        {stages.map((stage, i) => {
          const state: "done" | "active" | "pending" = i === activeIndex ? "active" : "pending";
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
                  state === "active" && "border-lavender-ink bg-lavender",
                  state === "pending" && "border-line-strong bg-transparent",
                )}
              >

              </span>
              <span className={cn("font-medium", state === "active" ? "text-ink" : "text-ink-soft")}>{stage}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
