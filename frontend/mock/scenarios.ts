import type { Audience, Difficulty, InterviewType, Language } from "@/lib/types";

export const interviewTypes: { value: InterviewType; label: string; description: string; available: boolean }[] = [
  {
    value: "Technical Interview",
    label: "Technical interview",
    description: "Concept explanations, trade-offs, and follow-up pressure rounds.",
    available: true,
  },
];

export const comingSoonModes = [
  { label: "Debate", description: "Argue a position and defend it under rebuttal." },
  { label: "Presentation", description: "Structured delivery with a live slide pace-check." },
  { label: "Impromptu", description: "60-second answers on a topic you didn't pick." },
  { label: "Teach-back", description: "Explain a concept so a novice could follow it." },
];

export const topics = [
  "Database Systems",
  "Operating Systems",
  "System Design",
  "Networking",
  "Data Structures & Algorithms",
  "Object-Oriented Design",
];

export const audiences: { value: Audience; description: string }[] = [
  { value: "Technical interviewer", description: "Precise, follow-up heavy, expects trade-offs." },
  { value: "Recruiter", description: "Values clarity over depth, no jargon assumed." },
  { value: "Professor", description: "Rewards correctness and first-principles reasoning." },
  { value: "Manager", description: "Cares about impact and how you'd explain it to a team." },
];

export const languages: { value: Language; description: string }[] = [
  { value: "English", description: "Full response in professional English." },
  { value: "Malayalam", description: "Explain comfortably in Malayalam." },
  { value: "Hindi", description: "Explain comfortably in Hindi." },
  { value: "Mixed", description: "Code-switch naturally, the way you would with a peer." },
];

export const difficulties: { value: Difficulty; description: string }[] = [
  { value: "Easy", description: "Warm-up pacing, generous time limits." },
  { value: "Standard", description: "Realistic interview pacing." },
  { value: "Hard", description: "Tight timers, follow-up pressure, interruptions." },
];
