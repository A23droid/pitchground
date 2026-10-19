"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ChipGroup } from "@/components/shared/OptionGrid";
import { RecordingPanel, type RecordingSubmitPayload } from "@/components/interview/RecordingPanel";
import { AnalyzingState } from "@/components/interview/AnalyzingState";
import { LanguageComparisonPanel } from "@/components/language/LanguageComparisonPanel";
import { ANALYSIS_STAGES } from "@/services/analysisService";
import { saveGenericSession } from "@/services/learnerService";
import {
  createSession,
  createAttempt,
  uploadAttemptMedia,
  completeAttempt,
  waitForAttemptComplete,
} from "@/services/sessionService";
import { transcribeAudioBlob } from "@/services/sttService";
import {
  LANGUAGE_DIAGNOSTIC_TOPICS,
  generateComfortableLanguageAnalysis,
  generateEnglishAttemptAnalysis,
  type LanguageDiagnosticTopic,
} from "@/mock/languageDiagnostic";
import type { AttemptAnalysis, Language, RoundQuestion } from "@/lib/types";
import { delay } from "@/lib/utils";
import { ArrowRight, BookOpen, Languages, Sparkles } from "lucide-react";

type Stage = "intro" | "comfortable-question" | "comfortable-analyzing" | "english-question" | "english-analyzing" | "result";

const comfortableOptions: Language[] = ["Malayalam", "Hindi", "Mixed"];

export default function LanguageDiagnosticPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("intro");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>("Malayalam");
  const [selectedTopic, setSelectedTopic] = useState<LanguageDiagnosticTopic>(LANGUAGE_DIAGNOSTIC_TOPICS[0]);
  const [comfortableResult, setComfortableResult] = useState<AttemptAnalysis | null>(null);
  const [englishResult, setEnglishResult] = useState<AttemptAnalysis | null>(null);
  const [comfortableTranscript, setComfortableTranscript] = useState<string>("");
  const [englishTranscript, setEnglishTranscript] = useState<string>("");
  const [comfortableSttMetrics, setComfortableSttMetrics] = useState<any>(null);
  const [englishSttMetrics, setEnglishSttMetrics] = useState<any>(null);
  const [hasRecordedComfortable, setHasRecordedComfortable] = useState(false);
  const [hasRecordedEnglish, setHasRecordedEnglish] = useState(false);

  const comfortableVisualRef = useRef<any>(null);
  const englishVisualRef = useRef<any>(null);

  const comfortableQuestion: RoundQuestion = {
    id: `lang-comfortable-${selectedTopic.id}`,
    prompt: `Explain ${selectedTopic.title} in ${language}, the way you'd explain it to a peer or teammate.`,
    round: "baseline",
    pressure: "none",
  };
  const englishQuestion: RoundQuestion = {
    id: `lang-english-${selectedTopic.id}`,
    prompt: `Now explain the same concept (${selectedTopic.title}) in professional English.`,
    round: "baseline",
    pressure: "none",
  };

  async function beginDiagnostic() {
    setStage("comfortable-question");
    comfortableVisualRef.current = null;
    englishVisualRef.current = null;
    try {
      const sess = await createSession({
        mode: "language-diagnostic",
        topic: `Explain ${selectedTopic.title} (${language} vs English)`,
        audience: "",
        language,
        difficulty: "Standard",
      });
      setSessionId(sess.id);
    } catch (e) {
      console.warn("Could not create language-diagnostic backend session:", e);
    }
  }

  async function handleComfortableSubmit(payload: RecordingSubmitPayload) {
    setHasRecordedComfortable(true);
    setStage("comfortable-analyzing");

    // 1. Process CV video & audio through backend attempt
    if (sessionId && payload.audioBlob && payload.audioBlob.size > 200) {
      try {
        const att = await createAttempt(sessionId, "comfortable");
        await uploadAttemptMedia(sessionId, att.id, payload.audioBlob, payload.videoBlob);
        await completeAttempt(sessionId, att.id);
        const completed = await waitForAttemptComplete(sessionId, att.id, 25000);
        if (completed?.metrics?.visual) {
          const v = completed.metrics.visual;
          comfortableVisualRef.current = {
            gaze: Math.max(0, Math.min(100, Math.round((1 - v.gaze_away) * 100))),
            posture: Math.max(0, Math.min(100, Math.round((1 - v.head_down) * 100))),
            engagement: Math.max(0, Math.min(100, Math.round((1 - v.freeze_ratio) * 100))),
            stressScore: Math.max(0, Math.min(100, Math.round(v.stress_score * 100))),
          };
        }
      } catch (cvErr) {
        console.warn("Comfortable CV attempt error:", cvErr);
      }
    }

    // 2. Real Faster-Whisper transcription
    if (payload.audioBlob && payload.audioBlob.size > 200) {
      try {
        const langCode = language === "Malayalam" ? "ml" : language === "Hindi" ? "hi" : "auto";
        const res = await transcribeAudioBlob(payload.audioBlob, langCode);
        if (res.text && res.text.trim()) {
          setComfortableTranscript(res.text.trim());
          setComfortableSttMetrics(res.metrics);
        }
      } catch (err) {
        console.warn("Comfortable STT error:", err);
      }
    }
  }

  async function handleEnglishSubmit(payload: RecordingSubmitPayload) {
    setHasRecordedEnglish(true);
    setStage("english-analyzing");

    // 1. Process CV video & audio through backend attempt
    if (sessionId && payload.audioBlob && payload.audioBlob.size > 200) {
      try {
        const att = await createAttempt(sessionId, "english");
        await uploadAttemptMedia(sessionId, att.id, payload.audioBlob, payload.videoBlob);
        await completeAttempt(sessionId, att.id);
        const completed = await waitForAttemptComplete(sessionId, att.id, 25000);
        if (completed?.metrics?.visual) {
          const v = completed.metrics.visual;
          englishVisualRef.current = {
            gaze: Math.max(0, Math.min(100, Math.round((1 - v.gaze_away) * 100))),
            posture: Math.max(0, Math.min(100, Math.round((1 - v.head_down) * 100))),
            engagement: Math.max(0, Math.min(100, Math.round((1 - v.freeze_ratio) * 100))),
            stressScore: Math.max(0, Math.min(100, Math.round(v.stress_score * 100))),
          };
        }
      } catch (cvErr) {
        console.warn("English CV attempt error:", cvErr);
      }
    }

    // 2. Real Faster-Whisper transcription
    if (payload.audioBlob && payload.audioBlob.size > 200) {
      try {
        const res = await transcribeAudioBlob(payload.audioBlob, "en");
        if (res.text && res.text.trim()) {
          setEnglishTranscript(res.text.trim());
          setEnglishSttMetrics(res.metrics);
        }
      } catch (err) {
        console.warn("English STT error:", err);
      }
    }
  }

  async function onComfortableAnalyzed() {
    await delay(200);
    const textToUse = hasRecordedComfortable ? comfortableTranscript : "";
    const comfortable = generateComfortableLanguageAnalysis(
      language,
      textToUse,
      comfortableSttMetrics,
      comfortableVisualRef.current,
    );
    setComfortableResult(comfortable);
    setStage("english-question");
  }

  async function onEnglishAnalyzed() {
    await delay(200);
    const comfortableText = hasRecordedComfortable ? comfortableTranscript : "";
    const englishText = hasRecordedEnglish ? englishTranscript : "";

    const comfortable = comfortableResult || generateComfortableLanguageAnalysis(
      language,
      comfortableText,
      comfortableSttMetrics,
      comfortableVisualRef.current,
    );
    const english = generateEnglishAttemptAnalysis(
      englishText,
      englishSttMetrics,
      englishVisualRef.current,
    );
    setComfortableResult(comfortable);
    setEnglishResult(english);

    const fullTranscript = `${comfortableText} | ${englishText}`.trim();
    const scoreGap = comfortable.overallScore - english.overallScore;

    await saveGenericSession({
      sessionId: sessionId || undefined,
      topic: `Language Diagnostic: ${selectedTopic.title} (${language} vs English)`,
      mode: "language-diagnostic",
      language,
      difficulty: "Standard",
      overallScore: english.overallScore,
      scoreDelta: Math.abs(scoreGap),
      primaryWeakness: scoreGap > 10 ? "English articulation vs conceptual knowledge" : "Vocabulary richness in English",
      transcript: fullTranscript,
      metrics: { comfortable, english },
    });

    setStage("result");
  }

  function finish() {
    router.push("/profile");
  }

  return (
    <div className="mx-auto mt-8 w-full max-w-3xl px-4 sm:px-6">
      <AnimatePresence mode="wait">
        <motion.div
          key={stage}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.35 }}
        >
          {stage === "intro" && (
            <Card className="p-8 text-center sm:p-12">
              <Badge variant="lavender" size="sm" className="mx-auto mb-4">
                <Languages size={12} />
                Language diagnostic
              </Badge>
              <h1 className="font-display text-3xl text-ink sm:text-4xl">Knowledge, or articulation?</h1>
              <p className="mx-auto mt-3 max-w-md text-[15px] text-ink-soft">
                Explain the same concept twice: once in the language you&apos;re most comfortable in, then again in
                English. Pitchground separates what you know from how well you can say it in English.
              </p>

              {/* Dynamic Topic Selection */}
              <div className="mx-auto mt-6 max-w-md text-left">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Select Technical Concept</p>
                <div className="grid grid-cols-1 gap-2">
                  {LANGUAGE_DIAGNOSTIC_TOPICS.map((topic) => {
                    const isSelected = selectedTopic.id === topic.id;
                    return (
                      <button
                        key={topic.id}
                        type="button"
                        onClick={() => setSelectedTopic(topic)}
                        className={`rounded-xl border p-3.5 text-left transition-all ${
                          isSelected
                            ? "border-lavender-ink bg-lavender-paper/60 shadow-sm ring-1 ring-lavender-ink/20"
                            : "border-line bg-paper-raised hover:border-line-strong"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-display text-sm font-semibold text-ink">{topic.title}</span>
                          <Badge variant="outline" size="sm">
                            {topic.category}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-ink-soft">{topic.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Comfortable Language Selector */}
              <div className="mx-auto mt-6 max-w-xs">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Comfortable language</p>
                <ChipGroup options={comfortableOptions} value={language} onChange={setLanguage} />
              </div>

              <Button size="lg" className="mt-7" onClick={beginDiagnostic}>
                Begin with &quot;{selectedTopic.title}&quot; in {language}
                <ArrowRight size={16} />
              </Button>
            </Card>
          )}

          {stage === "comfortable-question" && (
            <RecordingPanel
              question={comfortableQuestion}
              language={language}
              onSubmit={handleComfortableSubmit}
            />
          )}

          {stage === "comfortable-analyzing" && (
            <AnalyzingState stages={ANALYSIS_STAGES} onDone={onComfortableAnalyzed} />
          )}

          {stage === "english-question" && (
            <RecordingPanel
              question={englishQuestion}
              language="English"
              onSubmit={handleEnglishSubmit}
            />
          )}

          {stage === "english-analyzing" && <AnalyzingState stages={ANALYSIS_STAGES} onDone={onEnglishAnalyzed} />}

          {stage === "result" && comfortableResult && englishResult && (
            <LanguageComparisonPanel
              comfortableLanguage={language}
              comfortable={comfortableResult}
              english={englishResult}
              onDone={finish}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
