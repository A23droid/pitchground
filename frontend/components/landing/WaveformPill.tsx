"use client";

import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

const bars = [6, 14, 22, 12, 18, 9, 16, 24, 11, 7];

export function WaveformPill() {
  return (
    <div className="flex flex-col items-center gap-3">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.6, duration: 0.4 }}
        className="flex items-center gap-1.5 rounded-full bg-teal px-4 py-2 text-sm font-medium text-white shadow-soft"
      >
        <CheckCircle2 size={14} />
        Structure recovered
      </motion.div>

      <div className="flex h-14 w-40 items-center justify-center gap-[3px] rounded-full border border-line bg-paper-raised px-5 shadow-soft">
        {bars.map((h, i) => (
          <motion.span
            key={i}
            className="w-[3px] rounded-full bg-lavender-ink"
            style={{ height: h }}
            animate={{ scaleY: [0.4, 1, 0.4] }}
            transition={{ duration: 1 + (i % 3) * 0.2, repeat: Infinity, ease: "easeInOut", delay: i * 0.06 }}
          />
        ))}
      </div>
    </div>
  );
}
