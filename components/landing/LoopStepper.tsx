"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const steps = ["Observe", "Compare", "Diagnose", "Remember", "Target", "Recreate", "Retry", "Measure", "Learn"];

export function LoopStepper() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {steps.map((step, i) => (
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ delay: i * 0.06, duration: 0.4 }}
          className="flex items-center gap-2"
        >
          <span
            className={
              i === 0 || i === steps.length - 1
                ? "rounded-full bg-teal px-4 py-2 text-sm font-semibold text-white"
                : "rounded-full border border-line-strong bg-paper-raised px-4 py-2 text-sm font-medium text-ink"
            }
          >
            {step}
          </span>
          {i < steps.length - 1 && <ArrowRight size={14} className="text-muted" />}
        </motion.div>
      ))}
    </div>
  );
}
