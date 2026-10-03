import type { AttemptAnalysis, AttemptStage, DiagnosisMetricDelta, FailureDiagnosis } from "@/lib/types";
import {
  generateBaselineAnalysis,
  generatePressureAnalysis,
  generateRetryAnalysis,
  generateDiagnosis,
  generateImprovementDeltas,
} from "@/mock/analysis";
import { delay } from "@/lib/utils";
import {
  completeAttempt,
  getAttempt,
  uploadAttemptMedia,
  waitForAttemptComplete,
} from "@/services/sessionService";
import { signalBundleToAttemptAnalysis, mapDiagnosis, comparisonToDeltas } from "@/lib/signalMapper";
import { getComparison, getDiagnosis } from "@/services/sessionService";

export const ANALYSIS_STAGES = [
  "Analyzing speech...",
  "Analyzing communication...",
  "Checking content...",
] as const;

export const DIAGNOSIS_STAGES = ["Identifying failure pattern...", "Generating targeted challenge..."] as const;

/** Legacy mock path (debate / impromptu fallback). */
export async function analyzeAttempt(stage: AttemptStage): Promise<AttemptAnalysis> {
  await delay(900);
  if (stage === "baseline") return generateBaselineAnalysis();
  if (stage === "pressure") return generatePressureAnalysis();
  return generateRetryAnalysis();
}

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

/** Interview path: upload + complete + wait + map SignalBundle. */
export async function analyzeInterviewAttempt(opts: {
  sessionId: string;
  attemptId: string;
  audioBlob: Blob;
  videoBlob?: Blob | null;
}): Promise<AttemptAnalysis> {
  await uploadAttemptMedia(opts.sessionId, opts.attemptId, opts.audioBlob, opts.videoBlob);
  await completeAttempt(opts.sessionId, opts.attemptId);
  const attempt = await waitForAttemptComplete(opts.sessionId, opts.attemptId);
  return signalBundleToAttemptAnalysis(attempt.metrics, opts.attemptId);
}

export async function fetchSessionDiagnosis(sessionId: string): Promise<FailureDiagnosis> {
  const d = await getDiagnosis(sessionId);
  return mapDiagnosis(d);
}

export async function fetchSessionComparison(sessionId: string): Promise<DiagnosisMetricDelta[]> {
  const c = await getComparison(sessionId);
  return comparisonToDeltas(c);
}
