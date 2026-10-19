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

import { authFetch } from "@/lib/api";

export async function generateAiOpponentTurn(
  topicId: string,
  config: DebateConfig,
  turn: number = 1,
  userTranscript: string = "",
): Promise<{ counterArgumentText: string }> {
  try {
    const res = await authFetch("/v1/debate/counter", {
      method: "POST",
      body: JSON.stringify({
        topic: config.topic.title,
        user_position: config.position,
        language: config.language,
        difficulty: config.difficulty,
        user_transcript: userTranscript,
        turn,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.counter_argument) {
        return { counterArgumentText: data.counter_argument };
      }
    }
  } catch (err) {
    console.warn("Dynamic debate counter API error:", err);
  }

  // Dynamic fallback based on topic and language
  const script = getDebateScript(topicId, config.language);
  return {
    counterArgumentText: turn === 1 ? script.aiCounter : script.aiCounter2,
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
  const analysis = generateDebateAnalysis(config, rounds);
  const diagnosis = generateDebateDiagnosis(analysis);
  const challenge = generateDebateChallenge(config);

  return {
    analysis,
    diagnosis,
    challenge,
  };
}
