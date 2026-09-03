"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const steps = ["Observe", "Compare", "Diagnose", "Remember", "Target", "Recreate", "Retry", "Measure", "Learn"];

export function LoopStepper() {
  return (
    <div className="relative w-full -mx-4 sm:mx-0 px-4 sm:px-0">
      <div className="flex w-full overflow-x-auto pb-6 sm:pb-0 hide-scrollbar snap-x snap-mandatory sm:flex-wrap items-center justify-start sm:justify-center gap-3 sm:gap-2">
        {steps.map((step, i) => (
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ delay: i * 0.06, duration: 0.4 }}
            className="flex items-center gap-3 sm:gap-2 shrink-0 snap-center"
          >
            <span
              className={
                i === 0 || i === steps.length - 1
                  ? "rounded-full bg-teal px-5 sm:px-4 py-2 text-[15px] sm:text-sm font-semibold text-white shadow-sm"
                  : "rounded-full border border-line-strong bg-paper-raised px-5 sm:px-4 py-2 text-[15px] sm:text-sm font-medium text-ink shadow-sm"
              }
            >
              {step}
            </span>
            {i < steps.length - 1 && <ArrowRight size={16} className="text-muted/60" />}
          </motion.div>
        ))}
      </div>
      
      {/* Mobile fade out edges indicator */}
      <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-paper to-transparent sm:hidden" />
      <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-paper to-transparent sm:hidden" />
    </div>
  );
}
