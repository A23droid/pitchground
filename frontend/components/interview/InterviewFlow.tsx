"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { StageProgress, type LoopStep } from "@/components/interview/StageProgress";
import { RecordingPanel } from "@/components/interview/RecordingPanel";
import { AnalyzingState } from "@/components/interview/AnalyzingState";
import { AnalysisBreakdown } from "@/components/interview/AnalysisBreakdown";
import { DiagnosisPanel } from "@/components/interview/DiagnosisPanel";
import { ChallengePanel } from "@/components/interview/ChallengePanel";
import { ReplayPanel } from "@/components/interview/ReplayPanel";
import { ImprovementPanel } from "@/components/interview/ImprovementPanel";

import { buildBaselineQuestion, buildPressureQuestion } from "@/mock/questions";
import { mockTranscripts } from "@/mock/transcripts";
import { analyzeAttempt, ANALYSIS_STAGES, diagnose, DIAGNOSIS_STAGES, compareImprovement } from "@/services/analysisService";
import { requestChallenge, requestReplay } from "@/services/challengeService";
import { saveCompletedSession } from "@/services/learnerService";
import { topics, audiences, languages, difficulties } from "@/mock/scenarios";

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
  | "setup"
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

const stageToStep: Record<Stage, LoopStep | null> = {
  setup: null,
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

  // Config state: filled in the setup screen
  const [topic, setTopic] = useState(topics[0]);
  const [audience, setAudience] = useState<Audience>("Technical interviewer");
  const [language, setLanguage] = useState<Language>("English");
  const [difficulty, setDifficulty] = useState<Difficulty>("Standard");

  const config: ScenarioConfig = {
    interviewType: "Technical Interview",
    topic,
    audience,
    language,
    difficulty,
  };

  const [stage, setStage] = useState<Stage>("setup");
  const [baselineAnalysis, setBaselineAnalysis] = useState<AttemptAnalysis | null>(null);
  const [pressureAnalysis, setPressureAnalysis] = useState<AttemptAnalysis | null>(null);
  const [retryAnalysis, setRetryAnalysis]  = useState<AttemptAnalysis | null>(null);
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
        {/* Badge: hidden on setup screen */}
        {stageToStep[stage] && (
          <div className="mb-5">
            <Badge variant="dark" size="sm">
              <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-teal" />
              {stageToStep[stage]}
            </Badge>
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={stage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            {stage === "setup" && (
              <SetupCard
                topic={topic} setTopic={setTopic}
                audience={audience} setAudience={setAudience}
                language={language} setLanguage={setLanguage}
                difficulty={difficulty} setDifficulty={setDifficulty}
                onBegin={() => setStage("intro")}
              />
            )}

            {stage === "intro" && <IntroCard config={config} onStart={() => setStage("baseline-question")} />}

            {stage === "baseline-question" && (
              <RecordingPanel
                question={baselineQuestion}
                transcript={mockTranscripts.baseline}
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
                transcript={mockTranscripts.pressure}
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
                transcript={mockTranscripts.retry}
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

function SetupCard({
  topic, setTopic,
  audience, setAudience,
  language, setLanguage,
  difficulty, setDifficulty,
  onBegin,
}: {
  topic: string; setTopic: (v: string) => void;
  audience: Audience; setAudience: (v: Audience) => void;
  language: Language; setLanguage: (v: Language) => void;
  difficulty: Difficulty; setDifficulty: (v: Difficulty) => void;
  onBegin: () => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl tracking-tight text-ink sm:text-4xl">Set up your interview</h1>
        <p className="mt-2 text-[15px] text-ink-soft">
          Pitchground will start with a baseline question, then introduce a pressure round to find where your communication breaks down.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Topic</h2>
          <Select
            options={topics.map((t) => ({ label: t, value: t }))}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
        </div>
        <div>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Audience</h2>
          <Select
            options={audiences.map((a) => ({ label: a.value, value: a.value }))}
            value={audience}
            onChange={(e) => setAudience(e.target.value as Audience)}
          />
        </div>
        <div>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Language</h2>
          <Select
            options={languages.map((l) => ({ label: l.value, value: l.value }))}
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
          />
        </div>
        <div>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Difficulty</h2>
          <Select
            options={difficulties.map((d) => ({ label: d.value, value: d.value }))}
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Difficulty)}
          />
          <p className="mt-1.5 text-xs text-muted">
            {difficulties.find((d) => d.value === difficulty)?.description}
          </p>
        </div>
      </div>

      <div className="sticky bottom-6">
        <Card className="flex items-center justify-between gap-4 p-4 pl-5 shadow-soft-lg">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{topic}</p>
            <p className="truncate text-xs text-ink-soft">{audience} · {language} · {difficulty}</p>
          </div>
          <Button size="lg" onClick={onBegin} className="shrink-0">
            Begin interview
            <ArrowRight size={16} />
          </Button>
        </Card>
      </div>
    </div>
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
