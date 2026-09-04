"use client";

import { motion } from "framer-motion";
import { cn, formatSigned } from "@/lib/utils";
import type { DiagnosisMetricDelta } from "@/lib/types";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";

function isGood(d: DiagnosisMetricDelta) {
  const change = d.after - d.before;
  if (d.direction === "up-is-bad") return change <= 0;
  if (d.direction === "down-is-bad") return change >= 0;
  return Math.abs(change) <= Math.max(2, d.before * 0.05);
}

function formatValue(v: number, unit: DiagnosisMetricDelta["unit"]) {
  if (unit === "%") return `${Math.round(v)}%`;
  if (unit === "s") return `${v}s`;
  if (unit === "x") return `${v}×`;
  return `${Math.round(v)}`;
}

export function DeltaRow({ delta, index = 0 }: { delta: DiagnosisMetricDelta; index?: number }) {
  const good = isGood(delta);
  const change = delta.after - delta.before;
  const Icon = change > 0 ? ArrowUp : change < 0 ? ArrowDown : Minus;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4, ease: "easeOut" }}
      className="flex items-center justify-between gap-4 border-b border-line py-3.5 last:border-b-0"
    >
      <span className="text-sm font-medium text-ink-soft">{delta.label}</span>
      <div className="flex items-center gap-3 font-mono text-sm">
        <span className="text-muted">{formatValue(delta.before, delta.unit)}</span>
        <span className="text-muted">→</span>
        <span className="text-ink">{formatValue(delta.after, delta.unit)}</span>
        <span
          className={cn(
            "flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold",
            good ? "bg-teal-soft text-teal-ink" : "bg-rose-soft text-rose-ink",
          )}
        >
          <Icon size={11} strokeWidth={3} />
          {formatSigned(Math.round(change * 10) / 10)}
        </span>
      </div>
    </motion.div>
  );
}
