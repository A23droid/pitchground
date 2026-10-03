import type { AttemptAnalysis, DiagnosisMetricDelta, FailureDiagnosis, TargetedChallenge } from "@/lib/types";

/** Backend SignalBundle (0–1 fused) → UI AttemptAnalysis (0–100 nested). */
export function signalBundleToAttemptAnalysis(bundle: any, attemptId: string): AttemptAnalysis {
  const fused = bundle?.fused || {};
  const acoustic = bundle?.acoustic || {};
  const content = bundle?.content || {};
  const visual = bundle?.visual;
  const language = bundle?.language || {};

  const pct = (v: number | undefined, fallback = 0.5) => Math.round((v ?? fallback) * 100);

  const structure = pct(fused.structure);
  const fluency = pct(fused.fluency);
  const composure = pct(fused.composure);
  const presence = pct(fused.presence);
  const contentScore = pct(content.coverage ?? fused.content);
  const overall = Math.round((structure + fluency + composure + presence + contentScore) / 5);

  return {
    attemptId,
    content: {
      correctness: contentScore,
      relevance: pct(content.specificity, 0.6),
      topicUnderstanding: contentScore,
    },
    communication: {
      structure,
      clarity: fluency,
      coherence: structure,
      fluency,
    },
    voice: {
      speakingRateWpm: Math.round(acoustic.wpm ?? 120),
      fillerCount: Math.round(acoustic.filler_rate ?? 2),
      pauseCount: Math.round((acoustic.pause_ratio ?? 0.15) * 10),
      responseLatencySeconds: Number(((acoustic.pause_ratio ?? 0.15) * 2).toFixed(1)),
    },
    visual: {
      gaze: visual ? pct(1 - (visual.gaze_away ?? 0.1)) : 70,
      posture: visual ? pct(1 - (visual.head_down ?? 0.1)) : 70,
      engagement: visual ? pct(visual.gesture_energy ?? 0.4) : 65,
    },
    language: {
      primaryLanguage: language.primary === "hi" ? "Hindi" : language.primary === "mixed" ? "Mixed" : "English",
      codeSwitchingDetected: (language.code_switch_rate ?? 0) > 0.2,
      englishArticulation: pct(language.primary_ratio ?? fused.language_stability, 0.8),
    },
    overallScore: overall,
  };
}

export function mapDiagnosis(d: any): FailureDiagnosis {
  const condition = String(d?.condition || "ramble");
  const confMap: Record<string, number> = { low: 0.45, medium: 0.7, high: 0.9 };
  return {
    headline: condition.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    explanation: String(d?.rationale || "Pressure exposed a communication gap relative to baseline."),
    deltas: [],
    rootCause:
      condition === "language_instability"
        ? "language-transfer"
        : condition === "fluency_breakdown" || condition === "freeze"
          ? "pressure-structure-collapse"
          : "recovery-failure",
    confidence: confMap[String(d?.confidence || "medium")] ?? 0.7,
    occurrences: 1,
  };
}

export function challengeToUi(c: any, topic: string): TargetedChallenge {
  const spec = c?.training_spec || {};
  return {
    id: c?.id || `challenge-${Date.now()}`,
    objective: String(spec.objective || "Recover structure under time pressure"),
    framework: ["Definition", "Reason", "Example"],
    prompt: String(c?.prompt_text || `Retry explaining ${topic} in 20 seconds.`),
    timeLimitSeconds: Number(spec.time_limit_sec || 20),
    weaknessTargeted: String(spec.objective || "structure"),
  };
}

export function comparisonToDeltas(report: any): DiagnosisMetricDelta[] {
  const rows = Array.isArray(report?.rows) ? report.rows : [];
  return rows.map((r: any) => {
    const metric = String(r.metric || "");
    const lowerBetter = metric.includes("pause") || metric.includes("filler");
    const scale = metric.includes("fused") || metric.includes("content") || metric.includes("language") ? 100 : 1;
    return {
      label: metric.split(".").pop() || metric,
      before: Math.round(Number(r.a) * scale),
      after: Math.round(Number(r.b) * scale),
      unit: lowerBetter ? ("count" as const) : ("%" as const),
      direction: lowerBetter ? ("up-is-bad" as const) : ("down-is-bad" as const),
    };
  });
}
