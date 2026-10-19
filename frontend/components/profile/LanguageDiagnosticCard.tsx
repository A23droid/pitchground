"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Progress";
import type { LearnerProfile } from "@/lib/types";
import { Languages } from "lucide-react";

export function LanguageDiagnosticCard({ comparison }: { comparison: LearnerProfile["languageComparison"] }) {
  const rows: { label: string; value: number }[] = comparison ? [
    ...(comparison.content_score !== null ? [{ label: "Answer key-point coverage", value: comparison.content_score }] : []),
    { label: `${comparison.language} delivery`, value: comparison.comfortable_score },
    { label: "English delivery", value: comparison.english_score },
  ] : [];
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <Card className="p-6">
        <div className="mb-1 flex items-center gap-2">
          <Languages size={16} className="text-teal-ink" />
          <h2 className="font-display text-lg text-ink">Knowledge vs. articulation</h2>
        </div>
        <p className="mb-5 text-[13px] text-ink-soft">
          Compare the same concept in your comfortable language and English.
        </p>

        <div className="flex flex-col gap-4">
          {!comparison && <p className="rounded-xl border border-line bg-paper p-4 text-sm text-muted">Open a language diagnostic session to view your recorded comparison.</p>}
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
            Complete both recordings before drawing conclusions about understanding or language delivery.
          </p>
        </div>
      </Card>
    </motion.div>
  );
}
