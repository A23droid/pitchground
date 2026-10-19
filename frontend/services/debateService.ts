import { authJson } from "@/lib/api";
import type { DebateConfig } from "@/lib/types";
export const DEBATE_ANALYSIS_STAGES = ["Analyzing recorded arguments...", "Reviewing your answer...", "Preparing coaching..."] as const;
const pendingTurns = new Map<string, Promise<{counterArgumentText:string;language:string}>>();
export function generateAiOpponentTurn(topicId: string, config: DebateConfig, turn = 1, userTranscript = "", history: {speaker:"user"|"opponent";text:string}[] = [], spokenLanguage?: string) {
  const body=JSON.stringify({ topic: config.topic.title, user_position: config.position, language: config.language, difficulty: config.difficulty, user_transcript: userTranscript, spoken_language: spokenLanguage, turn, history });
  const key=`${topicId}:${body}`;
  const pending=pendingTurns.get(key);
  if (pending) return pending;
  const request=authJson<{ counter_argument: string; language: string }>("/v1/debate/counter", { method: "POST", body })
    .then(data=>{
      if (!data.counter_argument?.trim()) throw new Error("Opponent generation unavailable. Retry this turn.");
      return {counterArgumentText:data.counter_argument,language:data.language};
    }).finally(()=>pendingTurns.delete(key));
  pendingTurns.set(key,request);
  return request;
}
