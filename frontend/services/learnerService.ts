import { delay } from "@/lib/utils";
import { mockLearnerProfile } from "@/mock/learner";
import { getStoredSessions, saveSessionToHistory } from "@/mock/sessions";
import { getAuth } from "@/lib/auth";
import type { LearnerProfile, RecentSessionSummary, TrainingMode } from "@/lib/types";

// Mirrors: GET /learner/profile, GET /learner/progress

const STORAGE_KEY = "pitchground_completed_session_v1";

export interface CompletedDemoSession {
  topic: string;
  overallScoreBefore: number;
  overallScoreAfter: number;
  structureBefore: number;
  structureAfter: number;
}

export async function getLearnerProfile(): Promise<LearnerProfile> {
  await delay(350);
  const completed = readCompletedSession();
  const auth = getAuth();
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

export function saveGenericSession(session: {
  topic: string;
  mode: TrainingMode;
  overallScore: number;
  scoreDelta: number;
  primaryWeakness: string;
}) {
  saveSessionToHistory({
    ...session,
    date: "Just now",
    status: "completed",
  });
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

