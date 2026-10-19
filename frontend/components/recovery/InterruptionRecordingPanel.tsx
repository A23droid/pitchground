"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, ArrowRight, Zap } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const INTERRUPT_MARKER = " ... [interrupted] ... ";

export function InterruptionRecordingPanel({
  prompt,
  onSubmit,
}: {
  prompt: string;
  onSubmit: (payload: import("@/components/interview/RecordingPanel").RecordingSubmitPayload, interruptionSec: number) => void;
}) {
  const [phase, setPhase] = useState<"ready" | "typing-before" | "interrupted" | "typing-after" | "done">("ready");
  const [error, setError] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [interruptionSec, setInterruptionSec] = useState<number | null>(null);
  const [videoAvailable, setVideoAvailable] = useState(false);
  const stream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const started = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    if (recorder.current?.state === "recording") recorder.current.stop();
    stream.current?.getTracks().forEach((t) => t.stop());
  }, []);
  async function startRecording() {
    setError(null);
    try {
      try { stream.current = await navigator.mediaDevices.getUserMedia({ audio: true, video: true }); }
      catch { stream.current = await navigator.mediaDevices.getUserMedia({ audio: true }); }
      setVideoAvailable(stream.current.getVideoTracks().length>0);
      const r = new MediaRecorder(stream.current);
      recorder.current = r;
      chunks.current = [];
      r.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data); };
      r.onstop = () => { setBlob(new Blob(chunks.current, { type: r.mimeType })); setPhase("done"); stream.current?.getTracks().forEach((t) => t.stop()); };
      r.start(250); started.current = performance.now(); setPhase("typing-before");
      timer.current = setTimeout(() => {
        setInterruptionSec((performance.now()-started.current)/1000);
        setPhase("interrupted");
      }, 8000);
    } catch (err) { setError(err instanceof Error ? err.message : "Microphone unavailable."); }
  }
  function handleResume() { setPhase("typing-after"); }
  function finishRecording() {
    if (timer.current) clearTimeout(timer.current);
    if (recorder.current?.state === "recording") recorder.current.stop();
  }
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
              {phase === "done" ? "Recording ready for analysis." : "Recording your spoken response..."}
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
              <Button size="sm" variant="dark" onClick={handleResume}>
                Resume answering
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {error && <p role="alert" className="mt-3 text-sm text-rose-ink">{error}</p>}
      <div className="mt-5 flex justify-end">
        <AnimatePresence mode="wait">
          {phase === "ready" && (
            <motion.div key="start" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Button size="lg" onClick={startRecording}>
                <Mic size={16} />
                Start answering
              </Button>
            </motion.div>
          )}
          {phase === "typing-after" && <Button size="lg" variant="outline" onClick={finishRecording}>End response</Button>}
          {phase === "done" && (
            <motion.div key="submit" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              <Button size="lg" disabled={!blob || interruptionSec === null} onClick={() => blob && interruptionSec !== null && onSubmit({ audioBlob: blob, videoBlob: videoAvailable ? blob : null }, interruptionSec)}>
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
