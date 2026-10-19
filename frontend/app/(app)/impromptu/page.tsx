"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ChipGroup, OptionGrid } from "@/components/shared/OptionGrid";
import { Select } from "@/components/ui/Select";
import { RecordingPanel, type RecordingSubmitPayload } from "@/components/interview/RecordingPanel";
import { AnalyzingState } from "@/components/interview/AnalyzingState";
import { PrepCountdown } from "@/components/impromptu/PrepCountdown";
import { ImpromptuReportPanel } from "@/components/impromptu/ImpromptuReportPanel";
import { analyzeRecording, getPracticeReport, languageCode } from "@/services/practiceService";
import { languages, difficulties } from "@/lib/practiceOptions";
const IMPROMPTU_ANALYSIS_STAGES = ["Analyzing recorded speech...", "Reviewing your answer...", "Preparing coaching..."];
import { saveGenericSession } from "@/services/learnerService";
import {
  createSession,
} from "@/services/sessionService";
import type {
  Difficulty,
  FailureDiagnosis,
  ImpromptuAnalysis,
  ImpromptuConfig,
  ImpromptuDuration,
  ImpromptuTopic,
  Language,
  RoundQuestion,
  TargetedChallenge,
} from "@/lib/types";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Dices,
  Languages as LanguagesIcon,
  Mic,
  PenTool,
  Sparkles,
  Swords,
  Zap,
} from "lucide-react";

type ImpromptuStage =
  | "setup"
  | "prep"
  | "speaking"
  | "analyzing"
  | "report"
  | "challenge-replay"
  | "challenge-analyzing"
  | "done";

const durations: { label: string; value: ImpromptuDuration }[] = [
  { label: "30 seconds", value: 30 },
  { label: "1 minute", value: 60 },
  { label: "3 minutes", value: 180 },
  { label: "5 minutes", value: 300 },
];

export default function ImpromptuPage() {
  const router = useRouter();

  // Setup state
  const [selectedTopic, setSelectedTopic] = useState<ImpromptuTopic>({ id: "custom", prompt: "", category: "Spontaneous Thought", hint: "" });
  const [customPrompt, setCustomPrompt] = useState("");
  const [isCustom, setIsCustom] = useState(true);
  const [flowError, setFlowError] = useState<string | null>(null);
  const [pendingMedia, setPendingMedia] = useState<RecordingSubmitPayload | null>(null);
  const [isRetry, setIsRetry] = useState(false);
  const [starting, setStarting] = useState(false);
  const startingRef = useRef(false);
  const [selectedDuration, setSelectedDuration] = useState<ImpromptuDuration>(60);
  const [selectedLanguage, setSelectedLanguage] = useState<Language>("English");
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>("Standard");

  // Flow state
  const [stage, setStage] = useState<ImpromptuStage>("setup");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<ImpromptuAnalysis | null>(null);
  const [diagnosisResult, setDiagnosisResult] = useState<FailureDiagnosis | null>(null);
  const [challengeResult, setChallengeResult] = useState<TargetedChallenge | null>(null);

  const activeTopic: ImpromptuTopic = isCustom && customPrompt.trim()
    ? {
        id: "custom-prompt",
        prompt: customPrompt.trim(),
        category: "Spontaneous Thought",
        hint: "Stay structured and avoid circular repetition.",
      }
    : selectedTopic;

  const config: ImpromptuConfig = {
    topic: activeTopic,
    durationSeconds: selectedDuration,
    language: selectedLanguage,
    difficulty: selectedDifficulty,
  };

  async function startPrep() {
    if (startingRef.current) return;
    setFlowError(null);
    if (!customPrompt.trim()) { setFlowError("Enter a topic or domain first."); return; }
    startingRef.current = true; setStarting(true);
    try {
      const sess = await createSession({ mode: "impromptu", topic: customPrompt.trim(),
        language: selectedLanguage, difficulty: selectedDifficulty });
      const generated = sess.current_action?.question_spec?.prompt_text;
      if (!generated) throw new Error("Question generation failed. Please retry.");
      setSelectedTopic({ id: sess.id, prompt: generated, category: "Spontaneous Thought", hint: "" });
      setCustomPrompt(generated);
      setSessionId(sess.id);
      setPendingMedia(null);setAnalysisResult(null);setIsRetry(false);
      setStage("prep");
    } catch (err) { setFlowError(err instanceof Error ? err.message : "Could not start practice."); }
    finally {startingRef.current=false;setStarting(false);}
  }

  function handleSpeechSubmit(payload: RecordingSubmitPayload) {
    setFlowError(null);
    setPendingMedia(payload);
    setIsRetry(false);
    setStage("analyzing");
  }

  async function onSpeechAnalyzed() {
    if (!sessionId || !pendingMedia) return;
    try {
      await analyzeRecording(sessionId, isRetry ? "retry" : "impromptu", pendingMedia,
        languageCode(selectedLanguage), isRetry ? challengeResult?.prompt : activeTopic.prompt);
      const res = await getPracticeReport<ImpromptuAnalysis>(sessionId);
      setAnalysisResult(res.analysis);
      setDiagnosisResult(res.diagnosis);
      setChallengeResult(res.challenge);
      await saveGenericSession({ sessionId, topic: activeTopic.prompt, mode: "impromptu",
        overallScore: res.analysis.overallScore, scoreDelta: 0, primaryWeakness: res.diagnosis.headline });
      setStage("report");
    } catch (err) {
      setFlowError(err instanceof Error ? err.message : "Analysis failed. Record again.");
      setStage(isRetry ? "challenge-replay" : "speaking");
    }
  }

  const speakQuestion: RoundQuestion = {
    id: `imp-speak-${selectedTopic.id}`,
    prompt: `Impromptu Speaking (${config.durationSeconds}s): "${activeTopic.prompt}"`,
    round: "pressure",
    pressure: "time-limit",
    timeLimitSeconds: config.durationSeconds,
  };

  const challengeQuestion: RoundQuestion = {
    id: "imp-challenge", prompt: challengeResult?.prompt || activeTopic.prompt,
    round: "replay", pressure: "time-limit", timeLimitSeconds: challengeResult?.timeLimitSeconds || selectedDuration,
  };

  return (
    <div className="mx-auto mt-6 w-full max-w-4xl px-4 pb-8 sm:pb-24 sm:mt-8 sm:px-6">
      {/* Breadcrumb Header */}
      {/* <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 overflow-hidden">
          <Link
            href="/dashboard"
            className="shrink-0 text-xs font-medium text-muted transition-colors hover:text-ink"
          >
            ← Dashboard
          </Link>
          <span className="text-muted/40">·</span>
          <p className="truncate text-xs font-medium text-muted">
            Impromptu Speaking · {config.durationSeconds}s · {config.language}
          </p>
        </div>

        {stage !== "setup" && stage !== "report" && (
          <Badge variant="lavender" size="sm">
            <Clock size={11} />
            {config.durationSeconds}s Drill
          </Badge>
        )}
      </div> */}

      {flowError && <p role="alert" className="mb-4 rounded-xl border border-rose/40 bg-paper-raised p-4 text-sm text-rose-ink">{flowError}{pendingMedia && <button className="ml-3 font-semibold underline" onClick={()=>{setFlowError(null);setStage(isRetry?"challenge-analyzing":"analyzing");}}>Retry analysis</button>}</p>}
      <AnimatePresence mode="wait">
        <motion.div
          key={stage}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          {/* SETUP SCREEN */}
          {stage === "setup" && (
            <div className="flex flex-col gap-6">
              <div>
                {/* <Badge variant="lavender" size="sm" className="mb-3">
                  <Zap size={12} />
                  Spontaneous Thinking
                </Badge> */}
                <h1 className="font-display text-3xl tracking-tight text-ink sm:text-4xl">
                  Impromptu Speaking Mode
                </h1>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
                  Receive a prompt you didn&apos;t prepare for. Review your measured pacing, pauses, fillers and answer
                  structure, then practice a clearer response using feedback from your recording.
                </p>
              </div>

              {/* 1. Topic selection or custom input */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Topic Selection</h2>
                </div>
                <div className="rounded-2xl border border-line bg-paper-raised p-4">
                  <label htmlFor="custom-prompt-input" className="mb-2 block text-xs font-medium text-muted">Enter any topic or domain for your speaking prompt</label>
                  <input id="custom-prompt-input" value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)} placeholder="What would you like to speak about?" className="w-full rounded-xl border border-line bg-paper px-4 py-3 text-sm text-ink outline-none focus:border-lavender-ink" />
                </div>
              </div>

              {/* 2. Duration Preset Pills */}
              <div>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Speaking Duration</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {durations.map((d) => (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => setSelectedDuration(d.value)}
                      className={`flex flex-col items-center rounded-2xl border p-4 text-center transition-all ${
                        selectedDuration === d.value
                          ? "border-lavender bg-lavender/30 shadow-soft"
                          : "border-line bg-paper-raised hover:border-line-strong"
                      }`}
                    >
                      <Clock size={16} className={selectedDuration === d.value ? "text-lavender-ink" : "text-muted"} />
                      <span className="mt-1 font-display text-sm font-semibold text-ink">{d.label}</span>
                      <span className="text-[11px] text-ink-soft">
                        {d.value === 30 ? "Sprint" : d.value === 60 ? "Standard" : "Deep Dive"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Language & Difficulty */}
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Language</h2>
                  <Select
                    options={languages.map((l) => ({ value: l.value, label: l.value, description: l.description }))}
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value as Language)}
                  />
                </div>

                <div>
                  <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Difficulty</h2>
                  <Select
                    options={difficulties.map((d) => ({ value: d.value, label: d.value }))}
                    value={selectedDifficulty}
                    onChange={(e) => setSelectedDifficulty(e.target.value as Difficulty)}
                  />
                  <p className="mt-2 text-xs text-muted">
                    {difficulties.find((d) => d.value === selectedDifficulty)?.description}
                  </p>
                </div>
              </div>

              {/* Sticky Launch Bar */}
              <div className="sticky bottom-6 mt-4">
                <Card className="flex items-center justify-between gap-4 p-4 pl-5 shadow-soft-lg">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">&quot;{activeTopic.prompt}&quot;</p>
                    <p className="truncate text-xs text-ink-soft">
                      {selectedDuration}s · {selectedLanguage} · 10s prep timer
                    </p>
                  </div>
                  <Button size="lg" disabled={starting} onClick={startPrep} className="shrink-0">
                    {starting ? "Preparing prompt…" : "Start 10s Prep"}
                    <ArrowRight size={16} />
                  </Button>
                </Card>
              </div>
            </div>
          )}

          {/* PREPARATION PHASE */}
          {stage === "prep" && (
            <PrepCountdown config={config} onComplete={() => setStage("speaking")} />
          )}

          {/* SPEAKING / RECORDING STAGE */}
          {stage === "speaking" && (
            <RecordingPanel
              question={speakQuestion}
              language={selectedLanguage}
              onSubmit={handleSpeechSubmit}
            />
          )}

          {/* ANALYZING STATE */}
          {stage === "analyzing" && (
            <AnalyzingState stages={IMPROMPTU_ANALYSIS_STAGES} onDone={onSpeechAnalyzed} />
          )}

          {/* REPORT */}
          {stage === "report" && analysisResult && diagnosisResult && challengeResult && (
            <ImpromptuReportPanel
              config={config}
              analysis={analysisResult}
              diagnosis={diagnosisResult}
              challenge={challengeResult}
              onStartChallenge={() => setStage("challenge-replay")}
              onDone={() => router.push("/dashboard")}
            />
          )}

          {/* TARGETED CHALLENGE REPLAY */}
          {stage === "challenge-replay" && (
            <div className="flex flex-col gap-5">
              <Card className="border-teal/50 bg-teal-soft/20 p-5">
                <Badge variant="teal" size="sm" className="mb-2">
                  Targeted Pacing Drill
                </Badge>
                <p className="font-display text-lg font-semibold text-ink">
                  {challengeResult?.objective}
                </p>
                <p className="mt-1 text-xs text-ink-soft">
                  {challengeResult?.framework.join(" → ")}
                </p>
              </Card>

              <RecordingPanel
                question={challengeQuestion}
                language={selectedLanguage}
                onSubmit={(payload) => { setFlowError(null);setPendingMedia(payload); setIsRetry(true); setStage("challenge-analyzing"); }}
              />
            </div>
          )}

          {/* CHALLENGE ANALYZING */}
          {stage === "challenge-analyzing" && (
            <AnalyzingState
              stages={["Analyzing your recorded retry...", "Updating speech metrics..."]}
              onDone={onSpeechAnalyzed}
            />
          )}

          {/* DONE */}
          {stage === "done" && (
            <Card className="p-8 text-center sm:p-12">
              <Badge variant="teal" size="sm" className="mx-auto mb-4">
                Drill Completed
              </Badge>
              <h2 className="font-display text-3xl text-ink">Practice recorded</h2>
              <p className="mx-auto mt-3 max-w-md text-[15px] text-ink-soft">
                Review the measured results in your report and session history.
              </p>
              <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                <Button size="lg" onClick={() => router.push("/dashboard")}>
                  Back to Dashboard
                </Button>
                <Button size="lg" variant="outline" onClick={() => router.push("/profile")}>
                  View Profile & Progress
                </Button>
              </div>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
