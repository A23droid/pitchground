"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { ReplayConditions } from "@/lib/types";
import { RotateCcw, History } from "lucide-react";

export function ReplayPanel({ conditions, onReplay }: { conditions: ReplayConditions; onReplay: () => void }) {
  const rows: [string, string][] = [
    ["Topic", conditions.topic],
    ["Audience", conditions.audience],
    ["Language", conditions.language],
    ["Time limit", `${conditions.timeLimitSeconds} seconds`],
    ["Pressure", conditions.pressure === "time-limit" ? "Time constraint" : conditions.pressure],
    ["Weakness", conditions.weakness],
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <Card className="p-6 sm:p-8">
        <Badge variant="outline" size="sm" className="mb-3">
          <History size={12} />
          Failure replay
        </Badge>
        <h2 className="font-display text-2xl text-ink">Same conditions. One more attempt.</h2>
        <p className="mt-2 max-w-xl text-[14px] text-ink-soft">
          Pitchground reconstructs the exact pressure that broke your structure last time, with a comparable — not
          identical — question.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 rounded-xl border border-line bg-paper p-4 sm:grid-cols-3">
          {rows.map(([label, value]) => (
            <div key={label}>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
              <p className="mt-0.5 text-sm font-medium text-ink">{value}</p>
            </div>
          ))}
        </div>

        <Button size="lg" className="mt-6" onClick={onReplay}>
          <RotateCcw size={16} />
          Replay challenge
        </Button>
      </Card>
    </motion.div>
  );
}
