"use client";

import { motion } from "framer-motion";

const segment =
  "Definition → Reason → Example  ·  structure 51% → 74%  ·  same pressure, different result  ·  ";

export function FlowRibbon() {
  const content = segment.repeat(4);
  return (
    <div className="pointer-events-none absolute inset-x-[-10%] bottom-[8%] -rotate-[3.5deg] overflow-hidden">
      <div className="flex bg-teal py-4 shadow-soft-lg">
        <motion.div
          className="flex shrink-0 whitespace-nowrap"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 26, ease: "linear", repeat: Infinity }}
        >
          <span className="px-3 font-display text-2xl italic text-white/95 sm:text-3xl">{content}</span>
          <span className="px-3 font-display text-2xl italic text-white/95 sm:text-3xl" aria-hidden="true">
            {content}
          </span>
        </motion.div>
      </div>
    </div>
  );
}
