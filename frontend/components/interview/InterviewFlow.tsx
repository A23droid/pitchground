"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import type { LoopStep } from "@/components/interview/StageProgress";
import { RecordingPanel, type RecordingSubmitPayload } from "@/components/interview/RecordingPanel";
import { AnalyzingState } from "@/components/interview/AnalyzingState";
import { AnalysisBreakdown } from "@/components/interview/AnalysisBreakdown";
import { DiagnosisPanel } from "@/components/interview/DiagnosisPanel";
import { ChallengePanel } from "@/components/interview/ChallengePanel";
import { ReplayPanel } from "@/components/interview/ReplayPanel";
import { ImprovementPanel } from "@/components/interview/ImprovementPanel";

import { ANALYSIS_STAGES, DIAGNOSIS_STAGES, analyzeInterviewAttempt, fetchSessionComparison, fetchSessionDiagnosis } from "@/services/analysisService";
import { fetchSessionChallenge, replayFromSession } from "@/services/challengeService";
import { saveCompletedSession } from "@/services/learnerService";
import {
  advanceSession,
  createAttempt,
  createSession,
  getSession,
  questionFromAction,
  waitForPhase,
} from "@/services/sessionService";
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
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [flowError, setFlowError] = useState<string | null>(null);
  const [baselineQuestion, setBaselineQuestion] = useState<RoundQuestion | null>(null);
  const [pressureQuestion, setPressureQuestion] = useState<RoundQuestion | null>(null);
  const [baselineAnalysis, setBaselineAnalysis] = useState<AttemptAnalysis | null>(null);
  const [pressureAnalysis, setPressureAnalysis] = useState<AttemptAnalysis | null>(null);
  const [retryAnalysis, setRetryAnalysis] = useState<AttemptAnalysis | null>(null);
  const [diagnosisResult, setDiagnosisResult] = useState<FailureDiagnosis | null>(null);
  const [challenge, setChallenge] = useState<TargetedChallenge | null>(null);
  const [replayConditions, setReplayConditions] = useState<ReplayConditions | null>(null);
  const [replayQuestion, setReplayQuestion] = useState<RoundQuestion | null>(null);
  const [improvementDeltas, setImprovementDeltas] = useState<DiagnosisMetricDelta[] | null>(null);
  const [pendingMedia, setPendingMedia] = useState<RecordingSubmitPayload | null>(null);
  const [pendingRole, setPendingRole] = useState<"baseline" | "pressure" | "retry" | null>(null);

  async function beginInterview() {
    setFlowError(null);
    try {
      const session = await createSession(config);
      setSessionId(session.id);
      const prompted = await advanceSession(session.id, "created");
      setBaselineQuestion(questionFromAction(prompted.current_action, "baseline"));
      setStage("intro");
    } catch (err) {
      setFlowError(err instanceof Error ? err.message : "Could not start session. Sign in and ensure the API is running.");
    }
  }

  async function startBaselineRecording() {
    if (!sessionId) return;
    setFlowError(null);
    try {
      const session = await advanceSession(sessionId, "baseline_prompt");
      setBaselineQuestion(questionFromAction(session.current_action, "baseline"));
      setStage("baseline-question");
    } catch (err) {
      setFlowError(err instanceof Error ? err.message : "Could not enter baseline recording.");
    }
  }

  async function handleBaselineSubmit(payload: RecordingSubmitPayload) {
    setPendingMedia(payload);
    setPendingRole("baseline");
    setStage("baseline-analyzing");
  }

  async function onBaselineAnalyzed() {
    if (!sessionId || !pendingMedia || pendingRole !== "baseline") return;
    try {
      const attempt = await createAttempt(sessionId, "baseline");
      const result = await analyzeInterviewAttempt({
        sessionId,
        attemptId: attempt.id,
        audioBlob: pendingMedia.audioBlob,
        videoBlob: pendingMedia.videoBlob,
      });
      await waitForPhase(sessionId, ["baseline_analyzed"]);
      setBaselineAnalysis(result);
      setPendingMedia(null);
      setPendingRole(null);
      setStage("baseline-result");
    } catch (err) {
      setFlowError(err instanceof Error ? err.message : "Baseline analysis failed.");
      setStage("baseline-question");
    }
  }

  async function startPressureRound() {
    if (!sessionId) return;
    try {
      await advanceSession(sessionId, "baseline_analyzed");
      setStage("pressure-intro");
    } catch (err) {
      setFlowError(err instanceof Error ? err.message : "Could not start pressure round.");
    }
  }

  async function enterPressureRecording() {
    if (!sessionId) return;
    try {
      const session = await advanceSession(sessionId, "pressure_prompt");
      setPressureQuestion(questionFromAction(session.current_action, "pressure"));
      setStage("pressure-question");
    } catch (err) {
      setFlowError(err instanceof Error ? err.message : "Could not enter pressure recording.");
    }
  }

  async function handlePressureSubmit(payload: RecordingSubmitPayload) {
    setPendingMedia(payload);
    setPendingRole("pressure");
    setStage("pressure-analyzing");
  }

  async function onPressureAnalyzed() {
    if (!sessionId || !pendingMedia || pendingRole !== "pressure") return;
    try {
      const attempt = await createAttempt(sessionId, "pressure");
      const result = await analyzeInterviewAttempt({
        sessionId,
        attemptId: attempt.id,
        audioBlob: pendingMedia.audioBlob,
        videoBlob: pendingMedia.videoBlob,
      });
      await waitForPhase(sessionId, ["pressure_analyzed"]);
      setPressureAnalysis(result);
      setPendingMedia(null);
      setPendingRole(null);
      setStage("pressure-result");
    } catch (err) {
      setFlowError(err instanceof Error ? err.message : "Pressure analysis failed.");
      setStage("pressure-question");
    }
  }

  async function onDiagnosed() {
    if (!sessionId) return;
    try {
      await advanceSession(sessionId, "pressure_analyzed");
      await waitForPhase(sessionId, ["challenge_prompt"]);
      const [d, c] = await Promise.all([fetchSessionDiagnosis(sessionId), fetchSessionChallenge(sessionId, config.topic)]);
      setDiagnosisResult(d);
      setChallenge(c);
      setStage("diagnosis");
    } catch (err) {
      setFlowError(err instanceof Error ? err.message : "Diagnosis failed.");
    }
  }

  async function startReplay() {
    if (!sessionId) return;
    try {
      await advanceSession(sessionId, "challenge_prompt");
      const { conditions, question } = await replayFromSession(sessionId, config);
      setReplayConditions(conditions);
      setReplayQuestion(question);
      setStage("replay-intro");
    } catch (err) {
      setFlowError(err instanceof Error ? err.message : "Could not start replay.");
    }
  }

  async function enterRetryRecording() {
    if (!sessionId) return;
    try {
      const session = await advanceSession(sessionId, "replay_condition");
      setReplayQuestion(questionFromAction(session.current_action, "retry"));
      setStage("replay-question");
    } catch (err) {
      setFlowError(err instanceof Error ? err.message : "Could not enter retry.");
    }
  }

  async function handleRetrySubmit(payload: RecordingSubmitPayload) {
    setPendingMedia(payload);
    setPendingRole("retry");
    setStage("retry-analyzing");
  }

  async function onRetryAnalyzed() {
    if (!sessionId || !pendingMedia || pendingRole !== "retry") return;
    try {
      const attempt = await createAttempt(sessionId, "retry");
      const result = await analyzeInterviewAttempt({
        sessionId,
        attemptId: attempt.id,
        audioBlob: pendingMedia.audioBlob,
        videoBlob: pendingMedia.videoBlob,
      });
      const scored = await waitForPhase(sessionId, ["comparing", "profile_updated"]);
      if (scored.phase === "comparing") {
        await advanceSession(sessionId, "comparing");
      }
      const deltas = await fetchSessionComparison(sessionId);
      setRetryAnalysis(result);
      setImprovementDeltas(deltas);
      setPendingMedia(null);
      setPendingRole(null);
      setStage("improvement");
    } catch (err) {
      setFlowError(err instanceof Error ? err.message : "Retry analysis failed.");
      setStage("replay-question");
    }
  }

  async function finishSession() {
    if (sessionId) {
      try {
        const s = await getSession(sessionId);
        if (s.phase === "comparing") await advanceSession(sessionId, "comparing");
        const after = s.phase === "comparing" ? await getSession(sessionId) : s;
        if (after.phase === "profile_updated") await advanceSession(sessionId, "profile_updated");
      } catch (err) {
        setFlowError(err instanceof Error ? err.message : "Could not mark session completed.");
      }
    }
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
        {stageToStep[stage] && (
          <div className="mb-5">
            <Badge variant="dark" size="sm">
              <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-teal" />
              {stageToStep[stage]}
            </Badge>
          </div>
        )}

        {flowError && (
          <p className="mb-4 rounded-xl border border-rose/40 bg-rose-soft px-3.5 py-2.5 text-sm text-rose-ink">{flowError}</p>
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
                topic={topic}
                setTopic={setTopic}
                audience={audience}
                setAudience={setAudience}
                language={language}
                setLanguage={setLanguage}
                difficulty={difficulty}
                setDifficulty={setDifficulty}
                onBegin={() => void beginInterview()}
              />
            )}

            {stage === "intro" && <IntroCard config={config} onStart={() => void startBaselineRecording()} />}

            {stage === "baseline-question" && baselineQuestion && (
              <RecordingPanel question={baselineQuestion} language={config.language} onSubmit={handleBaselineSubmit} />
            )}

            {stage === "baseline-analyzing" && <AnalyzingState stages={ANALYSIS_STAGES} onDone={() => void onBaselineAnalyzed()} />}

            {stage === "baseline-result" && baselineAnalysis && (
              <ResultStep
                title="Baseline round complete"
                note="Strong, unhurried performance. Now Pitchground introduces pressure."
                analysis={baselineAnalysis}
                ctaLabel="Introduce pressure round"
                onNext={() => void startPressureRound()}
              />
            )}

            {stage === "pressure-intro" && <PressureIntroCard onStart={() => void enterPressureRecording()} />}

            {stage === "pressure-question" && pressureQuestion && (
              <RecordingPanel question={pressureQuestion} language={config.language} onSubmit={handlePressureSubmit} />
            )}

            {stage === "pressure-analyzing" && <AnalyzingState stages={ANALYSIS_STAGES} onDone={() => void onPressureAnalyzed()} />}

            {stage === "pressure-result" && pressureAnalysis && (
              <ResultStep
                title="Pressure round complete"
                note="Let's see what changed compared to your baseline."
                analysis={pressureAnalysis}
                ctaLabel="See diagnosis"
                onNext={() => setStage("diagnosing")}
              />
            )}

            {stage === "diagnosing" && <AnalyzingState stages={DIAGNOSIS_STAGES} onDone={() => void onDiagnosed()} />}

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

            {stage === "challenge" && challenge && <ChallengePanel challenge={challenge} onPractice={() => void startReplay()} />}

            {stage === "replay-intro" && replayConditions && (
              <ReplayPanel conditions={replayConditions} onReplay={() => void enterRetryRecording()} />
            )}

            {stage === "replay-question" && replayQuestion && (
              <RecordingPanel question={replayQuestion} language={config.language} onSubmit={handleRetrySubmit} />
            )}

            {stage === "retry-analyzing" && <AnalyzingState stages={ANALYSIS_STAGES} onDone={() => void onRetryAnalyzed()} />}

            {stage === "improvement" && pressureAnalysis && retryAnalysis && improvementDeltas && (
              <ImprovementPanel
                deltas={improvementDeltas}
                scoreBefore={pressureAnalysis.overallScore}
                scoreAfter={retryAnalysis.overallScore}
                onDone={() => void finishSession()}
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
  topic,
  setTopic,
  audience,
  setAudience,
  language,
  setLanguage,
  difficulty,
  setDifficulty,
  onBegin,
}: {
  topic: string;
  setTopic: (v: string) => void;
  audience: Audience;
  setAudience: (v: Audience) => void;
  language: Language;
  setLanguage: (v: Language) => void;
  difficulty: Difficulty;
  setDifficulty: (v: Difficulty) => void;
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
          <Select options={topics.map((t) => ({ label: t, value: t }))} value={topic} onChange={(e) => setTopic(e.target.value)} />
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
          <p className="mt-1.5 text-xs text-muted">{difficulties.find((d) => d.value === difficulty)?.description}</p>
        </div>
      </div>

      <div className="sticky bottom-6">
        <Card className="flex items-center justify-between gap-4 p-4 pl-5 shadow-soft-lg">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{topic}</p>
            <p className="truncate text-xs text-ink-soft">
              {audience} · {language} · {difficulty}
            </p>
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
        A baseline question first, no timer. Pitchground will introduce pressure once it has a read on your natural pace.
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
        Same topic, tighter clock. This is where Pitchground looks for the gap between what you know and how you say it.
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
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl text-ink sm:text-3xl">{title}</h2>
          <p className="mt-1 text-sm text-ink-soft">{note}</p>
        </div>
        <Button size="lg" onClick={onNext} className="shrink-0">
          {ctaLabel}
          <ArrowRight size={16} />
        </Button>
      </div>

      <AnalysisBreakdown analysis={analysis} />
    </div>
  );
}

function DoneCard({ onDashboard, onProfile }: { onDashboard: () => void; onProfile: () => void }) {
  return (
    <Card className="p-8 text-center sm:p-12">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-teal-soft text-teal-ink">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <h2 className="font-display text-3xl text-ink">Session logged to your profile.</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">
        Pitchground has updated your communication dimensions and tracked the failure mode you just corrected.
      </p>
      <div className="mt-7 flex justify-center gap-3">
        <Button variant="outline" onClick={onDashboard}>
          Return to dashboard
        </Button>
        <Button onClick={onProfile}>
          View profile
          <ArrowRight size={16} />
        </Button>
      </div>
    </Card>
  );
}
