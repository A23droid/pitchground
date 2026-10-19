import type { AttemptAnalysis, Language } from "@/lib/types";

export interface LanguageDiagnosticResult {
  comfortableLanguage: Language;
  comfortable: AttemptAnalysis;
  english: AttemptAnalysis;
  recommendation: string;
}

export function computeDiagnosticAnalysis(
  language: Language,
  transcript?: string,
  sttMetrics?: { wpm?: number; filler_rate?: number; pause_ratio?: number; code_switch_rate?: number } | null,
  isEnglish = false,
): AttemptAnalysis {
  const words = (transcript || "").trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  if (wordCount === 0) {
    return {
      attemptId: `lang-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      content: { correctness: 0, relevance: 0, topicUnderstanding: 0 },
      communication: { structure: 0, clarity: 0, coherence: 0, fluency: 0 },
      voice: { speakingRateWpm: 0, fillerCount: 0, pauseCount: 0, responseLatencySeconds: 0 },
      visual: { gaze: 0, posture: 0, engagement: 0 },
      language: { primaryLanguage: language, codeSwitchingDetected: false, englishArticulation: 0 },
      overallScore: 0,
    };
  }

  const wpm = sttMetrics?.wpm && sttMetrics.wpm > 0
    ? Math.round(sttMetrics.wpm)
    : Math.min(220, Math.max(30, Math.round(wordCount / 0.5)));

  const fillerRate = sttMetrics?.filler_rate ?? (
    (transcript?.match(/\b(uh+|um+|ah+|eh+|er+|mm+|hmm+|like|you know)\b/gi) || []).length / wordCount * 100
  );

  const pauseRatio = sttMetrics?.pause_ratio ?? 0.0;

  // Real fluency score
  const fluency = Math.min(100, Math.max(15, Math.round(100 - fillerRate * (isEnglish ? 5 : 4) - Math.max(0, pauseRatio - 0.2) * 50)));

  // Real clarity score
  const pacingPenalty = Math.abs(wpm - 135) * 0.5;
  const clarity = Math.min(100, Math.max(20, Math.round(100 - pacingPenalty - fillerRate * 2)));

  // Real content understanding & correctness
  const contentScore = Math.min(100, Math.max(20, Math.round(Math.min(60, wordCount * 1.5) + 30)));

  // Real structure
  const structure = Math.min(100, Math.max(20, Math.round(contentScore * 0.5 + fluency * 0.5)));

  // Real articulation
  const englishArticulation = isEnglish
    ? Math.round(fluency * 0.6 + clarity * 0.4)
    : Math.min(100, Math.max(15, Math.round(fluency * 0.8)));

  // Real overall score
  const overallScore = Math.round((contentScore + fluency + clarity + structure) / 4);

  return {
    attemptId: `lang-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    content: {
      correctness: contentScore,
      relevance: Math.min(100, contentScore + 2),
      topicUnderstanding: contentScore,
    },
    communication: {
      structure,
      clarity,
      coherence: structure,
      fluency,
    },
    voice: {
      speakingRateWpm: wpm,
      fillerCount: Math.round((fillerRate / 100) * wordCount),
      pauseCount: Math.round(pauseRatio * 15),
      responseLatencySeconds: Number((pauseRatio * 3).toFixed(1)),
    },
    visual: { gaze: 0, posture: 0, engagement: 0 },
    language: {
      primaryLanguage: language,
      codeSwitchingDetected: sttMetrics?.code_switch_rate !== undefined ? sttMetrics.code_switch_rate > 0.15 : language === "Mixed",
      englishArticulation,
    },
    overallScore,
  };
}

export function generateComfortableLanguageAnalysis(
  language: Language,
  transcript?: string,
  sttMetrics?: { wpm?: number; filler_rate?: number; pause_ratio?: number; code_switch_rate?: number } | null,
): AttemptAnalysis {
  return computeDiagnosticAnalysis(language, transcript, sttMetrics, false);
}

export function generateEnglishAttemptAnalysis(
  transcript?: string,
  sttMetrics?: { wpm?: number; filler_rate?: number; pause_ratio?: number; code_switch_rate?: number } | null,
): AttemptAnalysis {
  return computeDiagnosticAnalysis("English", transcript, sttMetrics, true);
}

export const languageDiagnosticTranscripts = {
  comfortable:
    "Indexing ennu paranjal, database oru separate structure undakkunu, athil column values um pointers um vekkum. Athu kondu queries fast aavum, kaaranam full table scan cheyyanda avashyam illa.",
  english:
    "So, um, indexing is like, the database makes another, uh, structure, and it, um, points to the rows, so, uh, it doesn't have to check every, um, every row, so it's, it's faster I think, for, um, searching.",
};
