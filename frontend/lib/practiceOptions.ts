import type { Audience, Difficulty, Language } from "@/lib/types";

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
