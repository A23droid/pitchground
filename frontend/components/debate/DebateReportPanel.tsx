"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DiagnosisPanel } from "@/components/interview/DiagnosisPanel";
import { ChallengePanel } from "@/components/interview/ChallengePanel";
import type { DebateAnalysis, DebateConfig, FailureDiagnosis, TargetedChallenge } from "@/lib/types";
import {
  Swords,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  ArrowRight,
  Languages,
  CheckCircle2,
} from "lucide-react";

export function DebateReportPanel({
  config,
  analysis,
  diagnosis,
  challenge,
  onStartChallenge,
  onDone,
}: {
  config: DebateConfig;
  analysis: DebateAnalysis;
  diagnosis: FailureDiagnosis;
  challenge: TargetedChallenge;
  onStartChallenge: () => void;
  onDone: () => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      {/* Header card */}
      <Card className="overflow-hidden p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="lavender" size="sm">
                <Swords size={12} />
                Debate Arena Report
              </Badge>
              <Badge variant="outline" size="sm">
                {config.language}
              </Badge>
            </div>
            <h1 className="mt-2 font-display text-2xl font-semibold text-ink sm:text-3xl">
              {config.topic.title}
            </h1>
            <p className="mt-1 text-xs text-ink-soft">
              Position: <span className="font-semibold text-ink">{config.position}</span> · Difficulty:{" "}
              {config.difficulty}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Overall Debate</p>
              <p className="font-display text-3xl font-bold text-ink sm:text-4xl">
                {analysis.overallScore}
                <span className="text-sm font-normal text-muted">/100</span>
              </p>
            </div>
          </div>
        </div>

        {/* Opening vs Rebuttal Comparative Banner */}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-teal/30 bg-teal-soft/30 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-teal-ink">
                Round 1: Opening Argument
              </span>
              <span className="font-display text-xl font-bold text-teal-ink">{analysis.openingScore}%</span>
            </div>
            <p className="mt-1 text-xs text-ink-soft">
              Structured premise with clear rationale and confident delivery.
            </p>
          </div>

          <div className="rounded-xl border border-amber/40 bg-amber-soft/40 p-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-amber-ink">
                Round 2: Rebuttal & Defense
                <TrendingDown size={14} className="text-amber" />
              </span>
              <span className="font-display text-xl font-bold text-amber-ink">{analysis.rebuttalScore}%</span>
            </div>
            <p className="mt-1 text-xs text-ink-soft">
              Direct premise refutation degraded by {analysis.openingScore - analysis.rebuttalScore} points under counter-pressure.
            </p>
          </div>
        </div>

        {/* Key Observation Note */}
        <div className="mt-4 rounded-xl border border-line bg-paper p-4">
          <div className="flex items-start gap-2.5">
            <Sparkles size={16} className="mt-0.5 shrink-0 text-lavender-ink" />
            <div>
              <p className="text-xs font-semibold text-ink">Communication Diagnosis</p>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">{analysis.keyObservation}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Multimodal Score Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <MetricCard label="Argumentation" score={analysis.argumentation} desc="Thesis backing & clarity" />
        <MetricCard label="Rebuttal Precision" score={analysis.rebuttal} desc="Addressing opponent premise" alert />
        <MetricCard label="Pressure Composure" score={analysis.pressureHandling} desc="Hesitation & pause latency" alert />
        <MetricCard label="Communication Tone" score={analysis.communication} desc="Conviction & articulation" />
        <MetricCard label={`${config.language} Fluency`} score={analysis.languageFidelity} desc="Vocabulary depth & grammar" />
        <div className="rounded-2xl border border-line bg-paper-raised p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Code-Switching</span>
            <Languages size={14} className="text-muted" />
          </div>
          <p className="mt-1 font-display text-2xl font-bold text-ink">{analysis.codeSwitchingRatio}%</p>
          <p className="mt-1 text-[11px] text-ink-soft">
            {analysis.codeSwitchingRatio > 0
              ? "Natural technical mixing detected; evaluated without English penalty."
              : "Pure monolingual delivery."}
          </p>
        </div>
      </div>

      {/* Failure Diagnosis */}
      <DiagnosisPanel diagnosis={diagnosis} />

      {/* Targeted Challenge Recommendation */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl text-ink">Recommended Targeted Rebuttal Drill</h2>
          <Button size="sm" onClick={onStartChallenge}>
            Start Rebuttal Drill
            <ArrowRight size={14} />
          </Button>
        </div>
        <ChallengePanel challenge={challenge} onPractice={onStartChallenge} />
      </div>

      {/* <div className="flex justify-end gap-3 pb-8">
        <Button size="lg" variant="outline" onClick={onDone}>
          Back to Dashboard
        </Button>
      </div> */}
    </div>
  );
}

function MetricCard({
  label,
  score,
  desc,
  alert = false,
}: {
  label: string;
  score: number;
  desc: string;
  alert?: boolean;
}) {
  return (
    <div className={`rounded-2xl border bg-paper-raised p-4 ${alert ? "border-amber/50" : "border-line"}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted">{label}</span>
        {alert && <ShieldAlert size={13} className="text-amber" />}
      </div>
      <p className={`mt-1 font-display text-2xl font-bold ${alert ? "text-amber-ink" : "text-ink"}`}>{score}%</p>
      <p className="mt-1 text-[11px] text-ink-soft">{desc}</p>
    </div>
  );
}
