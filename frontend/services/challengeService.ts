import { delay } from "@/lib/utils";
import { generateChallenge, generateReplayConditions } from "@/mock/analysis";
import { buildReplayQuestion } from "@/mock/questions";
import type { ScenarioConfig, RoundQuestion, TargetedChallenge, ReplayConditions } from "@/lib/types";
import { challengeToUi } from "@/lib/signalMapper";
import { getChallenge, getSession, questionFromAction } from "@/services/sessionService";

/** Mock path for non-interview modes. */
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

export async function fetchSessionChallenge(sessionId: string, topic: string): Promise<TargetedChallenge> {
  const c = await getChallenge(sessionId);
  return challengeToUi(c, topic);
}

export async function replayFromSession(
  sessionId: string,
  config: ScenarioConfig,
): Promise<{ conditions: ReplayConditions; question: RoundQuestion }> {
  const session = await getSession(sessionId);
  const action = session.current_action || {};
  const question = questionFromAction(action, "replay");
  const challenge = session.latest_challenge || (await getChallenge(sessionId).catch(() => null));
  const conditions: ReplayConditions = {
    topic: session.topic || config.topic,
    audience: (session.audience as ReplayConditions["audience"]) || config.audience,
    language: (session.language as ReplayConditions["language"]) || config.language,
    timeLimitSeconds: action?.pressure_spec?.time_limit_sec || challenge?.training_spec?.time_limit_sec || 20,
    pressure: "time-limit",
    weakness: String(challenge?.training_spec?.objective || challenge?.condition || "structure under pressure"),
  };
  return { conditions, question };
}
