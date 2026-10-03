"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, CameraOff, Mic, Timer as TimerIcon, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import type { RoundQuestion } from "@/lib/types";

export interface RecordingSubmitPayload {
  audioBlob: Blob;
  videoBlob?: Blob | null;
  transcript?: string;
}

export function RecordingPanel({
  question,
  transcript,
  onSubmit,
}: {
  question: RoundQuestion;
  /** When set, uses mock typed transcript (debate/impromptu P1) instead of live upload. */
  transcript?: string;
  language?: string;
  onSubmit: (payload: RecordingSubmitPayload) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const finishingRef = useRef(false);
  const mockMode = Boolean(transcript);

  const [cameraState, setCameraState] = useState<"pending" | "live" | "unavailable">("pending");
  const [phase, setPhase] = useState<"ready" | "recording" | "recorded">("ready");
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(question.timeLimitSeconds ?? 0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [typedTranscript, setTypedTranscript] = useState("");

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
        if (videoRef.current) videoRef.current.srcObject = stream;
        setCameraState("live");
      } catch {
        try {
          const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: true });
          if (cancelled) {
            audioOnly.getTracks().forEach((t) => t.stop());
            return;
          }
          streamRef.current = audioOnly;
          setCameraState("unavailable");
        } catch {
          if (!cancelled) setCameraState("unavailable");
        }
      }
    };

    if (typeof navigator !== "undefined" && typeof navigator.mediaDevices?.getUserMedia === "function") {
      void startCamera();
    } else {
      setCameraState("unavailable");
    }

    return () => {
      cancelled = true;
      mediaRecorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (cameraState === "live" && streamRef.current && videoRef.current && !videoRef.current.srcObject) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraState]);

  function finishRecording() {
    if (finishingRef.current) return;
    finishingRef.current = true;
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      setPhase("recorded");
      return;
    }
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
      setAudioBlob(blob);
      if (cameraState === "live") setVideoBlob(blob);
      setPhase("recorded");
    };
    recorder.stop();
  }

  useEffect(() => {
    if (!mockMode || phase !== "recording" || !transcript) return;
    setTypedTranscript("");
    let i = 0;
    const speed = question.timeLimitSeconds ? 14 : 22;
    const interval = setInterval(() => {
      i += 3;
      setTypedTranscript(transcript.slice(0, i));
      if (i >= transcript.length) {
        clearInterval(interval);
        const empty = new Blob([new Uint8Array(1024)], { type: "audio/webm" });
        setAudioBlob(empty);
        setPhase("recorded");
      }
    }, speed);
    return () => clearInterval(interval);
  }, [phase, mockMode, transcript, question.timeLimitSeconds]);

  function pickRecorderMime(hasVideo: boolean): string | undefined {
    const candidates = hasVideo
      ? [
          "video/webm;codecs=vp8,opus",
          "video/webm;codecs=vp9,opus",
          "video/webm",
          "video/mp4",
          "audio/webm;codecs=opus",
          "audio/webm",
          "audio/mp4",
        ]
      : ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
    for (const mime of candidates) {
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(mime)) return mime;
    }
    return undefined;
  }

  function startRecording() {
    setError(null);
    finishingRef.current = false;
    setSecondsLeft(question.timeLimitSeconds ?? 0);
    setAudioBlob(null);
    setVideoBlob(null);
    chunksRef.current = [];

    if (mockMode) {
      setTypedTranscript("");
      setPhase("recording");
      return;
    }

    const stream = streamRef.current;
    if (!stream || stream.getAudioTracks().length === 0) {
      const empty = new Blob([new Uint8Array(2048)], { type: "audio/webm" });
      setAudioBlob(empty);
      setPhase("recorded");
      setError("No microphone — submitting a placeholder clip for stub analysis.");
      return;
    }

    // Ensure mic tracks are live (preview may leave them muted on some browsers).
    stream.getAudioTracks().forEach((t) => {
      t.enabled = true;
    });

    // Audio-only stream for MediaRecorder — mixing video+audio tracks with an
    // audio/* mimeType often throws "error starting the MediaRecorder" in Chrome.
    const audioOnly = new MediaStream(stream.getAudioTracks());
    const mime = pickRecorderMime(false);

    const tryStart = (source: MediaStream, mimeType?: string) => {
      const recorder = mimeType ? new MediaRecorder(source, { mimeType }) : new MediaRecorder(source);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onerror = () => {
        setError("Recorder error — try End response, or refresh and use Submit with a placeholder.");
      };
      recorder.start(250);
      setPhase("recording");
    };

    try {
      tryStart(audioOnly, mime);
    } catch {
      try {
        // Retry with browser default mime on audio-only stream
        tryStart(audioOnly, undefined);
      } catch {
        try {
          // Last resort: full A/V stream + video mime
          tryStart(stream, pickRecorderMime(true));
        } catch (err) {
          const empty = new Blob([new Uint8Array(2048)], { type: "audio/webm" });
          setAudioBlob(empty);
          setPhase("recorded");
          setError(
            err instanceof Error
              ? `${err.message} — using placeholder clip so you can still submit.`
              : "Recorder failed — using placeholder clip so you can still submit.",
          );
        }
      }
    }
  }

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

  const timerPct = question.timeLimitSeconds ? (secondsLeft / question.timeLimitSeconds) * 100 : 100;
  const timerDanger = question.timeLimitSeconds ? secondsLeft <= 5 : false;

  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-[1fr_1.15fr]">
      <Card className="relative flex flex-col overflow-hidden p-0">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-teal lg:aspect-auto lg:min-h-[280px] lg:flex-1">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className={cn("h-full w-full scale-x-[-1] object-cover", cameraState !== "live" && "hidden")}
          />
          {cameraState !== "live" && (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-teal to-[#0c231f] text-white">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 sm:h-16 sm:w-16">
                <CameraOff size={20} />
              </div>
              <p className="text-xs text-white/70">
                {cameraState === "pending" ? "Requesting camera…" : "Mic only — continuing without camera"}
              </p>
            </div>
          )}

          <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5 sm:left-3 sm:top-3">
            {phase === "recording" && (
              <span className="flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm sm:px-3 sm:text-xs">
                <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-rose" />
                Recording
              </span>
            )}
            <span className="flex items-center gap-1 rounded-full bg-black/40 px-2 py-1 text-[11px] text-white/80 backdrop-blur-sm">
              <Camera size={10} />
              {cameraState === "live" ? "Live" : "Mic"}
            </span>
          </div>

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
          <div className="min-h-[56px] text-sm leading-relaxed text-ink-soft sm:min-h-[64px]">
            {mockMode ? (
              phase === "ready" ? (
                <span className="text-muted">Your response will appear here as you speak…</span>
              ) : (
                typedTranscript || (phase === "recording" ? "…" : "")
              )
            ) : (
              <>
                {phase === "ready" && <span className="text-muted">Press start — audio uploads to Pitchground for scoring.</span>}
                {phase === "recording" && <span>Recording… transcript arrives after analysis.</span>}
                {phase === "recorded" && <span>Ready to submit. Backend will transcribe and score this clip.</span>}
              </>
            )}
          </div>
          {error && <p className="mt-2 text-xs text-rose-ink">{error}</p>}
        </div>

        <div className="mt-4 flex justify-end sm:mt-5">
          <AnimatePresence mode="wait">
            {phase === "ready" && (
              <motion.div key="start" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full sm:w-auto">
                <Button size="lg" onClick={startRecording} className="w-full sm:w-auto">
                  <Mic size={16} />
                  Start answering
                </Button>
              </motion.div>
            )}
            {phase === "recording" && (
              <motion.div key="stop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full sm:w-auto">
                <Button size="lg" variant="outline" onClick={finishRecording} className="w-full sm:w-auto">
                  End response
                </Button>
              </motion.div>
            )}
            {phase === "recorded" && (
              <motion.div key="submit" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="w-full sm:w-auto">
                <Button
                  size="lg"
                  disabled={!audioBlob}
                  onClick={() =>
                    audioBlob &&
                    onSubmit({
                      audioBlob,
                      videoBlob,
                      transcript: mockMode ? transcript || typedTranscript : undefined,
                    })
                  }
                  className="w-full sm:w-auto"
                >
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
