"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ChipGroup } from "@/components/shared/OptionGrid";
import { RecordingPanel } from "@/components/interview/RecordingPanel";
import { AnalyzingState } from "@/components/interview/AnalyzingState";
import { LanguageComparisonPanel } from "@/components/language/LanguageComparisonPanel";
import { ANALYSIS_STAGES } from "@/services/analysisService";
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
  const [language, setLanguage] = useState<Language>("Malayalam");
  const [comfortableResult, setComfortableResult] = useState<AttemptAnalysis | null>(null);
  const [englishResult, setEnglishResult] = useState<AttemptAnalysis | null>(null);

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

  async function onComfortableAnalyzed() {
    await delay(0);
    setComfortableResult(generateComfortableLanguageAnalysis(language));
    setStage("english-question");
  }

  async function onEnglishAnalyzed() {
    await delay(0);
    setEnglishResult(generateEnglishAttemptAnalysis());
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

              <Button size="lg" className="mt-7" onClick={() => setStage("comfortable-question")}>
                Begin in {language}
                <ArrowRight size={16} />
              </Button>
            </Card>
          )}

          {stage === "comfortable-question" && (
            <RecordingPanel
              question={comfortableQuestion}
              transcript={languageDiagnosticTranscripts.comfortable}
              onSubmit={() => setStage("comfortable-analyzing")}
            />
          )}

          {stage === "comfortable-analyzing" && (
            <AnalyzingState stages={ANALYSIS_STAGES} onDone={onComfortableAnalyzed} />
          )}

          {stage === "english-question" && (
            <RecordingPanel
              question={englishQuestion}
              transcript={languageDiagnosticTranscripts.english}
              onSubmit={() => setStage("english-analyzing")}
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
