import type {
  Attempt,
  AttemptAnalysis,
  AttemptStage,
  DiagnosisMetricDelta,
  FailureDiagnosis,
  ReplayConditions,
  RoundQuestion,
  ScenarioConfig,
  TargetedChallenge,
} from "@/lib/types";

let idCounter = 0;
function nextId(prefix: string) {
  idCounter += 1;
  return `${prefix}-${idCounter}-${Date.now()}`;
}

function baseAnalysis(overrides: Partial<AttemptAnalysis> = {}): AttemptAnalysis {
  return {
    attemptId: nextId("attempt"),
    content: { correctness: 91, relevance: 93, topicUnderstanding: 90 },
    communication: { structure: 82, clarity: 80, coherence: 83, fluency: 85 },
    voice: { speakingRateWpm: 132, fillerCount: 7, pauseCount: 3, responseLatencySeconds: 1.5 },
    visual: { gaze: 84, posture: 88, engagement: 86 },
    language: { primaryLanguage: "English", codeSwitchingDetected: false, englishArticulation: 82 },
    overallScore: 85,
    ...overrides,
  };
}

/** Round 1 (Baseline): strong, unhurried performance. */
export function generateBaselineAnalysis(): AttemptAnalysis {
  return baseAnalysis();
}

/**
 * Round 2 (Pressure): content knowledge holds, but communication and voice
 * metrics deliberately deteriorate under the 20s timer, per the product PRD.
 */
export function generatePressureAnalysis(): AttemptAnalysis {
  return baseAnalysis({
    content: { correctness: 88, relevance: 90, topicUnderstanding: 89 },
    communication: { structure: 51, clarity: 58, coherence: 54, fluency: 61 },
    voice: { speakingRateWpm: 168, fillerCount: 18, pauseCount: 6, responseLatencySeconds: 3.9 },
    visual: { gaze: 71, posture: 74, engagement: 69 },
    overallScore: 63,
  });
}

/** Retry (after the targeted challenge): measurable recovery, not a full reset. */
export function generateRetryAnalysis(): AttemptAnalysis {
  return baseAnalysis({
    content: { correctness: 90, relevance: 91, topicUnderstanding: 90 },
    communication: { structure: 74, clarity: 73, coherence: 76, fluency: 78 },
    voice: { speakingRateWpm: 145, fillerCount: 8, pauseCount: 4, responseLatencySeconds: 1.9 },
    visual: { gaze: 80, posture: 85, engagement: 82 },
    overallScore: 79,
  });
}

export function buildAttempt(
  stage: AttemptStage,
  question: RoundQuestion,
  analysis: AttemptAnalysis,
  transcript: string,
): Attempt {
  return {
    id: nextId("attempt-record"),
    stage,
    question,
    transcript,
    analysis,
    createdAt: new Date().toISOString(),
  };
}

/** Compares baseline vs pressure and produces the central diagnosis. */
export function generateDiagnosis(baseline: AttemptAnalysis, pressure: AttemptAnalysis): FailureDiagnosis {
  const structureDropPct = Math.round(
    ((baseline.communication.structure - pressure.communication.structure) / baseline.communication.structure) * 100,
  );
  const fillerMultiplier = Math.round((pressure.voice.fillerCount / baseline.voice.fillerCount) * 10) / 10;
  const latencyIncrease = Math.round((pressure.voice.responseLatencySeconds - baseline.voice.responseLatencySeconds) * 10) / 10;
  const contentDelta = Math.abs(baseline.content.correctness - pressure.content.correctness);

  const deltas: DiagnosisMetricDelta[] = [
    { label: "Structure", before: baseline.communication.structure, after: pressure.communication.structure, unit: "%", direction: "down-is-bad" },
    { label: "Fillers", before: baseline.voice.fillerCount, after: pressure.voice.fillerCount, unit: "count", direction: "up-is-bad" },
    { label: "Response time", before: baseline.voice.responseLatencySeconds, after: pressure.voice.responseLatencySeconds, unit: "s", direction: "up-is-bad" },
    { label: "Content correctness", before: baseline.content.correctness, after: pressure.content.correctness, unit: "%", direction: "stable-is-good" },
  ];

  return {
    headline: "Your technical understanding remained strong, but your answer structure deteriorated under time pressure.",
    explanation: `Content correctness moved by only ${contentDelta} points, so the knowledge is there. What broke down is delivery: structure fell ${Math.abs(structureDropPct)}%, filler words came in at ${fillerMultiplier}× the baseline rate, and it took ${latencyIncrease}s longer to start answering once the 20-second timer appeared.`,
    deltas,
    rootCause: "pressure-structure-collapse",
    confidence: 0.82,
    occurrences: 3,
  };
}

export function generateChallenge(config: ScenarioConfig): TargetedChallenge {
  return {
    id: nextId("challenge"),
    objective: "Structure technical answers under time pressure.",
    framework: ["Definition", "Reason", "Example"],
    prompt: `Explain a technical concept from ${config.topic} in 20 seconds using Definition → Reason → Example.`,
    timeLimitSeconds: 20,
    weaknessTargeted: "Structure under time pressure",
  };
}

export function generateReplayConditions(config: ScenarioConfig): ReplayConditions {
  return {
    topic: config.topic,
    audience: config.audience,
    language: config.language,
    timeLimitSeconds: 20,
    pressure: "time-limit",
    weakness: "Answer structure",
  };
}

export function generateImprovementDeltas(pressure: AttemptAnalysis, retry: AttemptAnalysis): DiagnosisMetricDelta[] {
  return [
    { label: "Structure", before: pressure.communication.structure, after: retry.communication.structure, unit: "%", direction: "down-is-bad" },
    { label: "Fillers", before: pressure.voice.fillerCount, after: retry.voice.fillerCount, unit: "count", direction: "up-is-bad" },
    { label: "Latency", before: pressure.voice.responseLatencySeconds, after: retry.voice.responseLatencySeconds, unit: "s", direction: "up-is-bad" },
    { label: "Coherence", before: pressure.communication.coherence, after: retry.communication.coherence, unit: "%", direction: "down-is-bad" },
  ];
}
