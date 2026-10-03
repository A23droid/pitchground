import { delay } from "@/lib/utils";
import {
  IMPROMPTU_TOPICS,
  getImpromptuTranscript,
  generateImpromptuAnalysis,
  generateImpromptuDiagnosis,
  generateImpromptuChallenge,
} from "@/mock/impromptu";
import type {
  FailureDiagnosis,
  ImpromptuAnalysis,
  ImpromptuConfig,
  ImpromptuTopic,
  TargetedChallenge,
} from "@/lib/types";

export const IMPROMPTU_ANALYSIS_STAGES = [
  "Mapping speaking rate and pacing timeline...",
  "Detecting circular repetitions and lexical decay...",
  "Analyzing spontaneous structural coherence...",
  "Formulating targeted pacing diagnosis...",
] as const;

export async function getImpromptuTopics(): Promise<ImpromptuTopic[]> {
  await delay(200);
  return IMPROMPTU_TOPICS;
}

export function getRandomImpromptuTopic(excludeId?: string): ImpromptuTopic {
  const filtered = excludeId ? IMPROMPTU_TOPICS.filter((t) => t.id !== excludeId) : IMPROMPTU_TOPICS;
  const randomIndex = Math.floor(Math.random() * filtered.length);
  return filtered[randomIndex] ?? IMPROMPTU_TOPICS[0];
}

export async function analyzeImpromptu(
  config: ImpromptuConfig,
  transcript: string,
): Promise<{
  analysis: ImpromptuAnalysis;
  diagnosis: FailureDiagnosis;
  challenge: TargetedChallenge;
}> {
  await delay(1100);
  const analysis = generateImpromptuAnalysis(config);
  const diagnosis = generateImpromptuDiagnosis(analysis);
  const challenge = generateImpromptuChallenge(config);

  return {
    analysis,
    diagnosis,
    challenge,
  };
}
