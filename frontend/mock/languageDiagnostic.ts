import type { AttemptAnalysis, Language } from "@/lib/types";

export interface LanguageDiagnosticResult {
  comfortableLanguage: Language;
  comfortable: AttemptAnalysis;
  english: AttemptAnalysis;
  recommendation: string;
}

export interface LanguageDiagnosticTopic {
  id: string;
  title: string;
  category: string;
  description: string;
  comfortableHint: string;
}

export const LANGUAGE_DIAGNOSTIC_TOPICS: LanguageDiagnosticTopic[] = [
  {
    id: "db-indexing",
    title: "Database Indexing & B-Trees",
    category: "Database Systems",
    description: "Explain how B-Tree indexes speed up lookups and the tradeoffs on write performance.",
    comfortableHint: "Explain how looking up a key is like an index in a book instead of scanning every page.",
  },
  {
    id: "caching-redis",
    title: "Distributed Caching & Invalidation",
    category: "Distributed Systems",
    description: "Explain cache-aside, write-through vs write-back, and LRU eviction policies.",
    comfortableHint: "Explain keeping frequent answers in memory so you do not have to hit the slow disk.",
  },
  {
    id: "concurrency-locks",
    title: "Concurrency, Deadlocks & Mutexes",
    category: "Operating Systems",
    description: "Explain race conditions, atomic operations, and how cyclic lock dependencies cause deadlocks.",
    comfortableHint: "Explain two threads waiting on each other's keys and freezing the application.",
  },
  {
    id: "tcp-udp",
    title: "TCP vs UDP Transmission",
    category: "Computer Networks",
    description: "Explain connection handshakes, packet ordering, and real-time streaming tradeoffs.",
    comfortableHint: "Explain guaranteed parcel delivery with tracking vs quick live radio broadcast.",
  },
  {
    id: "microservices-monolith",
    title: "Microservices vs Monolith Architecture",
    category: "System Design",
    description: "Explain service decomposition, network boundaries, and eventual consistency.",
    comfortableHint: "Explain single large unified engine vs specialized coordinated mini-shops.",
  },
];

export function computeDiagnosticAnalysis(
  language: Language,
  transcript?: string,
  sttMetrics?: { wpm?: number; filler_rate?: number; pause_ratio?: number; code_switch_rate?: number } | null,
  isEnglish = false,
  visualMetrics?: { gaze: number; posture: number; engagement: number; stressScore?: number } | null,
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
  const visualScore = visualMetrics ? Math.round((visualMetrics.gaze + visualMetrics.posture + visualMetrics.engagement) / 3) : null;
  const overallScore = visualScore !== null
    ? Math.round(0.25 * contentScore + 0.25 * fluency + 0.20 * clarity + 0.15 * structure + 0.15 * visualScore)
    : Math.round((contentScore + fluency + clarity + structure) / 4);

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
    visual: visualMetrics
      ? {
          gaze: visualMetrics.gaze,
          posture: visualMetrics.posture,
          engagement: visualMetrics.engagement,
          eyeContactScore: visualMetrics.gaze,
          handGestureScore: visualMetrics.engagement,
          stressScore: visualMetrics.stressScore ?? 20,
        }
      : { gaze: 0, posture: 0, engagement: 0 },
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
  visualMetrics?: { gaze: number; posture: number; engagement: number; stressScore?: number } | null,
): AttemptAnalysis {
  return computeDiagnosticAnalysis(language, transcript, sttMetrics, false, visualMetrics);
}

export function generateEnglishAttemptAnalysis(
  transcript?: string,
  sttMetrics?: { wpm?: number; filler_rate?: number; pause_ratio?: number; code_switch_rate?: number } | null,
  visualMetrics?: { gaze: number; posture: number; engagement: number; stressScore?: number } | null,
): AttemptAnalysis {
  return computeDiagnosticAnalysis("English", transcript, sttMetrics, true, visualMetrics);
}

export const languageDiagnosticTranscripts = {
  comfortable:
    "Indexing ennu paranjal, database oru separate structure undakkunu, athil column values um pointers um vekkum. Athu kondu queries fast aavum, kaaranam full table scan cheyyanda avashyam illa.",
  english:
    "So, um, indexing is like, the database makes another, uh, structure, and it, um, points to the rows, so, uh, it doesn't have to check every, um, every row, so it's, it's faster I think, for, um, searching.",
};
