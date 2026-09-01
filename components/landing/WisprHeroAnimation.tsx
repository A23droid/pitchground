"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";

interface WisprHeroAnimationProps {
  rawText?: string;
  polishedText?: string;
  className?: string;
}

interface ProcessingEvent {
  id: string;
  rawText: string;
  strikethroughPart?: string;
  remainingText?: string;
  badgeLabel: string;
}

const EVENTS: ProcessingEvent[] = [
  {
    id: "rep-1",
    rawText: "the ",
    strikethroughPart: "the",
    remainingText: "the",
    badgeLabel: "Removed repetition",
  },
  {
    id: "filler-1",
    rawText: "I ",
    strikethroughPart: "um",
    remainingText: " think...",
    badgeLabel: "Removed Umm",
  },
  {
    id: "grammar-1",
    rawText: "although it might slip",
    remainingText: "although it may slip",
    badgeLabel: "Grammar corrected",
  },
  {
    id: "name-1",
    rawText: "Cheyenne",
    remainingText: "Cheyenne",
    badgeLabel: "Saved name",
  },
  {
    id: "structure-1",
    rawText: "because every time",
    remainingText: "as every instance",
    badgeLabel: "Structure recovered",
  },
];

export function WisprHeroAnimation({
  rawText = "so can you check in with them and see if the notes from yesterday's meeting were sent out, or if they're still waiting on the review and can you ask if we need to reschedule the demo for next week... ",
  polishedText = "has been a bit chaotic. It feels like nobody really knows what's going on. Can you check in with them and see if the notes from yesterday's meeting were sent out? ",
  className = "",
}: WisprHeroAnimationProps) {
  const rawTextRef = useRef<SVGTextPathElement | null>(null);
  const polishedTextRef = useRef<SVGTextPathElement | null>(null);
  const [isRecording, setIsRecording] = useState(true);

  // Transcription Event State Machine
  // 0: detecting word, 1: strike-through / highlight, 2: green badge confirmation, 3: completed / pause
  const [eventIndex, setEventIndex] = useState(0);
  const [eventStep, setEventStep] = useState<"detecting" | "strike" | "badge" | "idle">("detecting");

  // SVG coordinate system: 1600 x 700
  // Large offscreen left orbit sweeping smoothly into the waveform at (800, 590).
  const fullPath =
    "M -400,100 " +
    "C -120,100 120,240 180,410 " +
    "C 220,510 460,585 800,590 " +
    "C 1040,590 1320,550 1680,470";

  // Sleek black audio ribbon originating directly from the waveform at (800, 590)
  const ribbonPath =
    "M 800,590 " +
    "C 1040,590 1320,550 1680,470";

  // Continuous background startOffset ticker
  useEffect(() => {
    let offset = 0;
    let animId: number;
    const speed = 1.9;

    const render = () => {
      offset -= speed;
      if (offset <= -3600) {
        offset = 0;
      }

      if (rawTextRef.current) {
        rawTextRef.current.setAttribute("startOffset", `${offset}px`);
      }
      if (polishedTextRef.current) {
        polishedTextRef.current.setAttribute("startOffset", `${offset * 0.96}px`);
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Transcription editing event lifecycle
  useEffect(() => {
    if (!isRecording) return;

    let timeout1: NodeJS.Timeout;
    let timeout2: NodeJS.Timeout;
    let timeout3: NodeJS.Timeout;
    let timeout4: NodeJS.Timeout;

    // Step 1: Word appears as detected
    setEventStep("detecting");

    // Step 2: Strike-through / correction triggers after 700ms
    timeout1 = setTimeout(() => {
      setEventStep("strike");
    }, 800);

    // Step 3: Green Pill with checkmark animates in after 1300ms
    timeout2 = setTimeout(() => {
      setEventStep("badge");
    }, 1400);

    // Step 4: Fade out to idle after holding
    timeout3 = setTimeout(() => {
      setEventStep("idle");
    }, 3400);

    // Step 5: Advance to next event
    timeout4 = setTimeout(() => {
      setEventIndex((prev) => (prev + 1) % EVENTS.length);
    }, 4000);

    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      clearTimeout(timeout3);
      clearTimeout(timeout4);
    };
  }, [eventIndex, isRecording]);

  const currentEvent = EVENTS[eventIndex];
  const repeatedRaw = rawText.repeat(14);
  const repeatedPolished = polishedText.repeat(12);

  return (
    <div className={`relative w-full overflow-visible select-none ${className}`}>
      {/* SVG Canvas for Text-on-Path */}
      <svg
        viewBox="0 0 1600 700"
        className="pointer-events-none w-full overflow-visible"
        style={{ minHeight: "560px" }}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <path id="wispr-loop-path" d={fullPath} />
          <path id="wispr-ribbon-path" d={ribbonPath} />

          {/* Mask to cut raw text once it reaches the waveform at x: 800 */}
          <mask id="rawMask">
            <rect x="-800" y="-300" width="1600" height="1200" fill="white" />
          </mask>
        </defs>

        {/* 1. Raw Text Along the Massive Wide Off-screen Orbit Arc */}
        <g mask="url(#rawMask)">
          <text
            fill="#8a8371"
            opacity="0.8"
            fontSize="14"
            letterSpacing="0.02em"
            style={{
              fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif",
            }}
          >
            <textPath
              ref={rawTextRef}
              href="#wispr-loop-path"
              startOffset="0px"
              spacing="auto"
            >
              {repeatedRaw}
            </textPath>
          </text>
        </g>

        {/* 2. Substantial, Thicker Dark Audio Ribbon originating from waveform */}
        <path
          d={ribbonPath}
          stroke="#181614"
          strokeWidth="44"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="drop-shadow-lg"
        />

        {/* 3. Polished White Text Inside the Thicker Ribbon */}
        <text
          fill="#ffffff"
          fontSize="14.5"
          fontWeight="500"
          dominantBaseline="central"
          style={{
            fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif",
            letterSpacing: "0.015em",
          }}
          dy="0.5"
        >
          <textPath
            ref={polishedTextRef}
            href="#wispr-ribbon-path"
            startOffset="0px"
            spacing="auto"
          >
            {repeatedPolished}
          </textPath>
        </text>
      </svg>

      {/* 4. Center Waveform Capsule & Dynamic Transcription-Event System */}
      <div
        className="pointer-events-auto absolute left-1/2 flex items-center justify-center"
        style={{ top: "84.3%", transform: "translate(-50%, -50%)" }}
      >
        {/* Active Transcription Event Container above the Waveform */}
        <div className="absolute bottom-[calc(100%+12px)] flex flex-col items-center pointer-events-none min-w-[200px]">
          <AnimatePresence mode="wait">
            {eventStep !== "idle" && (
              <motion.div
                key={currentEvent.id + eventStep}
                initial={{ opacity: 0, y: 6, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.95 }}
                transition={{ duration: 0.24, ease: "easeOut" }}
                className="flex flex-col items-center gap-1.5"
              >
                {/* Stage A: Dark Green Badge Pill with Animated Checkmark */}
                {eventStep === "badge" && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.85, y: 4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 420, damping: 24 }}
                    className="flex items-center gap-1.5 rounded-full bg-[#163832] px-3 py-1 shadow-sm"
                  >
                    <div className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-400/20 text-emerald-300">
                      <Check size={10} strokeWidth={3} />
                    </div>
                    <span className="text-[11.5px] font-medium tracking-tight text-white/95 whitespace-nowrap">
                      {currentEvent.badgeLabel}
                    </span>
                  </motion.div>
                )}

                {/* Stage B: Animated Words Passing Through with Dynamic Strike-through */}
                <div className="flex items-center gap-1 text-[14px] font-medium text-ink font-display tracking-tight">
                  {currentEvent.strikethroughPart ? (
                    <>
                      <span>{currentEvent.rawText}</span>
                      <span className="relative inline-block text-ink/75">
                        {currentEvent.strikethroughPart}
                        {(eventStep === "strike" || eventStep === "badge") && (
                          <motion.span
                            initial={{ width: 0 }}
                            animate={{ width: "100%" }}
                            transition={{ duration: 0.22, ease: "easeInOut" }}
                            className="absolute left-0 top-1/2 h-[1.5px] -translate-y-1/2 bg-ink rotate-[-8deg]"
                          />
                        )}
                      </span>
                      {currentEvent.remainingText && currentEvent.remainingText !== currentEvent.rawText && (
                        <span>{currentEvent.remainingText}</span>
                      )}
                    </>
                  ) : (
                    <span>
                      {eventStep === "badge" ? currentEvent.remainingText : currentEvent.rawText}
                    </span>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Stationary & Animated Substantial Audio Waveform Pill */}
        <motion.button
          type="button"
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.45, delay: 0.4 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => setIsRecording(!isRecording)}
          aria-label="Toggle voice dictation simulation"
          className="group relative flex h-[54px] items-center gap-2.5 rounded-full border-[1.8px] border-[#181614] bg-[#fbf9f1] px-5 shadow-[0_8px_24px_-3px_rgba(0,0,0,0.14)] backdrop-blur transition-all duration-200 hover:shadow-[0_12px_32px_-4px_rgba(0,0,0,0.22)]"
        >
          {/* Equalizer Bars */}
          <div className="flex h-7 items-center gap-[3px] px-1">
            {[4, 8, 14, 22, 12, 18, 24, 16, 20, 26, 15, 10, 18, 12, 5, 9, 4].map(
              (baseH, i) => (
                <motion.span
                  key={i}
                  className="w-[2.5px] rounded-full bg-[#181614]"
                  animate={
                    isRecording
                      ? {
                        height: [
                          `${Math.max(4, baseH * 0.35)}px`,
                          `${baseH}px`,
                          `${Math.max(4, baseH * 0.45)}px`,
                        ],
                      }
                      : { height: `${Math.max(3, baseH * 0.25)}px` }
                  }
                  transition={{
                    duration: 0.65 + (i % 4) * 0.12,
                    repeat: Infinity,
                    repeatType: "reverse",
                    ease: "easeInOut",
                    delay: (i * 0.04) % 0.35,
                  }}
                />
              )
            )}
          </div>
        </motion.button>
      </div>
    </div>
  );
}

