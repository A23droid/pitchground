import { getAuth } from "@/lib/auth";
import { authJson } from "@/lib/api";
import type { LearnerProfile, RecentSessionSummary, TrainingMode } from "@/lib/types";

type BackendProfile = {
  language_comparison: LearnerProfile["languageComparison"];
  language_scores: { language: string; score: number }[];
  pressure_drops: number[];
  display_name: string; sessions_completed: number; streak_days: number;
  dimensions: { id: string; score: number; n: number; trend: LearnerProfile["weaknesses"][number]["trend"] }[];
  progress: LearnerProfile["progress"];
  recent_sessions: { id: string; topic: string; mode: TrainingMode; phase: string; created_at: string;
    overall_score: number | null; score_delta: number | null; primary_weakness: string | null }[];
};

const pendingProfiles=new Map<string,Promise<BackendProfile>>();
function loadProfile(): Promise<BackendProfile> {
  const id=getAuth()?.learnerId;
  if (!id) return Promise.reject(new Error("Your session is incomplete. Sign in again."));
  const pending=pendingProfiles.get(id);
  if (pending) return pending;
  const request=authJson<BackendProfile>(`/v1/learners/${id}/profile`).finally(()=>pendingProfiles.delete(id));
  pendingProfiles.set(id,request);
  return request;
}
const title = (id: string) => id.replace(/_/g, " ").replace(/\b\w/g, (v) => v.toUpperCase());
export async function getLearnerProfile(): Promise<LearnerProfile> {
  const p = await loadProfile();
  const measured = p.dimensions.filter((d) => d.n > 0 && Number.isFinite(d.score));
  const weakest = [...measured].sort((a,b) => a.score-b.score)[0];
  return {
    name: p.display_name, sessionsCompleted: p.sessions_completed, streakDays: p.streak_days,
    strengths: measured.filter((d) => d.score >= 75).map((d) => ({ id: d.id, label: title(d.id),
      description: `${Math.round(d.score)}/100 across ${d.n} analyzed responses.` })),
    weaknesses: measured.filter((d) => d.score < 75).map((d) => ({ id: d.id, label: title(d.id),
      severity: d.score < 50 ? "high" : "medium", trend: d.trend,
      description: `${Math.round(d.score)}/100 across ${d.n} analyzed responses. Trend is calculated only when comparable recorded history is sufficient.` })),
    pressurePatterns: p.pressure_drops.length ? [{ type: "Time pressure", impact: p.pressure_drops.reduce((a,b)=>a+b,0)/p.pressure_drops.length>20 ? "High impact" : "Low impact", note: `Average measured fluency change: ${Math.round(-p.pressure_drops.reduce((a,b)=>a+b,0)/p.pressure_drops.length)} points across ${p.pressure_drops.length} paired sessions.` }] : [],
    languagePatterns: p.language_scores.map((s) => ({ language: ({ en: "English", hi: "Hindi", ml: "Malayalam", auto: "Mixed" }[s.language] || s.language) as LearnerProfile["languagePatterns"][number]["language"], level: s.score>=75 ? "Strong" : s.score>=50 ? "Developing" : "Needs work" })),
    languageComparison: p.language_comparison, progress: p.progress,
    recommendedNext: weakest ? { title: `Practice ${title(weakest.id)}`, weakness: title(weakest.id),
      reason: `${title(weakest.id)} has your lowest measured average (${Math.round(weakest.score)}/100).` }
      : { title: "Start your first practice", weakness: "", reason: "Complete a recorded session to receive a recommendation based on your performance." },
  };
}
export async function getRecentSessions(): Promise<RecentSessionSummary[]> {
  const p = await loadProfile();
  return p.recent_sessions.map((s) => ({ id: s.id, topic: s.topic, mode: s.mode,
    date: new Date(s.created_at).toLocaleDateString(), overallScore: s.overall_score,
    scoreDelta: s.score_delta, primaryWeakness: s.primary_weakness || "No diagnosis yet",
    status: s.phase === "completed" ? "completed" : "in-progress" }));
}
export async function saveGenericSession(session: {
  topic: string; mode: TrainingMode; overallScore: number; scoreDelta: number; primaryWeakness: string;
  sessionId?: string; audience?: string; language?: string; difficulty?: string;
  diagnosis?: unknown; transcript?: string; metrics?: unknown;
}) {
  if (!session.sessionId) throw new Error("A recorded session is required.");
  await authJson(`/v1/sessions/${session.sessionId}/complete`, { method: "POST", body: JSON.stringify({}) });
}
