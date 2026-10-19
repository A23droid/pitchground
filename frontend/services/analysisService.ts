import type { AttemptAnalysis, AttemptStage, DiagnosisMetricDelta, FailureDiagnosis } from "@/lib/types";
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

/** Interview path: upload + complete + wait + map SignalBundle. */
export async function analyzeInterviewAttempt(opts: {
  sessionId: string;
  attemptId: string;
  audioBlob: Blob;
  videoBlob?: Blob | null;
  alreadyUploaded?: boolean;
  onUploaded?: () => void;
}): Promise<AttemptAnalysis> {
  if (!opts.alreadyUploaded) {
    await uploadAttemptMedia(opts.sessionId, opts.attemptId, opts.audioBlob, opts.videoBlob);
    opts.onUploaded?.();
  }
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
