"use client";

import { motion } from "framer-motion";

/**
 * The product's signature visual: a spoken line that starts jagged and
 * unstructured, then resolves into a clean three-beat shape as it crosses
 * the midpoint, literally drawing "rambling becomes structure," which is
 * Pitchground's entire thesis. Used on the dashboard hero and loading
 * states so the same idea recurs across the product.
 */
export function FlowSignature({ className, animate = true }: { className?: string; animate?: boolean }) {
  const chaosPath =
    "M0,100 C10,70 18,130 28,95 C36,68 44,140 54,100 C64,60 74,150 86,105 C96,72 108,135 120,98 C132,66 146,142 160,102 C172,74 184,128 198,100 C208,82 216,118 226,100";

  const structuredPath = "M226,100 L300,100 L300,55 L410,55 L410,145 L520,145 L520,100 L600,100";

  const fullPath = `${chaosPath} L300,100 L300,55 L410,55 L410,145 L520,145 L520,100 L600,100`;

  return (
    <svg
      viewBox="0 0 600 200"
      fill="none"
      className={className}
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="flow-grad" x1="0" y1="0" x2="600" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="var(--rose)" />
          <stop offset="38%" stopColor="var(--amber)" />
          <stop offset="60%" stopColor="var(--lavender-ink)" />
          <stop offset="100%" stopColor="var(--teal)" />
        </linearGradient>
      </defs>

      <motion.path
        d={fullPath}
        stroke="url(#flow-grad)"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={animate ? { pathLength: 0, opacity: 0 } : undefined}
        animate={animate ? { pathLength: 1, opacity: 1 } : undefined}
        transition={{ duration: 2.2, ease: [0.65, 0, 0.35, 1] }}
      />

      {/* Landing markers for Definition / Reason / Example */}
      {[
        { x: 300, y: 55 },
        { x: 410, y: 145 },
        { x: 520, y: 100 },
      ].map((p, i) => (
        <motion.circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={5}
          fill="var(--paper-raised)"
          stroke="var(--teal)"
          strokeWidth={2.5}
          initial={animate ? { scale: 0, opacity: 0 } : undefined}
          animate={animate ? { scale: 1, opacity: 1 } : undefined}
          transition={{ delay: 1.4 + i * 0.22, duration: 0.4, ease: "backOut" }}
        />
      ))}
    </svg>
  );
}
