"use client";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DiagnosisPanel } from "@/components/interview/DiagnosisPanel";
import { ChallengePanel } from "@/components/interview/ChallengePanel";
import type { FailureDiagnosis, ImpromptuAnalysis, ImpromptuConfig, TargetedChallenge } from "@/lib/types";
import {
  Zap,
  Activity,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  TrendingDown,
  Clock,
  Languages,
} from "lucide-react";

export function ImpromptuReportPanel({
  config,
  analysis,
  diagnosis,
  challenge,
  onStartChallenge,
  onDone,
}: {
  config: ImpromptuConfig;
  analysis: ImpromptuAnalysis;
  diagnosis: FailureDiagnosis;
  challenge: TargetedChallenge;
  onStartChallenge: () => void;
  onDone: () => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <Card className="p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="hidden sm:flex items-center gap-2">
              <Badge variant="lavender" size="sm">
                <Zap size={12} />
                Impromptu Diagnostic
              </Badge>
              <Badge variant="outline" size="sm">
                <Clock size={11} /> {config.durationSeconds}s Duration
              </Badge>
              <Badge variant="outline" size="sm">
                {config.language}
              </Badge>
            </div>
            <h1 className="mt-0 font-display text-2xl font-semibold text-ink sm:mt-2 sm:text-3xl">
              &quot;{config.topic.prompt}&quot;
            </h1>
            <p className="mt-1 text-xs text-ink-soft">
              Category: {config.topic.category} · Difficulty: {config.difficulty}
            </p>
          </div>

          <div className="mt-4 sm:mt-0 sm:text-right w-full sm:w-auto border-t border-line pt-4 sm:border-0 sm:pt-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Overall Fluency</p>
            <p className="font-display text-3xl font-bold text-ink sm:text-4xl">
              {analysis.overallScore}
              <span className="text-sm font-normal text-muted">/100</span>
            </p>
          </div>
        </div>

        {/* Fluency Decay Timeline */}
        <div className="mt-6 rounded-2xl border border-line bg-paper p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink">
              <Activity size={13} className="text-lavender-ink" />
              Speaking Pace & Repetition Over Time
            </span>
            <span className="flex items-center gap-1 text-xs text-rose font-medium">
              <TrendingDown size={13} />
              {analysis.initialWpm - analysis.finalWpm} WPM Drop in 2nd half
            </span>
          </div>

          {/* Step Timeline Bars */}
          <div className="flex w-full gap-3 overflow-x-auto pb-4 sm:grid sm:grid-cols-6 sm:gap-2 sm:overflow-visible sm:pb-0">
            {analysis.fluencyTimeline.map((pt, i) => {
              const isDecaying = pt.repetitionCount > 2;
              return (
                <div key={i} className="flex min-w-[64px] flex-col items-center gap-1 sm:min-w-0">
                  <div className="flex h-20 w-full items-end justify-center rounded-lg bg-paper-raised p-1">
                    <div
                      className={`w-full rounded-md transition-all ${
                        isDecaying ? "bg-amber/80" : "bg-teal/80"
                      }`}
                      style={{ height: `${(pt.wpm / 160) * 100}%` }}
                    />
                  </div>
                  <span className="font-mono text-[10px] font-semibold text-ink">{pt.wpm} wpm</span>
                  <span className="text-[10px] text-muted">{pt.second}s</span>
                  {pt.repetitionCount > 0 && (
                    <span className="rounded bg-rose/10 px-1 text-[9px] font-medium text-rose">
                      +{pt.repetitionCount} rep
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex items-center gap-4 text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-teal" /> High Fluency (0-20s)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber" /> Lexical Decay & Hesitation (30s+)
            </span>
          </div>
        </div>
      </Card>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="min-w-0 rounded-2xl border border-line bg-paper-raised p-4">
          <span className="text-xs font-medium text-muted">Initial Pace</span>
          <p className="mt-1 font-display text-2xl font-bold text-teal-ink">{analysis.initialWpm} WPM</p>
          <p className="mt-1 text-[11px] text-ink-soft">Strong opening velocity without hesitation</p>
        </div>

        <div className="min-w-0 rounded-2xl border border-amber/40 bg-paper-raised p-4">
          <span className="text-xs font-medium text-muted">Late Phase Pace</span>
          <p className="mt-1 font-display text-2xl font-bold text-amber-ink">{analysis.finalWpm} WPM</p>
          <p className="mt-1 text-[11px] text-ink-soft">Decay after initial concept exhaust</p>
        </div>

        <div className="min-w-0 rounded-2xl border border-rose/40 bg-paper-raised p-4">
          <span className="text-xs font-medium text-muted">Circular Repetitions</span>
          <p className="mt-1 font-display text-2xl font-bold text-rose">{analysis.repetitionCount} times</p>
          <p className="mt-1 text-[11px] text-ink-soft">Re-stating same point in loops</p>
        </div>

        <div className="min-w-0 rounded-2xl border border-line bg-paper-raised p-4">
          <span className="text-xs font-medium text-muted">Late Fillers</span>
          <p className="mt-1 font-display text-2xl font-bold text-ink">{analysis.fillerCount}</p>
          <p className="mt-1 text-[11px] text-ink-soft">Searching for next words</p>
        </div>

        <div className="min-w-0 rounded-2xl border border-line bg-paper-raised p-4">
          <span className="text-xs font-medium text-muted">Lexical Diversity</span>
          <p className="mt-1 font-display text-2xl font-bold text-ink">{analysis.lexicalDiversity}%</p>
          <p className="mt-1 text-[11px] text-ink-soft">Unique word variety</p>
        </div>

        <div className="min-w-0 rounded-2xl border border-line bg-paper-raised p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Code-Switching</span>
            <Languages size={13} className="text-muted" />
          </div>
          <p className="mt-1 min-w-0 font-display text-lg font-bold text-ink break-words hyphens-auto [overflow-wrap:anywhere] sm:text-2xl">
            {analysis.codeSwitchingDetected ? "Active" : "Monolingual"}
          </p>
          <p className="mt-1 text-[11px] text-ink-soft">
            {analysis.codeSwitchingDetected
              ? "Evaluated smoothly across technical terms without penalization."
              : "Single language stream."}
          </p>
        </div>
      </div>

      {/* Diagnosis Panel */}
      <DiagnosisPanel diagnosis={diagnosis} />

      {/* Targeted Challenge Recommendation */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-lg sm:text-xl text-ink">Recommended 30-Second PEEL Drill</h2>
          <Button size="sm" onClick={onStartChallenge} className="shrink-0">
            Start PEEL Drill
            <ArrowRight size={14} />
          </Button>
        </div>
        <ChallengePanel challenge={challenge} onPractice={onStartChallenge} />
      </div>

      <div className="hidden sm:flex justify-end gap-3 sm:pb-8">
        {/* <Button size="lg" variant="outline" onClick={onDone}>
          Back to Dashboard
        </Button> */}
      </div>
    </div>
  );
}
