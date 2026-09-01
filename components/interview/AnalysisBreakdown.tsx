"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Progress } from "@/components/ui/Progress";
import { Badge } from "@/components/ui/Badge";
import type { AttemptAnalysis } from "@/lib/types";

function MetricRow({ label, value, suffix = "%" }: { label: string; value: number; suffix?: string }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="text-ink-soft">{label}</span>
        <span className="font-mono font-semibold text-ink">
          {value}
          {suffix}
        </span>
      </div>
      <Progress value={suffix === "%" ? value : Math.min(100, value)} barClassName="bg-lavender-ink" />
    </div>
  );
}

const groups = ["content", "communication", "voice", "visual", "language"] as const;

export function AnalysisBreakdown({ analysis, headline }: { analysis: AttemptAnalysis; headline?: string }) {
  return (
    <div className="flex flex-col gap-5">
      {headline && (
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl text-ink">{headline}</h3>
          <Badge variant={analysis.overallScore >= 75 ? "teal" : analysis.overallScore >= 55 ? "amber" : "rose"} size="md">
            Overall {analysis.overallScore}
          </Badge>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Content</p>
            <div className="flex flex-col gap-3">
              <MetricRow label="Correctness" value={analysis.content.correctness} />
              <MetricRow label="Relevance" value={analysis.content.relevance} />
              <MetricRow label="Topic understanding" value={analysis.content.topicUnderstanding} />
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Communication</p>
            <div className="flex flex-col gap-3">
              <MetricRow label="Structure" value={analysis.communication.structure} />
              <MetricRow label="Clarity" value={analysis.communication.clarity} />
              <MetricRow label="Coherence" value={analysis.communication.coherence} />
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Voice</p>
            <div className="flex flex-col gap-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-soft">Speaking rate</span>
                <span className="font-mono font-semibold text-ink">{analysis.voice.speakingRateWpm} wpm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">Fillers</span>
                <span className="font-mono font-semibold text-ink">{analysis.voice.fillerCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">Response latency</span>
                <span className="font-mono font-semibold text-ink">{analysis.voice.responseLatencySeconds}s</span>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Language</p>
            <div className="flex flex-col gap-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-soft">Primary language</span>
                <span className="font-medium text-ink">{analysis.language.primaryLanguage}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">Code-switching</span>
                <span className="font-medium text-ink">{analysis.language.codeSwitchingDetected ? "Detected" : "None"}</span>
              </div>
              <MetricRow label="English articulation" value={analysis.language.englishArticulation} />
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
