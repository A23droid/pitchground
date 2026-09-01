"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ChipGroup, OptionGrid } from "@/components/shared/OptionGrid";
import { AnalyzingState } from "@/components/interview/AnalyzingState";
import { DebateReportPanel } from "@/components/debate/DebateReportPanel";
import { RecordingPanel } from "@/components/interview/RecordingPanel";
import { DEBATE_TOPICS, getDebateScript } from "@/mock/debate";
import { languages, difficulties } from "@/mock/scenarios";
import {
  analyzeDebate,
  DEBATE_ANALYSIS_STAGES,
} from "@/services/debateService";
import { saveGenericSession } from "@/services/learnerService";
import { cn } from "@/lib/utils";
import type {
  DebateAnalysis,
  DebateConfig,
  DebatePosition,
  DebateRoundData,
  DebateTopic,
  Difficulty,
  FailureDiagnosis,
  Language,
  RoundQuestion,
  TargetedChallenge,
} from "@/lib/types";
import {
  ArrowRight,
  Bot,
  Camera,
  CameraOff,
  Dices,
  Languages as LanguagesIcon,
  Mic,
  ShieldAlert,
  Swords,
  Timer as TimerIcon,
  User,
  Volume2,
  Zap,
} from "lucide-react";

type PageMode = "setup" | "arena" | "analyzing" | "report" | "challenge-replay" | "challenge-analyzing" | "done";

type DebateTurn =
  | "user-opening" // Turn 1 (User active)
  | "ai-counter-1" // Turn 2 (AI active)
  | "user-rebuttal" // Turn 3 (User active)
  | "ai-counter-2" // Turn 4 (AI active)
  | "user-closing"; // Turn 5 (User active)

const TURN_CONFIG: Record<
  DebateTurn,
  {
    turnNumber: number;
    speaker: "user" | "ai";
    title: string;
    description: string;
    timeLimitSeconds: number;
    badgeLabel: string;
  }
> = {
  "user-opening": {
    turnNumber: 1,
    speaker: "user",
    title: "Your Opening Argument",
    description: "Establish your core premise, supporting rationale, and initial stance.",
    timeLimitSeconds: 60,
    badgeLabel: "Turn 1 of 5 · Opening",
  },
  "ai-counter-1": {
    turnNumber: 2,
    speaker: "ai",
    title: "AI Opponent Counterargument",
    description: "The AI sparring partner attacks your premise with targeted pushback.",
    timeLimitSeconds: 30,
    badgeLabel: "Turn 2 of 5 · AI Counter",
  },
  "user-rebuttal": {
    turnNumber: 3,
    speaker: "user",
    title: "Your Rebuttal & Defense",
    description: "Directly dismantle the opponent's counterargument under 30s time pressure.",
    timeLimitSeconds: 30,
    badgeLabel: "Turn 3 of 5 · Rebuttal",
  },
  "ai-counter-2": {
    turnNumber: 4,
    speaker: "ai",
    title: "AI Opponent Second Pushback",
    description: "The AI tests your structural resilience with a secondary challenge.",
    timeLimitSeconds: 30,
    badgeLabel: "Turn 4 of 5 · AI Pushback",
  },
  "user-closing": {
    turnNumber: 5,
    speaker: "user",
    title: "Your Final Closing Response",
    description: "Synthesize your position, address edge cases, and deliver a definitive close.",
    timeLimitSeconds: 30,
    badgeLabel: "Turn 5 of 5 · Final Close",
  },
};

export default function DebateArenaPage() {
  const router = useRouter();

  // Setup state
  const [selectedTopic, setSelectedTopic] = useState<DebateTopic>(DEBATE_TOPICS[0]);
  const [selectedPosition, setSelectedPosition] = useState<DebatePosition>("For");
  const [selectedLanguage, setSelectedLanguage] = useState<Language>("English");
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>("Standard");

  // Flow state
  const [pageMode, setPageMode] = useState<PageMode>("setup");
  const [currentTurn, setCurrentTurn] = useState<DebateTurn>("user-opening");

  // Arena interactive state
  const [userSpeechPhase, setUserSpeechPhase] = useState<"ready" | "speaking" | "finished">("ready");
  const [userTypedTranscript, setUserTypedTranscript] = useState("");
  const [aiTypedTranscript, setAiTypedTranscript] = useState("");
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);

  // Completed turns transcripts storage
  const [debateHistory, setDebateHistory] = useState<{
    userOpening?: string;
    aiCounter1?: string;
    userRebuttal?: string;
    aiCounter2?: string;
    userClosing?: string;
  }>({});

  // Camera & Media stream
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraState, setCameraState] = useState<"pending" | "live" | "unavailable">("pending");

  // Evaluation results
  const [analysisResult, setAnalysisResult] = useState<DebateAnalysis | null>(null);
  const [diagnosisResult, setDiagnosisResult] = useState<FailureDiagnosis | null>(null);
  const [challengeResult, setChallengeResult] = useState<TargetedChallenge | null>(null);

  const config: DebateConfig = {
    topic: selectedTopic,
    position: selectedPosition,
    language: selectedLanguage,
    difficulty: selectedDifficulty,
  };

  const opponentPosition: DebatePosition = selectedPosition === "For" ? "Against" : "For";
  const script = getDebateScript(selectedTopic.id, selectedLanguage);
  const activeTurnInfo = TURN_CONFIG[currentTurn];
  const isUserTurn = activeTurnInfo.speaker === "user";
  const isAiTurn = activeTurnInfo.speaker === "ai";

  // Camera Initialization when entering arena
  useEffect(() => {
    if (pageMode !== "arena") return;

    let cancelled = false;
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraState("live");
      } catch {
        if (!cancelled) setCameraState("unavailable");
      }
    };

    if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
      startCamera();
    } else {
      setCameraState("unavailable");
    }

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [pageMode]);

  // Guard against video element ref assignment race
  useEffect(() => {
    if (cameraState === "live" && streamRef.current && videoRef.current && !videoRef.current.srcObject) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraState, pageMode]);

  // Timer countdown for user turns
  useEffect(() => {
    if (pageMode !== "arena" || !isUserTurn || userSpeechPhase !== "speaking") return;
    if (secondsLeft <= 0) {
      finishUserSpeech();
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageMode, isUserTurn, userSpeechPhase, secondsLeft]);

  // Typewriter effect for user speech once "Start Speaking" is triggered
  useEffect(() => {
    if (pageMode !== "arena" || !isUserTurn || userSpeechPhase !== "speaking") return;
    setUserTypedTranscript("");

    const targetFullText =
      currentTurn === "user-opening"
        ? script.userOpening
        : currentTurn === "user-rebuttal"
        ? script.userRebuttal
        : script.userClosing;

    let i = 0;
    const speed = currentTurn === "user-opening" ? 18 : 14;
    const interval = setInterval(() => {
      i += 3;
      setUserTypedTranscript(targetFullText.slice(0, i));
      if (i >= targetFullText.length) {
        clearInterval(interval);
        setUserSpeechPhase("finished");
      }
    }, speed);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageMode, currentTurn, userSpeechPhase]);

  // Trigger AI Turn speech & typewriter when control shifts to AI
  useEffect(() => {
    if (pageMode !== "arena" || !isAiTurn) return;

    setIsAiSpeaking(true);
    setAiTypedTranscript("");

    const targetAiText = currentTurn === "ai-counter-1" ? script.aiCounter : script.aiCounter2;

    let i = 0;
    const interval = setInterval(() => {
      i += 3;
      setAiTypedTranscript(targetAiText.slice(0, i));
      if (i >= targetAiText.length) {
        clearInterval(interval);
        setIsAiSpeaking(false);
      }
    }, 18);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageMode, currentTurn]);

  function randomizeTopic() {
    const remaining = DEBATE_TOPICS.filter((t) => t.id !== selectedTopic.id);
    const random = remaining[Math.floor(Math.random() * remaining.length)] ?? DEBATE_TOPICS[0];
    setSelectedTopic(random);
  }

  function randomizePosition() {
    setSelectedPosition(Math.random() > 0.5 ? "For" : "Against");
  }

  function enterArena() {
    setPageMode("arena");
    setCurrentTurn("user-opening");
    setUserSpeechPhase("ready");
    setSecondsLeft(60);
    setUserTypedTranscript("");
    setAiTypedTranscript("");
    setDebateHistory({});
  }

  function startUserSpeaking() {
    setUserSpeechPhase("speaking");
    setSecondsLeft(activeTurnInfo.timeLimitSeconds);
  }

  function finishUserSpeech() {
    const targetFullText =
      currentTurn === "user-opening"
        ? script.userOpening
        : currentTurn === "user-rebuttal"
        ? script.userRebuttal
        : script.userClosing;
    setUserTypedTranscript(targetFullText);
    setUserSpeechPhase("finished");
  }

  function submitUserTurn() {
    if (currentTurn === "user-opening") {
      setDebateHistory((prev) => ({ ...prev, userOpening: userTypedTranscript }));
      // Pass turn control to RIGHT (AI)
      setCurrentTurn("ai-counter-1");
      setUserSpeechPhase("ready");
    } else if (currentTurn === "user-rebuttal") {
      setDebateHistory((prev) => ({ ...prev, userRebuttal: userTypedTranscript }));
      // Pass turn control to RIGHT (AI)
      setCurrentTurn("ai-counter-2");
      setUserSpeechPhase("ready");
    } else if (currentTurn === "user-closing") {
      setDebateHistory((prev) => ({ ...prev, userClosing: userTypedTranscript }));
      finishAndAnalyze();
    }
  }

  function advanceFromAiTurn() {
    if (currentTurn === "ai-counter-1") {
      setDebateHistory((prev) => ({ ...prev, aiCounter1: script.aiCounter }));
      // Pass turn control to LEFT (User)
      setCurrentTurn("user-rebuttal");
      setUserSpeechPhase("ready");
      setSecondsLeft(30);
      setUserTypedTranscript("");
    } else if (currentTurn === "ai-counter-2") {
      setDebateHistory((prev) => ({ ...prev, aiCounter2: script.aiCounter2 }));
      // Pass turn control to LEFT (User)
      setCurrentTurn("user-closing");
      setUserSpeechPhase("ready");
      setSecondsLeft(30);
      setUserTypedTranscript("");
    }
  }

  async function finishAndAnalyze() {
    setPageMode("analyzing");
  }

  async function onAnalysisDone() {
    const sampleRounds: DebateRoundData[] = [
      { round: 1, userTranscript: script.userOpening, timeLimitSeconds: 60 },
      {
        round: 2,
        userTranscript: script.userRebuttal,
        aiCounterTranscript: script.aiCounter,
        timeLimitSeconds: 30,
      },
    ];
    const res = await analyzeDebate(config, sampleRounds);
    setAnalysisResult(res.analysis);
    setDiagnosisResult(res.diagnosis);
    setChallengeResult(res.challenge);

    saveGenericSession({
      topic: `Debate: ${config.topic.title}`,
      mode: "debate",
      overallScore: res.analysis.overallScore,
      scoreDelta: 18,
      primaryWeakness: "Rebuttal under counter-pressure",
    });

    setPageMode("report");
  }

  const challengeQuestion: RoundQuestion = {
    id: `debate-chal-q`,
    prompt: `Practice PRT Rebuttal (30s limit): Point → Refutation → Turnaround.`,
    round: "replay",
    pressure: "time-limit",
    timeLimitSeconds: 30,
  };

  return (
    <div className="mx-auto mt-4 w-full max-w-6xl px-3 pb-24 sm:mt-6 sm:px-6">
      {/* Breadcrumbs Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 overflow-hidden">
          <Link
            href="/dashboard"
            className="shrink-0 text-xs font-medium text-muted transition-colors hover:text-ink"
          >
            ← Dashboard
          </Link>
          <span className="text-muted/40">·</span>
          <p className="truncate text-xs font-medium text-muted">
            Debate Arena · {selectedTopic.title} · You: {selectedPosition} vs AI: {opponentPosition}
          </p>
        </div>

        {pageMode === "arena" && (
          <Badge variant="lavender" size="sm" className="font-mono text-xs">
            <Swords size={11} />
            {activeTurnInfo.badgeLabel}
          </Badge>
        )}
      </div>

      <AnimatePresence mode="wait">
        {/* 1. SETUP SCREEN */}
        {pageMode === "setup" && (
          <motion.div
            key="setup"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="mx-auto max-w-3xl"
          >
            <div>
              <Badge variant="lavender" size="sm" className="mb-3">
                <Swords size={12} />
                Adversarial Debate Arena
              </Badge>
              <h1 className="font-display text-3xl tracking-tight text-ink sm:text-4xl">
                Persistent Live Sparring Room
              </h1>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
                Face an AI sparring partner in a single continuous 2-participant arena. Opening thesis → Live AI counter-attack
                → Direct rebuttal under pressure.
              </p>
            </div>

            {/* Topic Selection */}
            <div className="mb-6">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Select Debate Topic</h2>
                <Button size="sm" variant="ghost" onClick={randomizeTopic} className="h-7 text-xs">
                  <Dices size={13} />
                  Random topic
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {DEBATE_TOPICS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTopic(t)}
                    className={`flex flex-col items-start rounded-2xl border p-4 text-left transition-all ${
                      selectedTopic.id === t.id
                        ? "border-lavender-strong bg-lavender/30 shadow-soft"
                        : "border-line bg-paper-raised hover:border-line-strong"
                    }`}
                  >
                    <Badge variant={selectedTopic.id === t.id ? "lavender" : "outline"} size="sm" className="mb-2">
                      {t.category}
                    </Badge>
                    <p className="font-display text-base font-semibold text-ink">{t.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-soft">{t.context}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Position Selector */}
            <div className="mb-6">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Your Position</h2>
                <Button size="sm" variant="ghost" onClick={randomizePosition} className="h-7 text-xs">
                  <Dices size={13} />
                  Random position
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedPosition("For")}
                  className={`rounded-2xl border p-4 text-left transition-all ${
                    selectedPosition === "For"
                      ? "border-teal bg-teal-soft/40 shadow-soft"
                      : "border-line bg-paper-raised hover:border-line-strong"
                  }`}
                >
                  <p className="font-display text-sm font-semibold text-teal-ink">FOR (In favor)</p>
                  <p className="mt-1 text-xs text-ink-soft">{selectedTopic.forPerspective}</p>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedPosition("Against")}
                  className={`rounded-2xl border p-4 text-left transition-all ${
                    selectedPosition === "Against"
                      ? "border-amber bg-amber-soft/40 shadow-soft"
                      : "border-line bg-paper-raised hover:border-line-strong"
                  }`}
                >
                  <p className="font-display text-sm font-semibold text-amber-ink">AGAINST (Opposition)</p>
                  <p className="mt-1 text-xs text-ink-soft">{selectedTopic.againstPerspective}</p>
                </button>
              </div>
            </div>

            {/* Language & Difficulty */}
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Language</h2>
                <OptionGrid
                  options={languages.map((l) => ({ value: l.value, label: l.value, description: l.description }))}
                  value={selectedLanguage}
                  onChange={setSelectedLanguage}
                  columns={2}
                />
              </div>

              <div>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Difficulty</h2>
                <ChipGroup
                  options={difficulties.map((d) => d.value)}
                  value={selectedDifficulty}
                  onChange={setSelectedDifficulty}
                />
                <p className="mt-2 text-xs text-muted">
                  {difficulties.find((d) => d.value === selectedDifficulty)?.description}
                </p>
              </div>
            </div>

            {/* Launch Bar */}
            <div className="sticky bottom-6 mt-6">
              <Card className="flex items-center justify-between gap-4 p-4 pl-5 shadow-soft-lg">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">
                    {selectedTopic.title} ({selectedPosition})
                  </p>
                  <p className="truncate text-xs text-ink-soft">
                    Single-Screen Arena · {selectedLanguage} · {selectedDifficulty}
                  </p>
                </div>
                <Button size="lg" onClick={enterArena} className="shrink-0">
                  Enter Live Arena
                  <ArrowRight size={16} />
                </Button>
              </Card>
            </div>
          </motion.div>
        )}

        {/* 2. THE PERSISTENT SINGLE DEBATE ARENA SCREEN */}
        {pageMode === "arena" && (
          <motion.div
            key="arena"
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="flex flex-col gap-4"
          >
            {/* Arena Header & Topic Banner */}
            <Card className="p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted">Debate Motion</span>
                    <Badge variant="outline" size="sm">
                      {selectedTopic.category}
                    </Badge>
                  </div>
                  <h1 className="mt-1 font-display text-xl font-bold text-ink sm:text-2xl">
                    &quot;{selectedTopic.title}&quot;
                  </h1>
                </div>

                {/* Turn Status Pill */}
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold shadow-sm transition-colors",
                      isUserTurn
                        ? "bg-teal text-white ring-2 ring-teal/30"
                        : "bg-ink text-white ring-2 ring-lavender-strong/40",
                    )}
                  >
                    <span className={cn("h-2 w-2 rounded-full", isUserTurn ? "animate-pulse bg-white" : "animate-pulse bg-lavender-strong")} />
                    <span>{isUserTurn ? "YOUR TURN TO SPEAK" : "AI OPPONENT TURN"}</span>
                  </div>
                </div>
              </div>

              {/* Turn Step Progression Pills */}
              <div className="mt-4 flex items-center gap-1.5 overflow-x-auto border-t border-line/60 pt-3 text-xs">
                {(["user-opening", "ai-counter-1", "user-rebuttal", "ai-counter-2", "user-closing"] as DebateTurn[]).map(
                  (turnKey) => {
                    const info = TURN_CONFIG[turnKey];
                    const isCurrent = currentTurn === turnKey;
                    const isPast =
                      info.turnNumber < activeTurnInfo.turnNumber;

                    return (
                      <div
                        key={turnKey}
                        className={cn(
                          "flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 transition-all",
                          isCurrent
                            ? info.speaker === "user"
                              ? "bg-teal-soft font-semibold text-teal-ink ring-1 ring-teal/40"
                              : "bg-lavender font-semibold text-lavender-ink ring-1 ring-lavender-strong/50"
                            : isPast
                            ? "bg-black/[0.04] text-ink-soft opacity-80"
                            : "text-muted opacity-50",
                        )}
                      >
                        <span className="font-mono text-[10px]">T{info.turnNumber}</span>
                        <span className="hidden sm:inline">{info.speaker === "user" ? "You" : "AI"}: {info.title.replace("Your ", "").replace("AI Opponent ", "")}</span>
                      </div>
                    );
                  },
                )}
              </div>
            </Card>

            {/* 50/50 TRUE SPLIT ARENA: YOU (LEFT) ─── AI OPPONENT (RIGHT) */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* ─────────────────────────────────────────────────────────────
                  LEFT PARTICIPANT: YOU
              ───────────────────────────────────────────────────────────── */}
              <Card
                className={cn(
                  "relative flex flex-col overflow-hidden transition-all duration-300",
                  isUserTurn
                    ? "border-teal shadow-soft-lg ring-2 ring-teal/20"
                    : "border-line bg-paper/60 opacity-80",
                )}
              >
                {/* User Header */}
                <div className="flex items-center justify-between border-b border-line p-3 sm:px-4">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full text-white shadow-soft transition-colors",
                        isUserTurn ? "bg-teal" : "bg-ink/50",
                      )}
                    >
                      <User size={15} />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-ink">You (Human)</p>
                      <p className="text-[11px] text-ink-soft">
                        Position: <span className="font-semibold text-teal-ink">{selectedPosition}</span>
                      </p>
                    </div>
                  </div>

                  <Badge variant={isUserTurn ? "teal" : "outline"} size="sm">
                    {isUserTurn
                      ? userSpeechPhase === "speaking"
                        ? "Active · Speaking"
                        : "Your Turn"
                      : "Listening"}
                  </Badge>
                </div>

                {/* User Live Camera & Status Viewport */}
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-teal lg:aspect-auto lg:h-[230px]">
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className={cn(
                      "h-full w-full scale-x-[-1] object-cover transition-opacity",
                      cameraState !== "live" && "hidden",
                      !isUserTurn && "opacity-70",
                    )}
                  />
                  {cameraState !== "live" && (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-teal to-[#091b18] text-white">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
                        <CameraOff size={18} />
                      </div>
                      <p className="text-xs text-white/70">
                        {cameraState === "pending" ? "Connecting video…" : "Demo Video Preview Mode"}
                      </p>
                    </div>
                  )}

                  {/* Overlays */}
                  <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5">
                    {isUserTurn && userSpeechPhase === "speaking" && (
                      <span className="flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber" />
                        Live Mic
                      </span>
                    )}
                    <span className="flex items-center gap-1 rounded-full bg-black/40 px-2 py-0.5 text-[10px] text-white/80 backdrop-blur-sm">
                      <Camera size={9} />
                      {cameraState === "live" ? "Cam Live" : "Demo Cam"}
                    </span>
                  </div>

                  {/* Timer Badge during User Turn */}
                  {isUserTurn && userSpeechPhase === "speaking" && (
                    <div className="absolute right-2.5 top-2.5">
                      <span
                        className={cn(
                          "flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-xs font-semibold backdrop-blur-sm",
                          secondsLeft <= 5 ? "bg-amber text-amber-ink" : "bg-black/50 text-white",
                        )}
                      >
                        <TimerIcon size={11} />
                        {String(secondsLeft).padStart(2, "0")}s
                      </span>
                    </div>
                  )}
                </div>

                {/* User Live Transcript Box */}
                <div className="flex flex-1 flex-col p-3 sm:p-4">
                  <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-muted">
                    <span className="flex items-center gap-1">
                      <Mic size={11} />
                      {activeTurnInfo.title}
                    </span>
                    {isUserTurn && (
                      <span className="text-[11px] text-ink-soft">
                        {activeTurnInfo.timeLimitSeconds}s target limit
                      </span>
                    )}
                  </div>

                  <div className="min-h-[110px] rounded-xl border border-line bg-paper p-3 text-xs leading-relaxed text-ink sm:text-sm">
                    {isUserTurn ? (
                      userSpeechPhase === "ready" ? (
                        <span className="text-muted">
                          Click &quot;Start Answering&quot; below to deliver your {activeTurnInfo.title.toLowerCase()}…
                        </span>
                      ) : (
                        <>
                          {userTypedTranscript}
                          {userSpeechPhase === "speaking" && (
                            <span className="animate-pulse font-mono font-bold text-teal">▍</span>
                          )}
                        </>
                      )
                    ) : (
                      <span className="text-muted italic">
                        {debateHistory.userRebuttal
                          ? `Your rebuttal: "${debateHistory.userRebuttal.slice(0, 100)}…"`
                          : debateHistory.userOpening
                          ? `Your opening: "${debateHistory.userOpening.slice(0, 100)}…"`
                          : "Listening to opponent…"}
                      </span>
                    )}
                  </div>

                  {/* User Turn Controls */}
                  {isUserTurn && (
                    <div className="mt-3 flex items-center justify-end gap-2">
                      {userSpeechPhase === "ready" && (
                        <Button size="sm" onClick={startUserSpeaking} className="bg-teal hover:bg-teal/90 text-white">
                          <Mic size={14} />
                          Start Answering ({activeTurnInfo.timeLimitSeconds}s)
                        </Button>
                      )}
                      {userSpeechPhase === "speaking" && (
                        <Button size="sm" variant="outline" onClick={finishUserSpeech}>
                          End Response
                        </Button>
                      )}
                      {userSpeechPhase === "finished" && (
                        <Button size="sm" onClick={submitUserTurn} className="bg-teal hover:bg-teal/90 text-white">
                          Submit Turn
                          <ArrowRight size={14} />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </Card>

              {/* ─────────────────────────────────────────────────────────────
                  RIGHT PARTICIPANT: AI OPPONENT
              ───────────────────────────────────────────────────────────── */}
              <Card
                className={cn(
                  "relative flex flex-col overflow-hidden transition-all duration-300",
                  isAiTurn
                    ? "border-lavender-strong shadow-soft-lg ring-2 ring-lavender-strong/30"
                    : "border-line bg-paper/60 opacity-80",
                )}
              >
                {/* AI Header */}
                <div className="flex items-center justify-between border-b border-line p-3 sm:px-4">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full text-white shadow-soft transition-colors",
                        isAiTurn ? "bg-ink text-lavender" : "bg-ink/50",
                      )}
                    >
                      <Bot size={15} />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-ink">AI Opponent</p>
                      <p className="text-[11px] text-ink-soft">
                        Position: <span className="font-semibold text-amber-ink">{opponentPosition}</span>
                      </p>
                    </div>
                  </div>

                  <Badge variant={isAiTurn ? "lavender" : "outline"} size="sm">
                    {isAiTurn
                      ? isAiSpeaking
                        ? "Active · Countering"
                        : "Finished Counter"
                      : "Listening to You"}
                  </Badge>
                </div>

                {/* AI Visual Presence Viewport */}
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-gradient-to-br from-[#1a1714] via-[#221e19] to-[#12100d] p-4 text-white lg:aspect-auto lg:h-[230px]">
                  <div className="flex h-full flex-col items-center justify-center gap-3">
                    <div
                      className={cn(
                        "relative flex h-14 w-14 items-center justify-center rounded-full border-2 transition-all",
                        isAiTurn
                          ? "border-lavender-strong bg-lavender/20 shadow-[0_0_24px_rgba(207,189,247,0.3)]"
                          : "border-white/20 bg-white/5",
                      )}
                    >
                      <Bot size={24} className={isAiTurn ? "text-lavender" : "text-white/60"} />
                      {isAiTurn && isAiSpeaking && (
                        <span className="absolute inset-0 animate-ping rounded-full border border-lavender-strong opacity-40" />
                      )}
                    </div>

                    {/* Dynamic Equalizer Waveform Bars when AI is active */}
                    <div className="flex items-center gap-1">
                      {[4, 12, 20, 10, 16, 26, 14, 22, 8, 18, 12, 5].map((h, i) => (
                        <motion.span
                          key={i}
                          className={cn("w-[3px] rounded-full", isAiTurn ? "bg-lavender-strong" : "bg-white/20")}
                          animate={
                            isAiTurn && isAiSpeaking
                              ? { height: [4, h, 4] }
                              : { height: 4 }
                          }
                          transition={{
                            duration: 0.5 + (i % 3) * 0.12,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                        />
                      ))}
                    </div>

                    <p className="text-[11px] text-white/70">
                      {isAiTurn
                        ? isAiSpeaking
                          ? "Synthesizing and delivering adversarial pushback…"
                          : "Counterargument delivered"
                        : "Evaluating your argument logic and premise…"}
                    </p>
                  </div>
                </div>

                {/* AI Live Transcript Box */}
                <div className="flex flex-1 flex-col p-3 sm:p-4">
                  <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-muted">
                    <span className="flex items-center gap-1">
                      <ShieldAlert size={11} className="text-amber-ink" />
                      AI Argument Output
                    </span>
                    {isAiTurn && (
                      <span className="flex items-center gap-1 text-[11px] text-ink-soft">
                        <Volume2 size={11} className="animate-pulse text-lavender-ink" />
                        Live Voice
                      </span>
                    )}
                  </div>

                  <div className="min-h-[110px] rounded-xl border border-line bg-paper p-3 text-xs leading-relaxed text-ink sm:text-sm">
                    {isAiTurn ? (
                      <>
                        {aiTypedTranscript}
                        {isAiSpeaking && (
                          <span className="animate-pulse font-mono font-bold text-ink">▍</span>
                        )}
                      </>
                    ) : (
                      <span className="text-muted italic">
                        {debateHistory.aiCounter1
                          ? `Previous Counter: "${debateHistory.aiCounter1.slice(0, 110)}…"`
                          : "AI is listening to your premise…"}
                      </span>
                    )}
                  </div>

                  {/* AI Turn Action */}
                  {isAiTurn && (
                    <div className="mt-3 flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        onClick={advanceFromAiTurn}
                        className="bg-ink hover:bg-ink/90 text-white"
                      >
                        {isAiSpeaking ? "Skip & Rebut Now" : "Deliver Your Rebuttal"}
                        <ArrowRight size={14} />
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Bottom Arena Director Bar */}
            <Card className="flex flex-wrap items-center justify-between gap-3 p-3.5 sm:px-5">
              <div className="flex items-center gap-2">
                <Badge variant="outline" size="sm">
                  {selectedLanguage}
                </Badge>
                <p className="text-xs font-medium text-ink-soft">
                  Turn {activeTurnInfo.turnNumber} of 5:{" "}
                  <span className="font-semibold text-ink">{activeTurnInfo.title}</span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={finishAndAnalyze} className="text-xs text-muted hover:text-ink">
                  End Debate & View Report
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* 3. ANALYZING STATE */}
        {pageMode === "analyzing" && (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <AnalyzingState stages={DEBATE_ANALYSIS_STAGES} onDone={onAnalysisDone} />
          </motion.div>
        )}

        {/* 4. REPORT & DIAGNOSIS */}
        {pageMode === "report" && analysisResult && diagnosisResult && challengeResult && (
          <motion.div
            key="report"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <DebateReportPanel
              config={config}
              analysis={analysisResult}
              diagnosis={diagnosisResult}
              challenge={challengeResult}
              onStartChallenge={() => setPageMode("challenge-replay")}
              onDone={() => router.push("/dashboard")}
            />
          </motion.div>
        )}

        {/* 5. TARGETED CHALLENGE REPLAY */}
        {pageMode === "challenge-replay" && (
          <motion.div
            key="challenge-replay"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-5"
          >
            <Card className="border-teal/50 bg-teal-soft/20 p-5">
              <Badge variant="teal" size="sm" className="mb-2">
                Targeted Rebuttal Drill
              </Badge>
              <p className="font-display text-lg font-semibold text-ink">
                Point → Refutation → Turnaround (PRT) Drill
              </p>
              <p className="mt-1 text-xs text-ink-soft">
                Apply the 3-step refutation framework to reverse the counter-argument cleanly.
              </p>
            </Card>

            <RecordingPanel
              question={challengeQuestion}
              transcript={
                selectedLanguage === "Malayalam"
                  ? "Point: Opponent automation bias-നെ കുറിച്ചാണ് പറയുന്നത്. Refutation: പക്ഷെ modern CI pipeline-ൽ static security gates ഉള്ളതുകൊണ്ട് unvetted code production-ൽ എത്തില്ല. Turnaround: അതുകൊണ്ട് യഥാർത്ഥത്തിൽ AI velocity security standards ഉയർത്തുകയാണ് ചെയ്യുന്നത്."
                  : selectedLanguage === "Hindi"
                  ? "Point: Opponent ka tarka hai automation bias. Refutation: Lekin automated security gates flawed code ko production se pehle hi block kar dete hain. Turnaround: Isliye AI velocity actually code quality ko enhance karti hai."
                  : "Point: The opponent claims automation bias leads to unvetted bugs. Refutation: However, automated security linting catches structural flaws deterministically. Turnaround: Thus, AI accelerators actually enforce higher baseline code quality."
              }
              onSubmit={() => setPageMode("challenge-analyzing")}
            />
          </motion.div>
        )}

        {/* 6. CHALLENGE ANALYZING */}
        {pageMode === "challenge-analyzing" && (
          <motion.div
            key="challenge-analyzing"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <AnalyzingState
              stages={["Measuring rebuttal recovery...", "Updating learner profile..."]}
              onDone={() => setPageMode("done")}
            />
          </motion.div>
        )}

        {/* 7. DONE SCREEN */}
        {pageMode === "done" && (
          <motion.div
            key="done"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="p-8 text-center sm:p-12">
              <Badge variant="teal" size="sm" className="mx-auto mb-4">
                Drill Completed
              </Badge>
              <h2 className="font-display text-3xl text-ink">Rebuttal Technique Improved!</h2>
              <p className="mx-auto mt-3 max-w-md text-[15px] text-ink-soft">
                Your direct premise refutation score improved from 44% to 81% using the PRT framework.
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
