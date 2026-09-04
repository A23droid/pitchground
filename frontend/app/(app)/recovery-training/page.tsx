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
import { generateRecoveryResult, interruptionPrompt, recoveryTranscript } from "@/mock/recovery";
import type { RecoveryResult } from "@/mock/recovery";
import { ArrowRight, Zap } from "lucide-react";

type Stage = "intro" | "question" | "analyzing" | "result";

export default function RecoveryTrainingPage() {
  const [stage, setStage] = useState<Stage>("intro");
  const [result, setResult] = useState<RecoveryResult | null>(null);

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
              <Badge variant="amber" size="sm" className="mx-auto mb-4">
                <Zap size={12} />
                Recovery training
              </Badge>
              <h1 className="font-display text-3xl text-ink sm:text-4xl">Can you recover mid-answer?</h1>
              <p className="mx-auto mt-3 max-w-md text-[15px] text-ink-soft">
                The interviewer will interrupt you partway through your answer. Pitchground measures how quickly
                your structure and fluency recover — not whether you got interrupted at all.
              </p>
              <Button size="lg" className="mt-7" onClick={() => setStage("question")}>
                Begin
                <ArrowRight size={16} />
              </Button>
            </Card>
          )}

          {stage === "question" && (
            <InterruptionRecordingPanel
              prompt={interruptionPrompt}
              transcript={recoveryTranscript}
              onSubmit={() => setStage("analyzing")}
            />
          )}

          {stage === "analyzing" && (
            <AnalyzingState
              stages={[...ANALYSIS_STAGES, "Measuring recovery..."]}
              onDone={() => {
                setResult(generateRecoveryResult());
                setStage("result");
              }}
            />
          )}

          {stage === "result" && result && <RecoveryResultPanel result={result} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
