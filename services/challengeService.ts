import { delay } from "@/lib/utils";
import { generateChallenge, generateReplayConditions } from "@/mock/analysis";
import { buildReplayQuestion } from "@/mock/questions";
import type { ScenarioConfig, RoundQuestion } from "@/lib/types";

// Mirrors: POST /challenges, POST /replays

export async function requestChallenge(config: ScenarioConfig) {
  await delay(600);
  return generateChallenge(config);
}

export async function requestReplay(config: ScenarioConfig): Promise<{
  conditions: ReturnType<typeof generateReplayConditions>;
  question: RoundQuestion;
}> {
  await delay(500);
  return {
    conditions: generateReplayConditions(config),
    question: buildReplayQuestion(config.topic),
  };
}
