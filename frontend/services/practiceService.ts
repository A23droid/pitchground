import { authJson } from "@/lib/api";
import { createAttempt, uploadAttemptMedia, completeAttempt, waitForAttemptComplete, waitForAttemptTranscript } from "@/services/sessionService";
import type { RecordingSubmitPayload } from "@/components/interview/RecordingPanel";
import type { FailureDiagnosis, TargetedChallenge } from "@/lib/types";

const uploads=new WeakMap<Blob,Map<string,{id:string;uploaded:boolean}>>();

export async function analyzeRecording(sessionId: string, role: string, payload: RecordingSubmitPayload,
                                       language?: string, prompt?: string, interruptionSec?: number, transcriptOnly = false) {
  if (!payload.audioBlob || payload.audioBlob.size < 200) throw new Error("Record a spoken answer first.");
  const key=`${sessionId}:${role}`;
  let cached=uploads.get(payload.audioBlob);
  if (!cached) { cached=new Map();uploads.set(payload.audioBlob,cached); }
  let attempt=cached.get(key);
  if (!attempt) {
    const created=await createAttempt(sessionId,role,{language,prompt,interruption_sec:interruptionSec});
    attempt={id:created.id,uploaded:false};cached.set(key,attempt);
  }
  if (!attempt.uploaded) {
    await uploadAttemptMedia(sessionId,attempt.id,payload.audioBlob,payload.videoBlob);
    attempt.uploaded=true;
  }
  await completeAttempt(sessionId,attempt.id);
  return transcriptOnly ? waitForAttemptTranscript(sessionId,attempt.id) : waitForAttemptComplete(sessionId,attempt.id,600000);
}

export function getPracticeReport<T>(sessionId: string) {
  return authJson<{ analysis: T; diagnosis: FailureDiagnosis; challenge: TargetedChallenge }>(`/v1/sessions/${sessionId}/report`);
}

export const languageCode = (language: string) => ({ English: "en", Hindi: "hi", Malayalam: "ml", Mixed: "auto" }[language] || "auto");
