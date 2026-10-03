"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, ArrowRight, Zap } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const INTERRUPT_MARKER = " ... [interrupted] ... ";

export function InterruptionRecordingPanel({
  prompt,
  transcript,
  onSubmit,
}: {
  prompt: string;
  transcript: string;
  onSubmit: () => void;
}) {
  const [before, after] = transcript.split(INTERRUPT_MARKER);
  const [phase, setPhase] = useState<"ready" | "typing-before" | "interrupted" | "typing-after" | "done">("ready");
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (phase !== "typing-before") return;
    let i = 0;
    const interval = setInterval(() => {
      i += 3;
      setTyped(before.slice(0, i));
      if (i >= before.length) {
        clearInterval(interval);
        setPhase("interrupted");
      }
    }, 20);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    if (phase !== "typing-after") return;
    let i = 0;
    const interval = setInterval(() => {
      i += 3;
      setTyped(before + " " + after.slice(0, i));
      if (i >= after.length) {
        clearInterval(interval);
        setPhase("done");
      }
    }, 20);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  return (
    <Card className="flex flex-col p-6 sm:p-8">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge variant="amber" size="sm">
          Interruption pressure
        </Badge>
      </div>
      <p className="font-display text-xl leading-snug text-ink">{prompt}</p>

      <div className="relative mt-5 min-h-[120px] rounded-xl border border-line bg-paper p-4">
        <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted">
          <Mic size={12} />
          Response
        </div>
        <p className="text-sm leading-relaxed text-ink-soft">
          {phase === "ready" ? (
            <span className="text-muted">Your response will appear here as you speak…</span>
          ) : (
            <>
              {typed}
              {(phase === "typing-before" || phase === "typing-after") && (
                <span className="animate-pulse-soft">▍</span>
              )}
            </>
          )}
        </p>

        <AnimatePresence>
          {phase === "interrupted" && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-amber/50 bg-amber-soft px-4 py-3"
            >
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-amber-ink" />
                <p className="text-sm font-medium text-amber-ink">
                  Interviewer interrupts: &ldquo;Can you clarify that for a beginner?&rdquo;
                </p>
              </div>
              <Button size="sm" variant="dark" onClick={() => setPhase("typing-after")}>
                Resume answering
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-5 flex justify-end">
        <AnimatePresence mode="wait">
          {phase === "ready" && (
            <motion.div key="start" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Button size="lg" onClick={() => setPhase("typing-before")}>
                <Mic size={16} />
                Start answering
              </Button>
            </motion.div>
          )}
          {phase === "done" && (
            <motion.div key="submit" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              <Button size="lg" onClick={onSubmit}>
                Submit response
                <ArrowRight size={16} />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Card>
  );
}
