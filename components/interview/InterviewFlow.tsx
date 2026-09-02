"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { StageProgress, type LoopStep } from "@/components/interview/StageProgress";
import { RecordingPanel } from "@/components/interview/RecordingPanel";
import { AnalyzingState } from "@/components/interview/AnalyzingState";
import { AnalysisBreakdown } from "@/components/interview/AnalysisBreakdown";
import { DiagnosisPanel } from "@/components/interview/DiagnosisPanel";
import { ChallengePanel } from "@/components/interview/ChallengePanel";
import { ReplayPanel } from "@/components/interview/ReplayPanel";
import { ImprovementPanel } from "@/components/interview/ImprovementPanel";

import { buildBaselineQuestion, buildPressureQuestion } from "@/mock/questions";
import { analyzeAttempt, ANALYSIS_STAGES, diagnose, DIAGNOSIS_STAGES, compareImprovement } from "@/services/analysisService";
import { requestChallenge, requestReplay } from "@/services/challengeService";
import { saveCompletedSession } from "@/services/learnerService";

import type {
  Audience,
  AttemptAnalysis,
  Difficulty,
  DiagnosisMetricDelta,
  FailureDiagnosis,
  Language,
  ReplayConditions,
  RoundQuestion,
  ScenarioConfig,
  TargetedChallenge,
} from "@/lib/types";
import { ArrowRight, Mic, Video } from "lucide-react";

type Stage =
  | "intro"
  | "baseline-question"
  | "baseline-analyzing"
  | "baseline-result"
  | "pressure-intro"
  | "pressure-question"
  | "pressure-analyzing"
  | "pressure-result"
  | "diagnosing"
  | "diagnosis"
  | "challenge"
  | "replay-intro"
  | "replay-question"
  | "retry-analyzing"
  | "improvement"
  | "done";

const stageToStep: Record<Stage, LoopStep> = {
  intro: "Speak",
  "baseline-question": "Speak",
  "baseline-analyzing": "Analyze",
  "baseline-result": "Analyze",
  "pressure-intro": "Speak",
  "pressure-question": "Speak",
  "pressure-analyzing": "Analyze",
  "pressure-result": "Analyze",
  diagnosing: "Diagnose",
  diagnosis: "Diagnose",
  challenge: "Challenge",
  "replay-intro": "Challenge",
  "replay-question": "Retry",
  "retry-analyzing": "Retry",
  improvement: "Measure",
  done: "Measure",
};

export function InterviewFlow() {
  const router = useRouter();
  const params = useSearchParams();

  const config: ScenarioConfig = {
    interviewType: "Technical Interview",
    topic: params.get("topic") || "Database Systems",
    audience: (params.get("audience") as Audience) || "Technical interviewer",
    language: (params.get("language") as Language) || "English",
    difficulty: (params.get("difficulty") as Difficulty) || "Standard",
  };

  const [stage, setStage] = useState<Stage>("intro");
  const [baselineAnalysis, setBaselineAnalysis] = useState<AttemptAnalysis | null>(null);
  const [pressureAnalysis, setPressureAnalysis] = useState<AttemptAnalysis | null>(null);
  const [retryAnalysis, setRetryAnalysis] = useState<AttemptAnalysis | null>(null);
  const [diagnosisResult, setDiagnosisResult] = useState<FailureDiagnosis | null>(null);
  const [challenge, setChallenge] = useState<TargetedChallenge | null>(null);
  const [replayConditions, setReplayConditions] = useState<ReplayConditions | null>(null);
  const [replayQuestion, setReplayQuestion] = useState<RoundQuestion | null>(null);
  const [improvementDeltas, setImprovementDeltas] = useState<DiagnosisMetricDelta[] | null>(null);

  const baselineQuestion = buildBaselineQuestion(config.topic);
  const pressureQuestion = buildPressureQuestion(config.topic);

  async function handleBaselineSubmit() {
    setStage("baseline-analyzing");
  }
  async function onBaselineAnalyzed() {
    const result = await analyzeAttempt("baseline");
    setBaselineAnalysis(result);
    setStage("baseline-result");
  }

  async function onPressureAnalyzed() {
    const result = await analyzeAttempt("pressure");
    setPressureAnalysis(result);
    setStage("pressure-result");
  }

  async function onDiagnosed() {
    if (!baselineAnalysis || !pressureAnalysis) return;
    const [d, c] = await Promise.all([diagnose(baselineAnalysis, pressureAnalysis), requestChallenge(config)]);
    setDiagnosisResult(d);
    setChallenge(c);
    setStage("diagnosis");
  }

  async function startReplay() {
    const { conditions, question } = await requestReplay(config);
    setReplayConditions(conditions);
    setReplayQuestion(question);
    setStage("replay-intro");
  }

  async function onRetryAnalyzed() {
    const result = await analyzeAttempt("retry");
    setRetryAnalysis(result);
    if (pressureAnalysis) {
      const deltas = await compareImprovement(pressureAnalysis, result);
      setImprovementDeltas(deltas);
    }
    setStage("improvement");
  }

  function finishSession() {
    if (pressureAnalysis && retryAnalysis) {
      saveCompletedSession({
        topic: config.topic,
        overallScoreBefore: pressureAnalysis.overallScore,
        overallScoreAfter: retryAnalysis.overallScore,
        structureBefore: pressureAnalysis.communication.structure,
        structureAfter: retryAnalysis.communication.structure,
      });
    }
    setStage("done");
  }

  return (
    <>
      <div className="mx-auto mt-6 w-full max-w-4xl px-4 sm:mt-8 sm:px-6">
        {/* Row 1: back link + config summary */}
        <div className="mb-3 flex items-center gap-2 overflow-hidden">
          <Link
            href="/start"
            className="shrink-0 text-xs font-medium text-muted transition-colors hover:text-ink"
          >
            ← Setup
          </Link>
          <span className="text-muted/40">·</span>
          <p className="truncate text-xs font-medium text-muted">
            {config.topic} · {config.audience} · {config.language} · {config.difficulty}
          </p>
        </div>

        {/* Row 2: stage progress — scrollable on mobile */}
        <div className="mb-5 overflow-x-auto">
          <StageProgress current={stageToStep[stage]} />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={stage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            {stage === "intro" && <IntroCard config={config} onStart={() => setStage("baseline-question")} />}

            {stage === "baseline-question" && (
              <RecordingPanel
                question={baselineQuestion}
                language={config.language}
                onSubmit={handleBaselineSubmit}
              />
            )}

            {stage === "baseline-analyzing" && <AnalyzingState stages={ANALYSIS_STAGES} onDone={onBaselineAnalyzed} />}

            {stage === "baseline-result" && baselineAnalysis && (
              <ResultStep
                title="Baseline round complete"
                note="Strong, unhurried performance. Now Pitchground introduces pressure."
                analysis={baselineAnalysis}
                ctaLabel="Introduce pressure round"
                onNext={() => setStage("pressure-intro")}
              />
            )}

            {stage === "pressure-intro" && (
              <PressureIntroCard onStart={() => setStage("pressure-question")} />
            )}

            {stage === "pressure-question" && (
              <RecordingPanel
                question={pressureQuestion}
                language={config.language}
                onSubmit={() => setStage("pressure-analyzing")}
              />
            )}

            {stage === "pressure-analyzing" && <AnalyzingState stages={ANALYSIS_STAGES} onDone={onPressureAnalyzed} />}

            {stage === "pressure-result" && pressureAnalysis && (
              <ResultStep
                title="Pressure round complete"
                note="Let's see what changed compared to your baseline."
                analysis={pressureAnalysis}
                ctaLabel="See diagnosis"
                onNext={() => setStage("diagnosing")}
              />
            )}

            {stage === "diagnosing" && <AnalyzingState stages={DIAGNOSIS_STAGES} onDone={onDiagnosed} />}

            {stage === "diagnosis" && diagnosisResult && (
              <div className="flex flex-col gap-5">
                <DiagnosisPanel diagnosis={diagnosisResult} />
                <div className="flex justify-end">
                  <Button size="lg" onClick={() => setStage("challenge")}>
                    See targeted challenge
                    <ArrowRight size={16} />
                  </Button>
                </div>
              </div>
            )}

            {stage === "challenge" && challenge && (
              <ChallengePanel challenge={challenge} onPractice={startReplay} />
            )}

            {stage === "replay-intro" && replayConditions && (
              <ReplayPanel conditions={replayConditions} onReplay={() => setStage("replay-question")} />
            )}

            {stage === "replay-question" && replayQuestion && (
              <RecordingPanel
                question={replayQuestion}
                language={config.language}
                onSubmit={() => setStage("retry-analyzing")}
              />
            )}

            {stage === "retry-analyzing" && <AnalyzingState stages={ANALYSIS_STAGES} onDone={onRetryAnalyzed} />}

            {stage === "improvement" && pressureAnalysis && retryAnalysis && improvementDeltas && (
              <ImprovementPanel
                deltas={improvementDeltas}
                scoreBefore={pressureAnalysis.overallScore}
                scoreAfter={retryAnalysis.overallScore}
                onDone={finishSession}
              />
            )}

            {stage === "done" && <DoneCard onDashboard={() => router.push("/dashboard")} onProfile={() => router.push("/profile")} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  );
}

function IntroCard({ config, onStart }: { config: ScenarioConfig; onStart: () => void }) {
  return (
    <Card className="p-8 text-center sm:p-12">
      <Badge variant="dark" size="sm" className="mx-auto mb-4">
        {config.interviewType}
      </Badge>
      <h1 className="font-display text-3xl text-ink sm:text-4xl">Ready when you are.</h1>
      <p className="mx-auto mt-3 max-w-md text-[15px] text-ink-soft">
        A baseline question first, no timer. Pitchground will introduce pressure once it has a read on your natural
        pace.
      </p>
      <div className="mx-auto mt-6 flex max-w-xs items-center justify-center gap-6 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <Video size={13} /> Camera optional
        </span>
        <span className="flex items-center gap-1.5">
          <Mic size={13} /> Mic optional
        </span>
      </div>
      <Button size="lg" className="mt-7" onClick={onStart}>
        Begin baseline question
        <ArrowRight size={16} />
      </Button>
    </Card>
  );
}

function PressureIntroCard({ onStart }: { onStart: () => void }) {
  return (
    <Card className="border-amber/60 bg-amber-soft/40 p-8 text-center sm:p-12">
      <Badge variant="amber" size="sm" className="mx-auto mb-4">
        Pressure condition
      </Badge>
      <h2 className="font-display text-3xl text-ink">20-second time limit</h2>
      <p className="mx-auto mt-3 max-w-md text-[15px] text-ink-soft">
        Same topic, tighter clock. This is where Pitchground looks for the gap between what you know and how you say
        it.
      </p>
      <Button size="lg" className="mt-7" onClick={onStart}>
        Start pressure round
        <ArrowRight size={16} />
      </Button>
    </Card>
  );
}

function ResultStep({
  title,
  note,
  analysis,
  ctaLabel,
  onNext,
}: {
  title: string;
  note: string;
  analysis: AttemptAnalysis;
  ctaLabel: string;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-display text-2xl text-ink">{title}</h2>
        <p className="mt-1 text-sm text-ink-soft">{note}</p>
      </div>
      <AnalysisBreakdown analysis={analysis} />
      <div className="flex justify-end">
        <Button size="lg" onClick={onNext}>
          {ctaLabel}
          <ArrowRight size={16} />
        </Button>
      </div>
    </div>
  );
}

function DoneCard({ onDashboard, onProfile }: { onDashboard: () => void; onProfile: () => void }) {
  return (
    <Card className="p-8 text-center sm:p-12">
      <Badge variant="teal" size="sm" className="mx-auto mb-4">
        Profile updated
      </Badge>
      <h2 className="font-display text-3xl text-ink">Session saved.</h2>
      <p className="mx-auto mt-3 max-w-md text-[15px] text-ink-soft">
        Pitchground added this session to your history and adjusted your recommended next challenge accordingly.
      </p>
      <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
        <Button size="lg" onClick={onDashboard}>
          Back to dashboard
        </Button>
        <Button size="lg" variant="outline" onClick={onProfile}>
          View learner profile
        </Button>
      </div>
    </Card>
  );
}
