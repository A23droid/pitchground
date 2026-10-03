import type { AttemptAnalysis, Language } from "@/lib/types";

export interface LanguageDiagnosticResult {
  comfortableLanguage: Language;
  comfortable: AttemptAnalysis;
  english: AttemptAnalysis;
  recommendation: string;
}

const base = (overrides: Partial<AttemptAnalysis>): AttemptAnalysis => ({
  attemptId: `lang-${Math.random().toString(36).slice(2)}`,
  content: { correctness: 91, relevance: 92, topicUnderstanding: 90 },
  communication: { structure: 85, clarity: 87, coherence: 86, fluency: 88 },
  voice: { speakingRateWpm: 128, fillerCount: 4, pauseCount: 2, responseLatencySeconds: 1.2 },
  visual: { gaze: 85, posture: 87, engagement: 88 },
  language: { primaryLanguage: "Malayalam", codeSwitchingDetected: false, englishArticulation: 90 },
  overallScore: 88,
  ...overrides,
});

export function generateComfortableLanguageAnalysis(language: Language): AttemptAnalysis {
  return base({ language: { primaryLanguage: language, codeSwitchingDetected: language === "Mixed", englishArticulation: 90 } });
}

export function generateEnglishAttemptAnalysis(): AttemptAnalysis {
  return base({
    content: { correctness: 88, relevance: 89, topicUnderstanding: 87 },
    communication: { structure: 58, clarity: 54, coherence: 57, fluency: 49 },
    voice: { speakingRateWpm: 101, fillerCount: 14, pauseCount: 7, responseLatencySeconds: 2.8 },
    language: { primaryLanguage: "English", codeSwitchingDetected: false, englishArticulation: 56 },
    overallScore: 61,
  });
}

export const languageDiagnosticTranscripts = {
  comfortable:
    "Indexing ennu paranjal, database oru separate structure undakkunu, athil column values um pointers um vekkum. Athu kondu queries fast aavum, kaaranam full table scan cheyyanda avashyam illa.",
  english:
    "So, um, indexing is like, the database makes another, uh, structure, and it, um, points to the rows, so, uh, it doesn't have to check every, um, every row, so it's, it's faster I think, for, um, searching.",
};
