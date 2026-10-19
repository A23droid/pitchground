"use client";

import { useState } from "react";
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
import { createSession } from "@/services/sessionService";
import { transcribeAudioBlob } from "@/services/sttService";
import {
  generateComfortableLanguageAnalysis,
  generateEnglishAttemptAnalysis,
  languageDiagnosticTranscripts,
} from "@/mock/languageDiagnostic";
import type { AttemptAnalysis, Language, RoundQuestion } from "@/lib/types";
import { delay } from "@/lib/utils";
import { ArrowRight, Languages } from "lucide-react";

type Stage = "intro" | "comfortable-question" | "comfortable-analyzing" | "english-question" | "english-analyzing" | "result";

const comfortableOptions: Language[] = ["Malayalam", "Hindi", "Mixed"];

export default function LanguageDiagnosticPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("intro");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>("Malayalam");
  const [comfortableResult, setComfortableResult] = useState<AttemptAnalysis | null>(null);
  const [englishResult, setEnglishResult] = useState<AttemptAnalysis | null>(null);
  const [comfortableTranscript, setComfortableTranscript] = useState<string>("");
  const [englishTranscript, setEnglishTranscript] = useState<string>("");
  const [comfortableSttMetrics, setComfortableSttMetrics] = useState<any>(null);
  const [englishSttMetrics, setEnglishSttMetrics] = useState<any>(null);

  const comfortableQuestion: RoundQuestion = {
    id: "lang-comfortable",
    prompt: `Explain database indexing in ${language}, the way you'd explain it to a friend.`,
    round: "baseline",
    pressure: "none",
  };
  const englishQuestion: RoundQuestion = {
    id: "lang-english",
    prompt: "Now explain the same concept (database indexing) in professional English.",
    round: "baseline",
    pressure: "none",
  };

  async function beginDiagnostic() {
    setStage("comfortable-question");
    try {
      const sess = await createSession({
        mode: "language-diagnostic",
        topic: `Explain database indexing (${language} vs English)`,
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
    setStage("comfortable-analyzing");
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
    setStage("english-analyzing");
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
    const base = generateComfortableLanguageAnalysis(language);
    if (comfortableSttMetrics && comfortableSttMetrics.wpm > 0) {
      base.voice.speakingRateWpm = Math.round(comfortableSttMetrics.wpm);
      base.voice.fillerRatePercent = comfortableSttMetrics.filler_rate;
      base.communication.fluency = Math.min(100, Math.max(40, Math.round(100 - comfortableSttMetrics.filler_rate * 4)));
    }
    setComfortableResult(base);
    setStage("english-question");
  }

  async function onEnglishAnalyzed() {
    await delay(200);
    const comfortable = comfortableResult || generateComfortableLanguageAnalysis(language);
    const english = generateEnglishAttemptAnalysis();
    if (englishSttMetrics && englishSttMetrics.wpm > 0) {
      english.voice.speakingRateWpm = Math.round(englishSttMetrics.wpm);
      english.voice.fillerRatePercent = englishSttMetrics.filler_rate;
      english.communication.fluency = Math.min(100, Math.max(30, Math.round(100 - englishSttMetrics.filler_rate * 5)));
      english.language.codeSwitchingDetected = englishSttMetrics.code_switch_rate > 0.15;
    }
    setComfortableResult(comfortable);
    setEnglishResult(english);

    const fullTranscript = `${comfortableTranscript || languageDiagnosticTranscripts.comfortable} | ${englishTranscript || languageDiagnosticTranscripts.english}`;

    await saveGenericSession({
      sessionId: sessionId || undefined,
      topic: `Language Diagnostic (${language} vs English)`,
      mode: "language-diagnostic",
      language,
      difficulty: "Standard",
      overallScore: english.overallScore,
      scoreDelta: english.overallScore - comfortable.overallScore,
      primaryWeakness: "English articulation vs conceptual knowledge",
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

              <div className="mx-auto mt-6 max-w-xs">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Comfortable language</p>
                <ChipGroup options={comfortableOptions} value={language} onChange={setLanguage} />
              </div>

              <Button size="lg" className="mt-7" onClick={beginDiagnostic}>
                Begin in {language}
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
