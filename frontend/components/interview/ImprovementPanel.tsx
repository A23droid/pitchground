"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { DeltaRow } from "@/components/shared/DeltaRow";
import type { DiagnosisMetricDelta } from "@/lib/types";
import { Sparkles } from "lucide-react";
import Link from "next/link";

export function ImprovementPanel({
  deltas,
  scoreBefore,
  scoreAfter,
  onDone,
}: {
  deltas: DiagnosisMetricDelta[];
  scoreBefore: number;
  scoreAfter: number;
  onDone: () => void;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <Card className="overflow-hidden p-0">
        <div className="border-b border-line bg-teal-soft/70 px-6 py-6 text-center sm:px-8">
          <Badge variant="teal" size="sm" className="mb-3">
            <Sparkles size={12} />
            Same pressure. Different result.
          </Badge>
          <h2 className="font-display text-2xl text-ink sm:text-[1.8rem]">
            You improved under the same pressure condition.
          </h2>
          <div className="mt-5 flex items-center justify-center gap-5">
            <ScorePill label="Before" value={scoreBefore} tone="rose" />
            <span className="font-display text-2xl text-muted">→</span>
            <ScorePill label="After" value={scoreAfter} tone="teal" />
          </div>
        </div>

        <div className="px-6 py-5 sm:px-8">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Before vs after</p>
          <div>
            {deltas.map((d, i) => (
              <DeltaRow key={d.label} delta={d} index={i} />
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" onClick={onDone} className="flex-1">
              Update my profile
            </Button>
            <Link href="/profile" className="flex-1">
              <Button size="lg" variant="outline" className="w-full">
                View learner profile
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

function ScorePill({ label, value, tone }: { label: string; value: number; tone: "rose" | "teal" }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span
        className={
          tone === "teal"
            ? "flex h-16 w-16 items-center justify-center rounded-full bg-teal font-mono text-xl font-bold text-white"
            : "flex h-16 w-16 items-center justify-center rounded-full bg-rose font-mono text-xl font-bold text-white"
        }
      >
        {value}
      </span>
      <span className="text-xs font-medium text-ink-soft">{label}</span>
    </div>
  );
}
