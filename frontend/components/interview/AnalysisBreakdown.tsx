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

export function AnalysisBreakdown({ analysis, headline }: { analysis: AttemptAnalysis; headline?: string }) {
  const stress = analysis.visual.stressScore ?? 25;
  const stressVariant = stress <= 30 ? "teal" : stress <= 60 ? "amber" : "rose";
  const stressLabel = stress <= 30 ? "Low Stress" : stress <= 60 ? "Moderate Tension" : "High Stress";

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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* 1. Content Card */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-5 h-full flex flex-col justify-between">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Technical Content</p>
              <div className="flex flex-col gap-3">
                <MetricRow label="Correctness" value={analysis.content.correctness} />
                <MetricRow label="Relevance & Specificity" value={analysis.content.relevance} />
                <MetricRow label="Topic Key Points" value={analysis.content.topicUnderstanding} />
              </div>
            </div>
          </Card>
        </motion.div>

        {/* 2. Communication Card */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="p-5 h-full flex flex-col justify-between">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Delivery & Structure</p>
              <div className="flex flex-col gap-3">
                <MetricRow label="Logical Structure" value={analysis.communication.structure} />
                <MetricRow label="Clarity" value={analysis.communication.clarity} />
                <MetricRow label="Fluency" value={analysis.communication.fluency} />
              </div>
            </div>
          </Card>
        </motion.div>

        {/* 3. Voice & Fillers Card */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="p-5 h-full flex flex-col justify-between">
            <div>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Voice & Fillers</p>
                <Badge variant={analysis.voice.speakingRateWpm >= 115 && analysis.voice.speakingRateWpm <= 155 ? "teal" : "amber"} size="sm">
                  {analysis.voice.speakingRateWpm} WPM
                </Badge>
              </div>
              <div className="flex flex-col gap-2.5 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-ink-soft">Hesitations & Fillers</span>
                  <span className="font-mono font-semibold text-ink">
                    {analysis.voice.fillerCount} {analysis.voice.fillerRatePercent !== undefined ? `(${analysis.voice.fillerRatePercent}%)` : ""}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-ink-soft">Pause / Dead Air</span>
                  <span className="font-mono font-semibold text-ink">
                    {analysis.voice.pauseRatioPercent !== undefined ? `${analysis.voice.pauseRatioPercent}%` : `${analysis.voice.pauseCount} pauses`}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-ink-soft">Latency</span>
                  <span className="font-mono font-semibold text-ink">{analysis.voice.responseLatencySeconds}s</span>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* 4. Computer Vision & Stress Card */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="p-5 h-full flex flex-col justify-between">
            <div>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Camera & Stress</p>
                <Badge variant={stressVariant} size="sm">
                  {stressLabel} ({stress}%)
                </Badge>
              </div>
              <div className="flex flex-col gap-3">
                <MetricRow label="Camera Eye Contact" value={analysis.visual.eyeContactScore ?? analysis.visual.gaze} />
                <MetricRow label="Posture Stability" value={analysis.visual.posture} />
                <MetricRow label="Hand Gestures & Energy" value={analysis.visual.handGestureScore ?? analysis.visual.engagement} />
              </div>
            </div>
          </Card>
        </motion.div>

        {/* 5. Language Card */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="p-5 h-full flex flex-col justify-between">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Language Stability</p>
              <div className="flex flex-col gap-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-ink-soft">Primary language</span>
                  <span className="font-medium text-ink">{analysis.language.primaryLanguage}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-soft">Code-switching</span>
                  <span className="font-medium text-ink">{analysis.language.codeSwitchingDetected ? "Detected" : "Stable"}</span>
                </div>
                <MetricRow label="Articulation" value={analysis.language.englishArticulation} />
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* 6. Actionable Improvements & Coaching Tips */}
      {analysis.improvements && analysis.improvements.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className="p-5 border-l-4 border-l-lavender-ink bg-lavender-paper/30">
            <div className="mb-3 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-lavender-ink animate-pulse" />
              <p className="text-xs font-bold uppercase tracking-wider text-ink">Actionable Improvement Coaching</p>
            </div>
            <ul className="space-y-2 text-sm text-ink-soft">
              {analysis.improvements.map((tip, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <span className="font-mono text-xs font-bold text-lavender-ink mt-0.5">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
