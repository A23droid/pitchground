"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Progress";
import { DeltaRow } from "@/components/shared/DeltaRow";
import type { FailureDiagnosis } from "@/lib/types";
import { Stethoscope } from "lucide-react";

export function DiagnosisPanel({ diagnosis }: { diagnosis: FailureDiagnosis }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <Card className="overflow-hidden p-0">
        <div className="border-b border-line bg-rose-soft/60 px-6 py-5 sm:px-8">
          <Badge variant="rose" size="sm" className="mb-3">
            <Stethoscope size={12} />
            Diagnosis, not just a score
          </Badge>
          <h2 className="font-display text-2xl leading-snug text-ink sm:text-[1.7rem]">{diagnosis.headline}</h2>
          <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-ink-soft">{diagnosis.explanation}</p>
        </div>
        <div className="px-6 py-5 sm:px-8">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Evidence</p>
          <div>
            {diagnosis.deltas.map((d, i) => (
              <DeltaRow key={d.label} delta={d} index={i} />
            ))}
          </div>

          <div className="mt-5 rounded-xl border border-line bg-paper p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Diagnosis confidence</p>
              <span className="font-mono text-xs font-semibold text-ink">{Math.round(diagnosis.confidence * 100)}%</span>
            </div>
            <Progress value={diagnosis.confidence * 100} barClassName="bg-rose-ink" />
            <p className="mt-2 text-[12px] text-muted">
              Based on {diagnosis.occurrences} prior session{diagnosis.occurrences === 1 ? "" : "s"} showing the same
              pattern — not a one-off read.
            </p>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
