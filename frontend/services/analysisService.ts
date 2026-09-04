import { delay } from "@/lib/utils";
import {
  generateBaselineAnalysis,
  generatePressureAnalysis,
  generateRetryAnalysis,
  generateDiagnosis,
  generateImprovementDeltas,
} from "@/mock/analysis";
import type { AttemptAnalysis, AttemptStage, DiagnosisMetricDelta, FailureDiagnosis } from "@/lib/types";

// Mirrors: POST /attempts/{id}/analyze
// The staged delays exist so the UI can render a believable multi-step
// "AI is working" sequence (see AnalyzingState). Keep each stage short.

export const ANALYSIS_STAGES = [
  "Analyzing speech...",
  "Analyzing communication...",
  "Checking content...",
] as const;

export async function analyzeAttempt(stage: AttemptStage): Promise<AttemptAnalysis> {
  await delay(900);
  if (stage === "baseline") return generateBaselineAnalysis();
  if (stage === "pressure") return generatePressureAnalysis();
  // "replay" is the retry attempt itself — the same pressure condition,
  // answered again after the targeted challenge.
  return generateRetryAnalysis();
}

export const DIAGNOSIS_STAGES = ["Identifying failure pattern...", "Generating targeted challenge..."] as const;

export async function diagnose(baseline: AttemptAnalysis, pressure: AttemptAnalysis): Promise<FailureDiagnosis> {
  await delay(1100);
  return generateDiagnosis(baseline, pressure);
}

export async function compareImprovement(
  pressure: AttemptAnalysis,
  retry: AttemptAnalysis,
): Promise<DiagnosisMetricDelta[]> {
  await delay(700);
  return generateImprovementDeltas(pressure, retry);
}
