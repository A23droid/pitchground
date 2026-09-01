"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, CameraOff, Mic, Timer as TimerIcon, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import type { RoundQuestion } from "@/lib/types";

export function RecordingPanel({
  question,
  transcript,
  onSubmit,
}: {
  question: RoundQuestion;
  transcript: string;
  onSubmit: (transcript: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraState, setCameraState] = useState<"pending" | "live" | "unavailable">("pending");
  const [phase, setPhase] = useState<"ready" | "recording" | "recorded">("ready");
  const [typedTranscript, setTypedTranscript] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(question.timeLimitSeconds ?? 0);

  // Camera: async init with video + audio, attach to video element, stop tracks on unmount.
  useEffect(() => {
    let cancelled = false;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraState("live");
      } catch {
        if (!cancelled) setCameraState("unavailable");
      }
    };

    if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
      startCamera();
    } else {
      setCameraState("unavailable");
    }

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  // Guard against ref-race: if cameraState is live but video srcObject not yet set, attach now.
  useEffect(() => {
    if (cameraState === "live" && streamRef.current && videoRef.current && !videoRef.current.srcObject) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraState]);

  // Countdown timer for pressure/replay rounds.
  useEffect(() => {
    if (phase !== "recording" || !question.timeLimitSeconds) return;
    if (secondsLeft <= 0) {
      finishRecording();
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, secondsLeft]);

  // Typewriter effect for the transcript once recording starts.
  useEffect(() => {
    if (phase !== "recording") return;
    setTypedTranscript("");
    let i = 0;
    const speed = question.timeLimitSeconds ? 14 : 22;
    const interval = setInterval(() => {
      i += 3;
      setTypedTranscript(transcript.slice(0, i));
      if (i >= transcript.length) {
        clearInterval(interval);
        setPhase("recorded");
      }
    }, speed);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function startRecording() {
    setPhase("recording");
    setSecondsLeft(question.timeLimitSeconds ?? 0);
  }

  function finishRecording() {
    setTypedTranscript(transcript);
    setPhase("recorded");
  }

  const timerPct = question.timeLimitSeconds ? (secondsLeft / question.timeLimitSeconds) * 100 : 100;
  const timerDanger = question.timeLimitSeconds ? secondsLeft <= 5 : false;

  return (
    // Mobile: single column stacked. Desktop: two columns side by side.
    <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-[1fr_1.15fr]">
      {/* Camera / interviewer panel */}
      <Card className="relative flex flex-col overflow-hidden p-0">
        {/* 4:3 ratio on mobile, natural height on desktop (auto fill in 2-col layout) */}
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-teal lg:aspect-auto lg:min-h-[280px] lg:flex-1">
          {/* Always render video so the ref exists before the async stream resolves */}
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className={cn(
              "h-full w-full scale-x-[-1] object-cover",
              cameraState !== "live" && "hidden",
            )}
          />
          {cameraState !== "live" && (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-teal to-[#0c231f] text-white">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 sm:h-16 sm:w-16">
                <CameraOff size={20} />
              </div>
              <p className="text-xs text-white/70">
                {cameraState === "pending"
                  ? "Requesting camera…"
                  : "Demo mode — continuing without camera"}
              </p>
            </div>
          )}

          {/* Recording badge + camera status overlay */}
          <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5 sm:left-3 sm:top-3">
            {phase === "recording" && (
              <span className="flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm sm:px-3 sm:text-xs">
                <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-rose" />
                Recording
              </span>
            )}
            <span className="flex items-center gap-1 rounded-full bg-black/40 px-2 py-1 text-[11px] text-white/80 backdrop-blur-sm">
              <Camera size={10} />
              {cameraState === "live" ? "Live" : "Demo"}
            </span>
          </div>

          {/* Timer badge */}
          {question.timeLimitSeconds && (
            <div className="absolute right-2.5 top-2.5 sm:right-3 sm:top-3">
              <span
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-xs font-semibold backdrop-blur-sm",
                  timerDanger ? "bg-rose text-white" : "bg-black/40 text-white",
                )}
              >
                <TimerIcon size={11} />
                {String(Math.max(secondsLeft, 0)).padStart(2, "0")}s
              </span>
            </div>
          )}
        </div>

        {/* Timer progress bar */}
        {question.timeLimitSeconds && (
          <div className="h-1 w-full shrink-0 bg-black/10">
            <motion.div
              className={cn("h-full", timerDanger ? "bg-rose" : "bg-amber")}
              animate={{ width: `${timerPct}%` }}
              transition={{ duration: 1, ease: "linear" }}
            />
          </div>
        )}
      </Card>

      {/* Question / transcript panel */}
      <Card className="flex flex-col p-4 sm:p-6">
        <div className="mb-3 flex flex-wrap items-center gap-2 sm:mb-4">
          <Badge variant={question.round === "baseline" ? "outline" : "amber"} size="sm">
            {question.round === "baseline"
              ? "Baseline round"
              : question.round === "pressure"
              ? "Pressure round"
              : question.round === "replay"
              ? "Failure replay"
              : "Retry"}
          </Badge>
          {question.timeLimitSeconds && (
            <Badge variant="rose" size="sm">
              {question.timeLimitSeconds}s limit
            </Badge>
          )}
        </div>

        <p className="font-display text-lg leading-snug text-ink sm:text-xl">{question.prompt}</p>

        <div className="mt-4 flex-1 rounded-xl border border-line bg-paper p-3 sm:mt-5 sm:p-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted">
            <Mic size={12} />
            Response
          </div>
          <p className="min-h-[56px] text-sm leading-relaxed text-ink-soft sm:min-h-[64px]">
            {phase === "ready" ? (
              <span className="text-muted">Your response will appear here as you speak…</span>
            ) : (
              <>
                {typedTranscript}
                {phase === "recording" && <span className="animate-pulse-soft">▍</span>}
              </>
            )}
          </p>
        </div>

        <div className="mt-4 flex justify-end sm:mt-5">
          <AnimatePresence mode="wait">
            {phase === "ready" && (
              <motion.div
                key="start"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full sm:w-auto"
              >
                <Button size="lg" onClick={startRecording} className="w-full sm:w-auto">
                  <Mic size={16} />
                  Start answering
                </Button>
              </motion.div>
            )}
            {phase === "recording" && (
              <motion.div
                key="stop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full sm:w-auto"
              >
                <Button size="lg" variant="outline" onClick={finishRecording} className="w-full sm:w-auto">
                  End response
                </Button>
              </motion.div>
            )}
            {phase === "recorded" && (
              <motion.div
                key="submit"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full sm:w-auto"
              >
                <Button size="lg" onClick={() => onSubmit(transcript)} className="w-full sm:w-auto">
                  Submit response
                  <ArrowRight size={16} />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>
    </div>
  );
}
