import { delay } from "@/lib/utils";
import type { InterviewSession, ScenarioConfig } from "@/lib/types";

// Mirrors: POST /sessions, GET /sessions/{id}
// Swap the body of these functions for real fetch() calls once the FastAPI
// backend exists — callers never need to change.

let sessionCounter = 0;

export async function createSession(config: ScenarioConfig): Promise<InterviewSession> {
  await delay(500);
  sessionCounter += 1;
  return {
    id: `session-${sessionCounter}-${Date.now()}`,
    config,
    attempts: [],
    status: "in-progress",
    createdAt: new Date().toISOString(),
  };
}

export async function completeSession(session: InterviewSession): Promise<InterviewSession> {
  await delay(300);
  return { ...session, status: "completed" };
}
