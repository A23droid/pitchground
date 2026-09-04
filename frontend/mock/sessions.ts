import type { RecentSessionSummary, TrainingMode } from "@/lib/types";

const SESSIONS_STORAGE_KEY = "pitchground_sessions_history_v2";

export const DEFAULT_RECENT_SESSIONS: RecentSessionSummary[] = [
  {
    id: "sess-debate-201",
    topic: "Debate: AI Code Generation in Production",
    mode: "debate",
    date: "Today, 11:20 AM",
    overallScore: 66,
    scoreDelta: 18,
    primaryWeakness: "Rebuttal under counter-pressure",
    status: "completed",
  },
  {
    id: "sess-impromptu-202",
    topic: "Impromptu: Distributed System Traffic Metaphor",
    mode: "impromptu",
    date: "Yesterday, 4:15 PM",
    overallScore: 67,
    scoreDelta: 12,
    primaryWeakness: "Lexical repetition after 30s",
    status: "completed",
  },
  {
    id: "sess-interview-104",
    topic: "Interview: Database Systems — Indexing",
    mode: "interview",
    date: "Aug 27",
    overallScore: 74,
    scoreDelta: 23,
    primaryWeakness: "Structure under time pressure",
    status: "completed",
  },
  {
    id: "sess-interview-103",
    topic: "Interview: Operating Systems — Deadlocks",
    mode: "interview",
    date: "Aug 23",
    overallScore: 71,
    scoreDelta: 9,
    primaryWeakness: "Filler words",
    status: "completed",
  },
  {
    id: "sess-language-102",
    topic: "Language: Malayalam vs English Articulation",
    mode: "language-diagnostic",
    date: "Aug 19",
    overallScore: 78,
    scoreDelta: 14,
    primaryWeakness: "English articulation latency",
    status: "completed",
  },
];

export function getStoredSessions(): RecentSessionSummary[] {
  if (typeof window === "undefined") return DEFAULT_RECENT_SESSIONS;
  try {
    const raw = window.localStorage.getItem(SESSIONS_STORAGE_KEY);
    if (!raw) return DEFAULT_RECENT_SESSIONS;
    const parsed = JSON.parse(raw) as RecentSessionSummary[];
    return parsed.length > 0 ? parsed : DEFAULT_RECENT_SESSIONS;
  } catch {
    return DEFAULT_RECENT_SESSIONS;
  }
}

export function saveSessionToHistory(session: Omit<RecentSessionSummary, "id" | "date"> & { date?: string }) {
  if (typeof window === "undefined") return;
  const current = getStoredSessions();
  const newEntry: RecentSessionSummary = {
    id: `sess-${Date.now()}`,
    date: session.date || "Just now",
    ...session,
  };
  const updated = [newEntry, ...current.filter((s) => s.id !== newEntry.id)].slice(0, 15);
  window.localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(updated));
}

export function clearStoredSessions() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSIONS_STORAGE_KEY);
}
