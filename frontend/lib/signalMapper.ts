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

  // Compute camera stress level (0-100) based on freeze ratio, gaze instability, and vocal tremor
  const freezeRatio = visual?.freeze_ratio ?? 0.05;
  const gazeAway = visual?.gaze_away ?? 0.1;
  const energyVar = acoustic?.energy_var ?? 0.1;
  const stressRaw = (freezeRatio * 0.4 + gazeAway * 0.35 + Math.min(1.0, energyVar * 2) * 0.25) * 100;
  const stressScore = Math.min(100, Math.max(0, Math.round(stressRaw)));

  // Generate actionable improvement suggestions based on ML metrics
  const improvements: string[] = [];
  const wpm = acoustic.wpm ?? 120;
  const fillerRate = acoustic.filler_rate ?? 0;
  const pauseRatio = acoustic.pause_ratio ?? 0.15;

  if (fillerRate > 6) {
    improvements.push(`High conversational filler rate (${fillerRate.toFixed(1)}%). Practice substituting deliberate 1-second pauses instead of vocalizing 'um', 'uh', or 'basically'.`);
  } else if (fillerRate > 3) {
    improvements.push(`Moderate filler frequency detected (${fillerRate.toFixed(1)}%). Aim to speak in concise, single-idea sentences.`);
  }

  if (wpm > 165) {
    improvements.push(`Speaking pace is fast (${Math.round(wpm)} WPM). Modulate your delivery closer to 130–150 WPM to project control.`);
  } else if (wpm < 105) {
    improvements.push(`Cadence is measured (${Math.round(wpm)} WPM). Slightly increase pacing to convey energy and enthusiasm.`);
  }

  if (pauseRatio > 0.28) {
    improvements.push(`Elevated hesitation pauses (${Math.round(pauseRatio * 100)}% of time). Pre-structuring responses with the STAR or PREP framework reduces searching for words.`);
  }

  if (visual) {
    if (gazeAway > 0.25) {
      improvements.push("Camera gaze shifted frequently. Center your focus on the camera lens to project direct conviction.");
    }
    if ((visual.head_down ?? 0) > 0.25) {
      improvements.push("Head tilt angle drifted downward. Keep your posture aligned with the frame.");
    }
    if ((visual.gesture_energy ?? 0.4) < 0.2) {
      improvements.push("Body posture was rigid. Natural, open hand gestures help emphasize key architectural trade-offs.");
    }
  }

  if (content.coverage !== undefined && content.coverage < 0.6) {
    improvements.push("Some core prompt key points were omitted. Be sure to explicitly name fundamental concepts and architectural implications.");
  }

  if (improvements.length === 0) {
    improvements.push("Strong, well-structured delivery! Maintain this balanced cadence and posture in subsequent rounds.");
  }

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
      speakingRateWpm: Math.round(wpm),
      fillerCount: Math.round(acoustic.filler_rate ?? 2),
      fillerRatePercent: Number(fillerRate.toFixed(1)),
      pauseCount: Math.round(pauseRatio * 10),
      pauseRatioPercent: Math.round(pauseRatio * 100),
      responseLatencySeconds: Number((pauseRatio * 2).toFixed(1)),
    },
    visual: {
      gaze: visual ? pct(1 - (visual.gaze_away ?? 0.1)) : 75,
      posture: visual ? pct(1 - (visual.head_down ?? 0.1)) : 75,
      engagement: visual ? pct(visual.gesture_energy ?? 0.4) : 70,
      stressScore,
      eyeContactScore: visual ? pct(1 - (visual.gaze_away ?? 0.1)) : 75,
      handGestureScore: visual ? pct(visual.gesture_energy ?? 0.4) : 70,
    },
    language: {
      primaryLanguage: language.primary === "hi" ? "Hindi" : language.primary === "mixed" ? "Mixed" : "English",
      codeSwitchingDetected: (language.code_switch_rate ?? 0) > 0.2,
      englishArticulation: pct(language.primary_ratio ?? fused.language_stability, 0.8),
    },
    overallScore: overall,
    improvements,
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
