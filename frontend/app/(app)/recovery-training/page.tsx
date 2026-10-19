"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { AnalyzingState } from "@/components/interview/AnalyzingState";
import { InterruptionRecordingPanel } from "@/components/recovery/InterruptionRecordingPanel";
import { RecoveryResultPanel } from "@/components/recovery/RecoveryResultPanel";
import { ANALYSIS_STAGES } from "@/services/analysisService";
import type { RecoveryResult } from "@/lib/types";
import type { RecordingSubmitPayload } from "@/components/interview/RecordingPanel";
import { createSession } from "@/services/sessionService";
import { analyzeRecording } from "@/services/practiceService";
import { saveGenericSession } from "@/services/learnerService";
import { authJson } from "@/lib/api";
import { ArrowRight, Zap } from "lucide-react";

type Stage = "intro" | "question" | "analyzing" | "result";

export default function RecoveryTrainingPage() {
  const [stage, setStage] = useState<Stage>("intro");
  const [result, setResult] = useState<RecoveryResult | null>(null);
  const [topic, setTopic] = useState("");
  const [prompt, setPrompt] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pending, setPending] = useState<RecordingSubmitPayload | null>(null);
  const [interruptionSec, setInterruptionSec] = useState(0);
  const [flowError, setFlowError] = useState<string | null>(null);
  async function begin() {
    if (!topic.trim()) { setFlowError("Enter a topic first."); return; }
    try {
      const session = await createSession({ mode: "recovery-training", topic });
      setSessionId(session.id); setPrompt(session.current_action.question_spec.prompt_text); setStage("question");
    } catch (err) { setFlowError(err instanceof Error ? err.message : "Could not start practice."); }
  }
  async function analyze() {
    if (!sessionId || !pending) return;
    try {
      const attempt = await analyzeRecording(sessionId, "recovery", pending, "en", prompt, interruptionSec);
      const data = await authJson<RecoveryResult>(`/v1/sessions/${sessionId}/attempts/${attempt.id}/recovery`);
      setResult(data);
      await saveGenericSession({ sessionId, mode: "recovery-training", topic, overallScore: 0, scoreDelta: 0, primaryWeakness: "Recovery" });
      setStage("result");
    } catch (err) { setFlowError(err instanceof Error ? err.message : "Analysis failed. Record again."); setStage("question"); }
  }

  return (
    <div className="mx-auto mt-8 w-full max-w-3xl px-4 sm:px-6">
      {flowError && <p role="alert" className="mb-4 rounded-xl border border-rose/40 bg-paper-raised p-4 text-sm text-rose-ink">{flowError}{pending && <button className="ml-3 font-semibold underline" onClick={()=>{setFlowError(null);setStage("analyzing");}}>Retry analysis</button>}</p>}
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
              <Badge variant="amber" size="sm" className="mx-auto mb-4">
                <Zap size={12} />
                Recovery training
              </Badge>
              <h1 className="font-display text-3xl text-ink sm:text-4xl">Can you recover mid-answer?</h1>
              <p className="mx-auto mt-3 max-w-md text-[15px] text-ink-soft">
                The interviewer will interrupt you partway through your answer. Pitchground measures how quickly
                your structure and fluency recover, not whether you got interrupted at all.
              </p>
              <input aria-label="Recovery practice topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Enter a topic, role or domain" className="mt-5 w-full rounded-xl border border-line bg-paper px-4 py-3 text-sm text-ink outline-none focus:border-lavender-ink" />
              <Button size="lg" className="mt-7" onClick={begin}>
                Begin
                <ArrowRight size={16} />
              </Button>
            </Card>
          )}

          {stage === "question" && (
            <InterruptionRecordingPanel
              prompt={prompt}
              onSubmit={(payload, seconds) => { setPending(payload); setInterruptionSec(seconds); setStage("analyzing"); }}
            />
          )}

          {stage === "analyzing" && (
            <AnalyzingState
              stages={[...ANALYSIS_STAGES, "Measuring recovery..."]}
              onDone={analyze}
            />
          )}

          {stage === "result" && result && <RecoveryResultPanel result={result} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
