"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, CameraOff, Mic, Timer as TimerIcon, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import type { RoundQuestion } from "@/lib/types";
import { stopSpeechPlayback } from "@/lib/opponentSpeech";

export interface RecordingSubmitPayload {
  audioBlob: Blob;
  videoBlob?: Blob | null;
  transcript?: string;
}

export function RecordingPanel({
  question,
  onSubmit,
}: {
  question: RoundQuestion;
  language?: string;
  onSubmit: (payload: RecordingSubmitPayload) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const finishingRef = useRef(false);
  const attachedVideo = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node && streamRef.current) { node.srcObject = streamRef.current; void node.play().catch(() => {}); }
  }, []);

  const [cameraState, setCameraState] = useState<"pending" | "live" | "unavailable">("pending");
  const [phase, setPhase] = useState<"ready" | "recording" | "recorded">("ready");
  const [error, setError] = useState<string | null>(null);
  const [microphoneReady, setMicrophoneReady] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(question.timeLimitSeconds ?? 0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);

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
        setMicrophoneReady(true);
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
          setMicrophoneReady(true);
          setCameraState("unavailable");
        } catch {
          if (!cancelled) { setCameraState("unavailable"); setError("Microphone permission is required. Allow access in your browser and reload this page."); }
        }
      }
    };

    if (typeof navigator !== "undefined" && typeof navigator.mediaDevices?.getUserMedia === "function") {
      void startCamera();
    } else {
      setCameraState("unavailable");
      setError("Microphone recording requires a supported browser on HTTPS or localhost.");
    }

    return () => {
      cancelled = true;
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.onstop = null;
        mediaRecorderRef.current.onerror = null;
        mediaRecorderRef.current.ondataavailable = null;
        if (mediaRecorderRef.current.state === "recording") mediaRecorderRef.current.stop();
      }
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
      finishingRef.current = false; setPhase("ready"); setError("No active recording. Please record your answer again.");
      return;
    }
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
      if (blob.size < 200) { setPhase("ready"); setError("The recording is empty. Please try again."); return; }
      setAudioBlob(blob);
      if (cameraState === "live" && blob.type.startsWith("video/")) setVideoBlob(blob);
      setPhase("recorded");
    };
    recorder.stop();
  }

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
    if (mediaRecorderRef.current?.state === "recording") return;
    stopSpeechPlayback();
    setError(null);
    finishingRef.current = false;
    setSecondsLeft(question.timeLimitSeconds ?? 0);
    setAudioBlob(null);
    setVideoBlob(null);
    chunksRef.current = [];

    const stream = streamRef.current;
    if (!stream || !stream.getAudioTracks().some((track) => track.readyState === "live")) {
      setError("Microphone unavailable. Allow microphone access and try again.");
      return;
    }

    // Ensure mic tracks are live (preview may leave them muted on some browsers).
    stream.getAudioTracks().forEach((t) => {
      t.enabled = true;
    });

    // Audio-only stream for MediaRecorder — mixing video+audio tracks with an
    // audio/* mimeType often throws "error starting the MediaRecorder" in Chrome.
    const audioOnly = new MediaStream(stream.getAudioTracks());
    const mime = pickRecorderMime(stream.getVideoTracks().length > 0);

    const tryStart = (source: MediaStream, mimeType?: string) => {
      const recorder = mimeType ? new MediaRecorder(source, { mimeType }) : new MediaRecorder(source);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onerror = () => {
        setError("Recording failed. Please record your response again.");
        setAudioBlob(null); setVideoBlob(null); setPhase("ready");
      };
      recorder.start(250);
      setPhase("recording");
    };

    try {
      tryStart(stream.getVideoTracks().length && mime?.startsWith("video/") ? stream : audioOnly, mime);
    } catch {
      try {
        // Retry with browser default mime on audio-only stream
        tryStart(audioOnly, undefined);
      } catch {
        try {
          // Last resort: full A/V stream + video mime
          tryStart(stream, pickRecorderMime(true));
        } catch (err) {
          setPhase("ready");
          setError(err instanceof Error ? err.message : "Recorder failed. Please retry.");
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
            ref={attachedVideo}
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
                {cameraState === "pending" ? "Requesting camera…" : "Mic only, continuing without camera"}
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
            <>
              {phase === "ready" && <span className="text-muted">Press start to record your response.</span>}
              {phase === "recording" && <span>Recording… transcript arrives after analysis.</span>}
              {phase === "recorded" && <span>Ready to submit your recorded response.</span>}
            </>
          </div>
          {error && <p className="mt-2 text-xs text-rose-ink">{error}</p>}
        </div>

        <div className="mt-4 flex justify-end sm:mt-5">
          <AnimatePresence mode="wait">
            {phase === "ready" && (
              <motion.div key="start" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full sm:w-auto">
                <Button size="lg" disabled={!microphoneReady} onClick={startRecording} className="w-full sm:w-auto">
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
                <Button size="sm" variant="outline" onClick={startRecording} className="mb-2 mr-2">Record again</Button>
                <Button
                  size="lg"
                  disabled={!audioBlob}
                  onClick={() =>
                    audioBlob &&
                    onSubmit({
                      audioBlob,
                      videoBlob,
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
