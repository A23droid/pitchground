"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Progress } from "@/components/ui/Progress";
import { Badge } from "@/components/ui/Badge";
import type { AttemptAnalysis } from "@/lib/types";

function MetricRow({ label, value, suffix = "%" }: { label: string; value: number | null; suffix?: string }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="text-ink-soft">{label}</span>
        <span className="font-mono font-semibold text-ink">
          {value === null ? "Not measured" : `${value}${suffix}`}
        </span>
      </div>
      <Progress value={value === null ? 0 : suffix === "%" ? value : Math.min(100, value)} barClassName="bg-lavender-ink" />
    </div>
  );
}

export function AnalysisBreakdown({ analysis, headline }: { analysis: AttemptAnalysis; headline?: string }) {
  const stress = analysis.visual.stressScore;
  const stressVariant = (stress ?? 0) <= 30 ? "teal" : (stress ?? 0) <= 60 ? "amber" : "rose";

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
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Answer Content</p>
              <div className="flex flex-col gap-3">
                <MetricRow label="Correctness" value={analysis.contentAvailable === false ? null : analysis.content.correctness} />
                <MetricRow label="Relevance & Specificity" value={analysis.contentAvailable === false ? null : analysis.content.relevance} />
                <MetricRow label="Topic Key Points" value={analysis.contentAvailable === false ? null : analysis.content.topicUnderstanding} />
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
                <MetricRow label="Logical Structure" value={analysis.structureAvailable === false ? null : analysis.communication.structure} />
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
                <Badge title="Recognized words per minute of the full recording, including pauses" variant={analysis.voice.speakingRateWpm >= 115 && analysis.voice.speakingRateWpm <= 155 ? "teal" : "amber"} size="sm">
                  {analysis.voice.speakingRateWpm} WPM
                </Badge>
              </div>
              <div className="flex flex-col gap-2.5 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-ink-soft">Hesitations & Fillers</span>
                  <span className="font-mono font-semibold text-ink">
                    {analysis.voice.fillerCount ?? "Not measured"} {analysis.voice.fillerRatePercent != null ? `(${analysis.voice.fillerRatePercent}/100)` : ""}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-ink-soft">Pause / Dead Air</span>
                  <span className="font-mono font-semibold text-ink">
                    {analysis.voice.pauseRatioPercent != null ? `${analysis.voice.pauseRatioPercent}%` : `${analysis.voice.pauseCount} pauses`}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-ink-soft">Latency</span>
                  <span className="font-mono font-semibold text-ink">{analysis.voice.responseLatencySeconds === null ? "Not measured" : `${analysis.voice.responseLatencySeconds.toFixed(2)}s`}</span>
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
                  {stress == null ? "Not measured" : `Tension estimate (${stress}%)`}
                </Badge>
              </div>
              <div className="flex flex-col gap-3">
                <MetricRow label="Camera Eye Contact" value={analysis.visualAvailable === false ? null : analysis.visual.eyeContactScore ?? analysis.visual.gaze} />
                <MetricRow label="Posture Stability" value={analysis.visualAvailable === false ? null : analysis.visual.posture} />
                <MetricRow label="Hand Gestures & Energy" value={analysis.visual.handGestureScore ?? null} />
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
                  <span className="font-medium text-ink">{analysis.language.codeSwitchingDetected === null ? "Not measured" : analysis.language.codeSwitchingDetected ? "Detected" : "Not detected"}</span>
                </div>
                <MetricRow label="Target-language share" value={analysis.language.englishArticulation} />
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {analysis.transcript && <Card className="p-5"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Recorded transcript</p><p className="text-sm leading-relaxed text-ink-soft">{analysis.wordTimestamps?.length ? analysis.wordTimestamps.map((word, index, words) => <span key={index}>{index>0 && word.start_sec-words[index-1].end_sec>.05 && <span className="mx-1 font-mono text-xs text-muted">[gap {(word.start_sec-words[index-1].end_sec).toFixed(2)}s]</span>}{word.word}{" "}</span>) : analysis.transcript}</p>
        <p className="mt-3 text-xs text-muted">{analysis.voice.fillerDetectionStatus==="complete" ? "Fillers are estimated from recorded audio and transcript evidence. Word gaps may contain vocal hesitations." : "Audio filler detection is unavailable for this take; transcript matches alone cannot establish a complete count."}</p>
        {!!analysis.voice.fillerEvents?.length && <div className="mt-3 flex flex-wrap gap-2">{analysis.voice.fillerEvents.map((event,index)=><span key={index} className="rounded-lg border border-line bg-paper-raised px-2 py-1 font-mono text-xs text-ink-soft" title={event.confidence==null ? "Transcript evidence" : `Audio model confidence: ${Math.round(event.confidence*100)}%`}>{event.text || "Vocal hesitation"}{event.start_sec!=null && event.end_sec!=null ? ` · ${event.start_sec.toFixed(2)}–${event.end_sec.toFixed(2)}s` : " · transcript"}</span>)}</div>}
      </Card>}
      {analysis.answerFeedback && <Card className="p-5"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Answer review</p><p className="text-sm text-ink-soft">{analysis.answerFeedback}</p>{analysis.referenceAnswer && <details className="mt-3 text-sm text-ink-soft"><summary className="cursor-pointer font-semibold text-ink">Example answer</summary><p className="mt-2">{analysis.referenceAnswer}</p></details>}</Card>}
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
