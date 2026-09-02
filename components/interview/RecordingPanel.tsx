"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, CameraOff, Mic, Timer as TimerIcon, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { languageToSarvamCode } from "@/lib/sarvamLanguage";
import { downsample, encodeWav, mergeFloat32 } from "@/lib/pcmWav";
import type { Language, RoundQuestion } from "@/lib/types";

const FLUSH_MS = 2200;
const TARGET_RATE = 16000;

async function transcribeWav(blob: Blob, languageCode: string): Promise<string> {
  const body = new FormData();
  body.append("file", new File([blob], "speech.wav", { type: "audio/wav" }));
  body.append("language_code", languageCode);
  const res = await fetch("/api/stt", { method: "POST", body });
  const data = (await res.json()) as { transcript?: string; error?: string };
  if (!res.ok) throw new Error(data.error || "Transcription failed.");
  return data.transcript?.trim() || "";
}

export function RecordingPanel({
  question,
  transcript,
  language,
  onSubmit,
}: {
  question: RoundQuestion;
  transcript?: string;
  language?: Language;
  onSubmit: (transcript: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const pcmChunksRef = useRef<Float32Array[]>([]);
  const keepRecordingRef = useRef(false);
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finishingRef = useRef(false);
  const flushBusyRef = useRef(false);
  const transcriptScrollRef = useRef<HTMLDivElement>(null);
  const liveTranscriptRef = useRef("");

  const [cameraState, setCameraState] = useState<"pending" | "live" | "unavailable">("pending");
  const [phase, setPhase] = useState<"ready" | "recording" | "transcribing" | "recorded">("ready");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [typedTranscript, setTypedTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(question.timeLimitSeconds ?? 0);

  const useLiveStt = !transcript;
  const languageCode = languageToSarvamCode(language);

  const appendTranscript = useCallback((piece: string) => {
    if (!piece) return;
    const next = liveTranscriptRef.current ? `${liveTranscriptRef.current} ${piece}` : piece;
    liveTranscriptRef.current = next;
    setLiveTranscript(next);
  }, []);

  const flushPcm = useCallback(async () => {
    const chunks = pcmChunksRef.current;
    pcmChunksRef.current = [];
    if (!chunks.length) return;

    const ctx = audioCtxRef.current;
    const merged = mergeFloat32(chunks);
    const pcm = downsample(merged, ctx?.sampleRate || TARGET_RATE, TARGET_RATE);
    if (pcm.length < TARGET_RATE * 0.35) return;

    const wav = encodeWav(pcm, TARGET_RATE);
    const text = await transcribeWav(wav, languageCode);
    appendTranscript(text);
  }, [appendTranscript, languageCode]);

  const stopMicGraph = useCallback(() => {
    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();
    processorRef.current = null;
    sourceRef.current = null;
    void audioCtxRef.current?.close();
    audioCtxRef.current = null;
  }, []);

  async function finishRecording() {
    if (finishingRef.current) return;
    finishingRef.current = true;
    keepRecordingRef.current = false;
    if (flushTimerRef.current) {
      clearInterval(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    if (!useLiveStt) {
      setTypedTranscript(transcript || "");
      setPhase("recorded");
      return;
    }
    setPhase("transcribing");
    try {
      while (flushBusyRef.current) {
        await new Promise((r) => setTimeout(r, 40));
      }
      await flushPcm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not transcribe speech.");
    }
    stopMicGraph();
    setPhase("recorded");
  }

  async function startLiveCapture() {
    const audioStream = audioStreamRef.current;
    if (!audioStream || audioStream.getAudioTracks().length === 0) {
      throw new Error("Microphone is not available.");
    }

    const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) throw new Error("This browser cannot capture microphone audio.");

    const ctx = new AudioCtx();
    await ctx.resume();
    const source = ctx.createMediaStreamSource(audioStream);
    const processor = ctx.createScriptProcessor(4096, 1, 1);
    const silence = ctx.createGain();
    silence.gain.value = 0;

    processor.onaudioprocess = (event) => {
      if (!keepRecordingRef.current) return;
      pcmChunksRef.current.push(new Float32Array(event.inputBuffer.getChannelData(0)));
    };

    source.connect(processor);
    processor.connect(silence);
    silence.connect(ctx.destination);

    audioCtxRef.current = ctx;
    sourceRef.current = source;
    processorRef.current = processor;
  }

  function startRecording() {
    setError(null);
    finishingRef.current = false;
    setSecondsLeft(question.timeLimitSeconds ?? 0);

    if (!useLiveStt) {
      setTypedTranscript("");
      setPhase("recording");
      return;
    }

    liveTranscriptRef.current = "";
    setLiveTranscript("");
    pcmChunksRef.current = [];
    keepRecordingRef.current = true;

    void (async () => {
      try {
        await startLiveCapture();
        setPhase("recording");
        flushTimerRef.current = setInterval(() => {
          if (!keepRecordingRef.current || flushBusyRef.current) return;
          flushBusyRef.current = true;
          void flushPcm()
            .catch((err) => setError(err instanceof Error ? err.message : "Could not transcribe speech."))
            .finally(() => {
              flushBusyRef.current = false;
            });
        }, FLUSH_MS);
      } catch (err) {
        keepRecordingRef.current = false;
        setError(err instanceof Error ? err.message : "Could not start the microphone.");
      }
    })();
  }

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
        audioStreamRef.current = new MediaStream(stream.getAudioTracks());
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
          audioStreamRef.current = audioOnly;
          setCameraState("unavailable");
        } catch {
          if (!cancelled) setCameraState("unavailable");
        }
      }
    };

    if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
      startCamera();
    } else {
      setCameraState("unavailable");
    }

    return () => {
      cancelled = true;
      keepRecordingRef.current = false;
      if (flushTimerRef.current) clearInterval(flushTimerRef.current);
      processorRef.current?.disconnect();
      sourceRef.current?.disconnect();
      void audioCtxRef.current?.close();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      audioStreamRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (cameraState === "live" && streamRef.current && videoRef.current && !videoRef.current.srcObject) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraState]);

  useEffect(() => {
    if (phase !== "recording" || !question.timeLimitSeconds) return;
    if (secondsLeft <= 0) {
      void finishRecording();
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, secondsLeft]);

  useEffect(() => {
    if (useLiveStt || phase !== "recording" || !transcript) return;
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
  }, [phase, useLiveStt, transcript]);

  useEffect(() => {
    if (transcriptScrollRef.current) {
      transcriptScrollRef.current.scrollTop = transcriptScrollRef.current.scrollHeight;
    }
  }, [liveTranscript, typedTranscript]);

  const timerPct = question.timeLimitSeconds ? (secondsLeft / question.timeLimitSeconds) * 100 : 100;
  const timerDanger = question.timeLimitSeconds ? secondsLeft <= 5 : false;

  const shownTranscript = useLiveStt ? liveTranscript : typedTranscript;
  const responseText =
    phase === "ready"
      ? "Your response will appear here as you speak…"
      : useLiveStt && phase === "recording" && !shownTranscript
        ? "Listening…"
        : useLiveStt && phase === "transcribing" && !shownTranscript
          ? "Transcribing your answer…"
          : shownTranscript;

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
              {cameraState === "live" ? "Live" : "Demo"}
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
          <div
            ref={transcriptScrollRef}
            className="max-h-[140px] min-h-[56px] overflow-y-auto scroll-smooth text-sm leading-relaxed text-ink-soft sm:max-h-[180px] sm:min-h-[64px]"
          >
            {phase === "ready" ? (
              <span className="text-muted">{responseText}</span>
            ) : (
              <>
                {responseText}
                {(phase === "recording" || phase === "transcribing") && (
                  <span className="animate-pulse-soft">▍</span>
                )}
              </>
            )}
          </div>
          {error && <p className="mt-2 text-xs text-rose-ink">{error}</p>}
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
                <Button size="lg" variant="outline" onClick={() => void finishRecording()} className="w-full sm:w-auto">
                  End response
                </Button>
              </motion.div>
            )}
            {phase === "transcribing" && (
              <motion.div
                key="transcribing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full sm:w-auto"
              >
                <Button size="lg" disabled className="w-full sm:w-auto">
                  Transcribing…
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
                <Button
                  size="lg"
                  disabled={useLiveStt && !liveTranscript}
                  onClick={() => onSubmit(useLiveStt ? liveTranscript : transcript || typedTranscript)}
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
