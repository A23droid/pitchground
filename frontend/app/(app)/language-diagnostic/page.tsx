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
  getAttempt,
  completeAttempt,
  waitForAttemptComplete,
} from "@/services/sessionService";
import { authJson } from "@/lib/api";
import { analyzeRecording, languageCode } from "@/services/practiceService";
import { signalBundleToAttemptAnalysis } from "@/lib/signalMapper";
import type { AttemptAnalysis, Language, RoundQuestion } from "@/lib/types";
import { ArrowRight, BookOpen, Languages, Sparkles } from "lucide-react";

type Stage = "intro" | "comfortable-question" | "comfortable-analyzing" | "english-question" | "english-analyzing" | "result";

const comfortableOptions: Language[] = ["Malayalam", "Hindi", "Mixed"];

export default function LanguageDiagnosticPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("intro");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>("Malayalam");
  const [selectedTopic, setSelectedTopic] = useState({ id: "custom", title: "", description: "" });
  const [comfortableResult, setComfortableResult] = useState<AttemptAnalysis | null>(null);
  const [englishResult, setEnglishResult] = useState<AttemptAnalysis | null>(null);
  const [flowError, setFlowError] = useState<string | null>(null);
  const [pendingMedia, setPendingMedia] = useState<RecordingSubmitPayload | null>(null);
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [englishPrompt, setEnglishPrompt] = useState("");
  const [starting, setStarting] = useState(false);
  const startingRef = useRef(false);
  const comfortableAttempt = useRef<string | null>(null);
  const startedSession = useRef<{key:string;id:string;prompt:string} | null>(null);
  const [pendingLanguageRole,setPendingLanguageRole]=useState<"comfortable"|"english">("comfortable");

  const comfortableQuestion: RoundQuestion = { id: "comfortable", prompt: generatedPrompt,
    round: "baseline", pressure: "none" };
  const englishQuestion: RoundQuestion = { id: "english", prompt: englishPrompt,
    round: "baseline", pressure: "none" };

  async function beginDiagnostic() {
    if (startingRef.current) return;
    if (!selectedTopic.title.trim()) { setFlowError("Enter a topic or concept to practice."); return; }
    setFlowError(null);
    startingRef.current = true; setStarting(true);
    try {
      const key = JSON.stringify([selectedTopic.title.trim(), language]);
      if (startedSession.current?.key !== key) {
        const sess = await createSession({ mode: "language-diagnostic", topic: selectedTopic.title,
          language, difficulty: "Standard" });
        const prompt = sess.current_action?.question_spec?.prompt_text;
        if (!prompt?.trim()) throw new Error("The question is not ready. Please retry.");
        startedSession.current = {key,id:sess.id,prompt};
      }
      const session = startedSession.current!;
      const translated = await authJson<{prompt:string}>(`/v1/sessions/${session.id}/english-prompt`, {method:"POST"});
      setSessionId(session.id); setGeneratedPrompt(session.prompt); setEnglishPrompt(translated.prompt);
      setComfortableResult(null); setEnglishResult(null); comfortableAttempt.current = null;
      setPendingMedia(null);
      setStage("comfortable-question");
    } catch (err) { setFlowError(err instanceof Error ? err.message : "Could not start diagnostic."); }
    finally { startingRef.current = false; setStarting(false); }
  }

  function handleComfortableSubmit(payload: RecordingSubmitPayload) {
    setFlowError(null);
    setPendingLanguageRole("comfortable"); setPendingMedia(payload); setStage("comfortable-analyzing");
  }
  function handleEnglishSubmit(payload: RecordingSubmitPayload) {
    setFlowError(null);
    setPendingLanguageRole("english"); setPendingMedia(payload); setStage("english-analyzing");
  }
  async function onComfortableAnalyzed() {
    if (!sessionId || !pendingMedia) return;
    try {
      const attempt = await analyzeRecording(sessionId, "comfortable", pendingMedia, languageCode(language), generatedPrompt, undefined, true);
      comfortableAttempt.current = attempt.id;
      setPendingMedia(null);
      setStage("english-question");
    } catch (err) { setFlowError(err instanceof Error ? err.message : "Analysis failed."); setStage("comfortable-question"); }
  }
  async function onEnglishAnalyzed() {
    if (!sessionId || !pendingMedia) return;
    try {
      if (!comfortableAttempt.current) throw new Error("Record your comfortable-language answer first.");
      const comfortableId = comfortableAttempt.current;
      const [attempt, comfortable] = await Promise.all([
        analyzeRecording(sessionId, "english", pendingMedia, "en", englishPrompt),
        (async () => {
          const saved = await getAttempt(sessionId, comfortableId);
          if (saved.analysis_status === "failed") await completeAttempt(sessionId, comfortableId);
          return waitForAttemptComplete(sessionId, comfortableId);
        })(),
      ]);
      setComfortableResult(signalBundleToAttemptAnalysis(comfortable.metrics, comfortable.id));
      const english = signalBundleToAttemptAnalysis(attempt.metrics, attempt.id);
      setEnglishResult(english);
      await saveGenericSession({ sessionId, mode: "language-diagnostic", topic: selectedTopic.title,
        overallScore: english.overallScore, scoreDelta: 0, primaryWeakness: "Language comparison" });
      setStage("result");
    } catch (err) { setFlowError(err instanceof Error ? err.message : "Analysis failed."); setStage("english-question"); }
  }

  function finish() {
    router.push("/profile");
  }

  return (
    <div className="mx-auto mt-8 w-full max-w-3xl px-4 sm:px-6">
      {flowError && <p role="alert" className="mb-4 rounded-xl border border-rose/40 bg-paper-raised p-4 text-sm text-rose-ink">{flowError}{pendingMedia && <button className="ml-3 font-semibold underline" onClick={()=>{setFlowError(null);setStage(pendingLanguageRole==="english"?"english-analyzing":"comfortable-analyzing");}}>Retry analysis</button>}</p>}
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
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Topic or concept</p>
                <input aria-label="Topic or concept" value={selectedTopic.title} onChange={(e) => setSelectedTopic({ id: "custom", title: e.target.value, description: "" })} placeholder="Enter any topic or concept" className="w-full rounded-xl border border-line bg-paper-raised px-4 py-3 text-sm text-ink outline-none focus:border-lavender-ink" />
              </div>

              {/* Comfortable Language Selector */}
              <div className="mx-auto mt-6 max-w-xs">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Comfortable language</p>
                <ChipGroup options={comfortableOptions} value={language} onChange={setLanguage} />
              </div>

              <Button size="lg" className="mt-7" disabled={starting} onClick={beginDiagnostic}>
                {starting ? "Preparing both questions…" : <>Begin with &quot;{selectedTopic.title}&quot; in {language}</>}
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
              onRetakeEnglish={() => {setFlowError(null);setPendingMedia(null);setStage("english-question");}}
              onRetakeBoth={() => {setFlowError(null);setPendingMedia(null);setComfortableResult(null);setEnglishResult(null);comfortableAttempt.current=null;setStage("comfortable-question");}}
              onDone={finish}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
