import type { LearnerProfile, RecentSessionSummary } from "@/lib/types";

export const mockLearnerProfile: LearnerProfile = {
  name: "Aravind",
  sessionsCompleted: 12,
  streakDays: 4,
  strengths: [
    {
      id: "str-1",
      label: "Technical understanding",
      description: "Consistently correct and relevant across topics, even under pressure.",
    },
    {
      id: "str-2",
      label: "Baseline fluency",
      description: "Speaks clearly and at a steady pace when there's no time constraint.",
    },
    {
      id: "str-3",
      label: "Relevance",
      description: "Answers stay on-topic and rarely drift from the question asked.",
    },
  ],
  weaknesses: [
    {
      id: "weak-1",
      label: "Structure under time pressure",
      severity: "high",
      trend: "improving",
      description: "Answer structure collapses when given less than 30 seconds to respond.",
    },
    {
      id: "weak-2",
      label: "Filler words",
      severity: "medium",
      trend: "improving",
      description: "Filler rate more than doubles once a timer appears on screen.",
    },
    {
      id: "weak-3",
      label: "English articulation",
      severity: "medium",
      trend: "stable",
      description: "Technical concepts are strong in Malayalam but articulation slows in English.",
    },
  ],
  pressurePatterns: [
    { type: "Time pressure", impact: "High impact", note: "Structure drops ~30% on average under a 20s limit." },
    { type: "Interruption", impact: "Low impact", note: "Recovers within one sentence when interrupted." },
  ],
  languagePatterns: [
    { language: "Malayalam", level: "Strong" },
    { language: "English", level: "Developing" },
    { language: "Mixed", level: "Strong" },
  ],
  progress: [
    { sessionLabel: "S1", date: "Aug 3", structure: 58, fillers: 22, englishArticulation: 61 },
    { sessionLabel: "S2", date: "Aug 7", structure: 61, fillers: 20, englishArticulation: 63 },
    { sessionLabel: "S3", date: "Aug 11", structure: 64, fillers: 17, englishArticulation: 65 },
    { sessionLabel: "S4", date: "Aug 15", structure: 68, fillers: 15, englishArticulation: 68 },
    { sessionLabel: "S5", date: "Aug 19", structure: 71, fillers: 12, englishArticulation: 70 },
    { sessionLabel: "S6", date: "Aug 23", structure: 74, fillers: 9, englishArticulation: 73 },
    { sessionLabel: "S7", date: "Aug 27", structure: 78, fillers: 8, englishArticulation: 75 },
  ],
  recommendedNext: {
    title: "Structure technical answers under 20-second pressure",
    reason: "Your last 3 sessions show structure collapsing fastest when the timer drops below 30 seconds.",
    weakness: "Structure under time pressure",
  },
};

export const mockRecentSessions: RecentSessionSummary[] = [
  {
    id: "sess-104",
    topic: "Database Systems: Indexing",
    date: "Today, 9:40 AM",
    overallScore: 74,
    scoreDelta: 23,
    primaryWeakness: "Structure under time pressure",
    status: "completed",
  },
  {
    id: "sess-103",
    topic: "Operating Systems: Deadlocks",
    date: "Aug 23",
    overallScore: 71,
    scoreDelta: 9,
    primaryWeakness: "Filler words",
    status: "completed",
  },
  {
    id: "sess-102",
    topic: "System Design: Caching",
    date: "Aug 19",
    overallScore: 68,
    scoreDelta: 6,
    primaryWeakness: "English articulation",
    status: "completed",
  },
  {
    id: "sess-101",
    topic: "Networking: TCP vs UDP",
    date: "Aug 15",
    overallScore: 64,
    scoreDelta: 4,
    primaryWeakness: "Structure under time pressure",
    status: "completed",
  },
];
