import { delay } from "@/lib/utils";
import {
  DEBATE_TOPICS,
  getDebateScript,
  generateDebateAnalysis,
  generateDebateDiagnosis,
  generateDebateChallenge,
} from "@/mock/debate";
import type {
  DebateAnalysis,
  DebateConfig,
  DebateReport,
  DebateRoundData,
  DebateTopic,
  FailureDiagnosis,
  TargetedChallenge,
} from "@/lib/types";

export const DEBATE_ANALYSIS_STAGES = [
  "Evaluating opening premise and argumentation...",
  "Analyzing rebuttal precision against counter-argument...",
  "Measuring pressure composure and vocal conviction...",
  "Synthesizing debate diagnosis...",
] as const;

export async function getDebateTopics(): Promise<DebateTopic[]> {
  await delay(200);
  return DEBATE_TOPICS;
}

export async function generateAiOpponentTurn(
  topicId: string,
  config: DebateConfig,
): Promise<{ counterArgumentText: string }> {
  // Simulate AI opponent thinking & formulating counter-argument
  await delay(1200);
  const script = getDebateScript(topicId, config.language);
  return {
    counterArgumentText: script.aiCounter,
  };
}

export async function analyzeDebate(
  config: DebateConfig,
  rounds: DebateRoundData[],
): Promise<{
  analysis: DebateAnalysis;
  diagnosis: FailureDiagnosis;
  challenge: TargetedChallenge;
}> {
  await delay(1200);
  const analysis = generateDebateAnalysis(config);
  const diagnosis = generateDebateDiagnosis(analysis);
  const challenge = generateDebateChallenge(config);

  return {
    analysis,
    diagnosis,
    challenge,
  };
}
