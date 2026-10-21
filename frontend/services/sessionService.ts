import { authJson, authFetch } from "@/lib/api";
import type { ScenarioConfig } from "@/lib/types";

export interface BackendSession {
  id: string;
  learner_id: string;
  mode?: string;
  phase: string;
  topic: string;
  audience?: string;
  language?: string;
  difficulty?: string;
  current_action: any;
  latest_diagnosis: any;
  latest_challenge: any;
  latest_comparison: any;
  created_at?: string;
  updated_at?: string;
}

export interface BackendAttempt {
  id: string;
  session_id: string;
  role: string;
  prompt: string;
  pressure_spec: any;
}

export interface CreateSessionParams {
  mode?: "interview" | "debate" | "impromptu" | "language-diagnostic" | "recovery-training";
  topic: string;
  audience?: string;
  language?: string;
  difficulty?: string;
  policy?: Record<string, any>;
}

export async function createSession(
  config: ScenarioConfig | CreateSessionParams,
): Promise<BackendSession> {
  const mode = "mode" in config && config.mode ? config.mode : "interview";
  return authJson<BackendSession>("/v1/sessions", {
    method: "POST",
    body: JSON.stringify({
      mode,
      topic: config.topic,
      audience: config.audience || "",
      language: config.language || "English",
      difficulty: config.difficulty || "Standard",
      policy: "policy" in config ? config.policy : undefined,
    }),
  });
}

export async function completeSession(
  sessionId: string,
  data?: {
    phase?: string;
    diagnosis?: any;
    transcript?: string;
    metrics?: any;
  },
): Promise<BackendSession> {
  return authJson<BackendSession>(`/v1/sessions/${sessionId}/complete`, {
    method: "POST",
    body: JSON.stringify(data || { phase: "completed" }),
  });
}

export async function getSession(sessionId: string): Promise<BackendSession> {
  return authJson<BackendSession>(`/v1/sessions/${sessionId}`);
}

export async function advanceSession(sessionId: string, fromPhase: string): Promise<BackendSession> {
  return authJson<BackendSession>(`/v1/sessions/${sessionId}/advance`, {
    method: "POST",
    body: JSON.stringify({ from_phase: fromPhase }),
  });
}

export async function createAttempt(
  sessionId: string,
  role: "baseline" | "pressure" | "retry" | string,
  options?: { language?: string; prompt?: string; interruption_sec?: number },
): Promise<BackendAttempt> {
  return authJson<BackendAttempt>(`/v1/sessions/${sessionId}/attempts`, {
    method: "POST",
    body: JSON.stringify({ role, ...options }),
  });
}

export async function uploadAttemptMedia(
  sessionId: string,
  attemptId: string,
  audioBlob: Blob,
  videoBlob?: Blob | null,
): Promise<void> {
  const body = new FormData();
  body.append("audio", new File([audioBlob], "audio.webm", { type: audioBlob.type || "audio/webm" }));
  if (videoBlob && videoBlob.size > 0) {
    body.append("video", new File([videoBlob], "video.webm", { type: videoBlob.type || "video/webm" }));
  }
  const res = await authFetch(`/v1/sessions/${sessionId}/attempts/${attemptId}/media`, {
    method: "POST",
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Media upload failed");
  }
}

export async function completeAttempt(sessionId: string, attemptId: string): Promise<void> {
  await authJson(`/v1/sessions/${sessionId}/attempts/${attemptId}/complete`, { method: "POST" });
}

export async function getAttempt(sessionId: string, attemptId: string): Promise<any> {
  return authJson(`/v1/sessions/${sessionId}/attempts/${attemptId}`);
}

export async function waitForPhase(
  sessionId: string,
  phases: string[],
  timeoutMs = 90000,
): Promise<BackendSession> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const session = await getSession(sessionId);
    if (phases.includes(session.phase)) return session;
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`Timed out waiting for phases: ${phases.join(", ")}`);
}

export async function waitForAttemptComplete(
  sessionId: string,
  attemptId: string,
  timeoutMs = 1800000,
): Promise<any> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const attempt = await getAttempt(sessionId, attemptId);
    if (attempt.analysis_status === "complete" && attempt.metrics) return attempt;
    if (attempt.analysis_status === "failed") throw new Error(attempt.analysis_error?.message ? `${attempt.analysis_error.message}${attempt.analysis_error.retry_after ? ` Retry in ${attempt.analysis_error.retry_after}s.` : ""}` : "Analysis failed. Please retry.");
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error("Timed out waiting for analysis");
}

export async function waitForAttemptTranscript(sessionId: string, attemptId: string, timeoutMs = 1800000): Promise<any> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const attempt = await getAttempt(sessionId, attemptId);
    if (attempt.transcript_validated && attempt.transcript?.text?.trim()) return attempt;
    if (attempt.analysis_status === "failed") throw new Error(attempt.analysis_error?.message || "Transcription failed. Retry this recording.");
    await new Promise(r => setTimeout(r, 2000));
  }
  throw new Error("Transcription is taking too long. Retry this recording.");
}

export async function getDiagnosis(sessionId: string): Promise<any> {
  return authJson(`/v1/sessions/${sessionId}/diagnosis`);
}

export async function getChallenge(sessionId: string): Promise<any> {
  return authJson(`/v1/sessions/${sessionId}/challenge`);
}

export async function getComparison(sessionId: string): Promise<any> {
  return authJson(`/v1/sessions/${sessionId}/comparison`);
}

export function questionFromAction(action: any, round: "baseline" | "pressure" | "replay" | "retry") {
  const prompt = action?.question_spec?.prompt_text;
  if (typeof prompt !== "string" || !prompt.trim()) throw new Error("The question is not ready. Please retry.");
  const timeLimit = action?.pressure_spec?.time_limit_sec;
  return {
    id: `q-${round}-${Date.now()}`,
    prompt,
    round,
    pressure: timeLimit ? ("time-limit" as const) : ("none" as const),
    timeLimitSeconds: timeLimit || undefined,
  };
}
