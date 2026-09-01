"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Progress";
import { Languages } from "lucide-react";

const rows = [
  { label: "Concept understanding", value: 92 },
  { label: "Malayalam communication", value: 88 },
  { label: "English articulation", value: 61 },
];

export function LanguageDiagnosticCard() {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <Card className="p-6">
        <div className="mb-1 flex items-center gap-2">
          <Languages size={16} className="text-teal-ink" />
          <h2 className="font-display text-lg text-ink">Knowledge vs. articulation</h2>
        </div>
        <p className="mb-5 text-[13px] text-ink-soft">
          Same concept, explained comfortably in Malayalam, then again in English — isolating what's actually
          holding you back.
        </p>

        <div className="flex flex-col gap-4">
          {rows.map((r) => (
            <div key={r.label}>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="text-ink-soft">{r.label}</span>
                <span className="font-mono font-semibold text-ink">{r.value}%</span>
              </div>
              <Progress value={r.value} barClassName={r.value < 70 ? "bg-amber" : "bg-teal"} />
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-xl border border-line bg-paper p-4">
          <Badge variant="lavender" size="sm" className="mb-2">
            Recommendation
          </Badge>
          <p className="text-sm text-ink-soft">
            Practice explaining technical concepts in professional English — the gap isn&apos;t understanding, it&apos;s
            target-language delivery. Code-switching in earlier attempts was treated as a legitimate signal, not a
            penalty.
          </p>
        </div>
      </Card>
    </motion.div>
  );
}
