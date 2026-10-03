import { delay } from "@/lib/utils";
import { mockLearnerProfile } from "@/mock/learner";
import { getStoredSessions, saveSessionToHistory } from "@/mock/sessions";
import { getAuth } from "@/lib/auth";
import { authJson, getToken } from "@/lib/api";
import type { LearnerProfile, RecentSessionSummary, TrainingMode } from "@/lib/types";

const STORAGE_KEY = "pitchground_completed_session_v1";

export interface CompletedDemoSession {
  topic: string;
  overallScoreBefore: number;
  overallScoreAfter: number;
  structureBefore: number;
  structureAfter: number;
}

export async function getLearnerProfile(): Promise<LearnerProfile> {
  const auth = getAuth();
  if (getToken() && auth?.learnerId) {
    try {
      const profile = await authJson<any>(`/v1/learners/${auth.learnerId}/profile`);
      return {
        ...mockLearnerProfile,
        name: profile.display_name || auth.name || mockLearnerProfile.name,
        sessionsCompleted: Array.isArray(profile.recent_sessions)
          ? profile.recent_sessions.length
          : mockLearnerProfile.sessionsCompleted,
      };
    } catch {
      /* fall through to mock */
    }
  }

  await delay(350);
  const completed = readCompletedSession();
  const name = auth?.name || mockLearnerProfile.name;
  const sessions = getStoredSessions();
  const extraCount = sessions.filter((s) => s.date === "Just now" || s.date.includes("Today")).length;

  return {
    ...mockLearnerProfile,
    name,
    sessionsCompleted: mockLearnerProfile.sessionsCompleted + (completed ? 1 : 0) + extraCount,
  };
}

export async function getRecentSessions(): Promise<RecentSessionSummary[]> {
  const auth = getAuth();
  if (getToken() && auth?.learnerId) {
    try {
      const profile = await authJson<any>(`/v1/learners/${auth.learnerId}/profile`);
      const recent = Array.isArray(profile.recent_sessions) ? profile.recent_sessions : [];
      if (recent.length) {
        return recent.map((s: any) => ({
          id: s.id,
          topic: s.topic || "Interview",
          mode: "interview" as const,
          date: s.created_at ? new Date(s.created_at).toLocaleDateString() : "Recent",
          overallScore: 70,
          scoreDelta: 0,
          primaryWeakness: s.phase === "completed" ? "Completed" : s.phase,
          status: s.phase === "completed" ? ("completed" as const) : ("in-progress" as const),
        }));
      }
    } catch {
      /* fall through */
    }
  }

  await delay(350);
  const stored = getStoredSessions();
  const completed = readCompletedSession();
  if (!completed) return stored;

  const legacySession: RecentSessionSummary = {
    id: `session-live-${Date.now()}`,
    topic: completed.topic,
    mode: "interview",
    date: "Just now",
    overallScore: completed.overallScoreAfter,
    scoreDelta: completed.overallScoreAfter - completed.overallScoreBefore,
    primaryWeakness: "Structure under time pressure",
    status: "completed",
  };

  const exists = stored.some((s) => s.topic === legacySession.topic && s.date === "Just now");
  return exists ? stored : [legacySession, ...stored];
}

export function saveCompletedSession(data: CompletedDemoSession) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  saveSessionToHistory({
    topic: `Interview: ${data.topic}`,
    mode: "interview",
    overallScore: data.overallScoreAfter,
    scoreDelta: data.overallScoreAfter - data.overallScoreBefore,
    primaryWeakness: "Structure under time pressure",
    status: "completed",
    date: "Just now",
  });
}

export async function saveGenericSession(session: {
  topic: string;
  mode: TrainingMode;
  overallScore: number;
  scoreDelta: number;
  primaryWeakness: string;
  sessionId?: string;
  audience?: string;
  language?: string;
  difficulty?: string;
  diagnosis?: any;
  transcript?: string;
  metrics?: any;
}) {
  saveSessionToHistory({
    ...session,
    date: "Just now",
    status: "completed",
  });

  if (getToken()) {
    try {
      if (session.sessionId) {
        await authJson(`/v1/sessions/${session.sessionId}/complete`, {
          method: "POST",
          body: JSON.stringify({
            phase: "completed",
            diagnosis: session.diagnosis || { condition: session.primaryWeakness },
            transcript: session.transcript,
            metrics: session.metrics,
          }),
        });
      } else {
        const created = await authJson<any>("/v1/sessions", {
          method: "POST",
          body: JSON.stringify({
            mode: session.mode,
            topic: session.topic,
            audience: session.audience || "",
            language: session.language || "English",
            difficulty: session.difficulty || "Standard",
          }),
        });
        if (created?.id) {
          await authJson(`/v1/sessions/${created.id}/complete`, {
            method: "POST",
            body: JSON.stringify({
              phase: "completed",
              diagnosis: session.diagnosis || { condition: session.primaryWeakness },
              transcript: session.transcript,
              metrics: session.metrics,
            }),
          });
        }
      }
    } catch (err) {
      console.warn("Could not record generic session to backend:", err);
    }
  }
}


export function readCompletedSession(): CompletedDemoSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CompletedDemoSession;
  } catch {
    return null;
  }
}

export function clearCompletedSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
