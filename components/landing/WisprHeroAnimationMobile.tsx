"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";

interface WisprHeroAnimationMobileProps {
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

export function WisprHeroAnimationMobile({
  rawText = "so can you check in with them and see if the notes from yesterday's meeting were sent out, or if they're still waiting on the review and can you ask if we need to reschedule the demo for next week... ",
  polishedText = "has been a bit chaotic. It feels like nobody really knows what's going on. Can you check in with them and see if the notes from yesterday's meeting were sent out? ",
  className = "",
}: WisprHeroAnimationMobileProps) {
  const rawTextRef = useRef<SVGTextPathElement | null>(null);
  const polishedTextRef = useRef<SVGTextPathElement | null>(null);
  const [isRecording, setIsRecording] = useState(true);

  const [eventIndex, setEventIndex] = useState(0);
  const [eventStep, setEventStep] = useState<"detecting" | "strike" | "badge" | "idle">("detecting");

  // Compact mobile arc peaking at (250, 80)
  const fullPath = "M -100, 280 C 50, 180 150, 80 250, 80 C 350, 80 450, 180 600, 280";
  const ribbonPath = "M 250, 80 C 350, 80 450, 180 600, 280";

  useEffect(() => {
    let offset = 0;
    let animId: number;
    const speed = 1.2;

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

  useEffect(() => {
    if (!isRecording) return;

    let timeout1: NodeJS.Timeout;
    let timeout2: NodeJS.Timeout;
    let timeout3: NodeJS.Timeout;
    let timeout4: NodeJS.Timeout;

    setEventStep("detecting");

    timeout1 = setTimeout(() => {
      setEventStep("strike");
    }, 800);

    timeout2 = setTimeout(() => {
      setEventStep("badge");
    }, 1400);

    timeout3 = setTimeout(() => {
      setEventStep("idle");
    }, 3400);

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
      <svg
        viewBox="0 0 500 280"
        className="pointer-events-none w-full overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <path id="wispr-loop-path-mobile" d={fullPath} />
          <path id="wispr-ribbon-path-mobile" d={ribbonPath} />

          <mask id="rawMaskMobile">
            <rect x="-400" y="-100" width="650" height="800" fill="white" />
          </mask>
        </defs>

        <g mask="url(#rawMaskMobile)">
          <text
            fill="#8a8371"
            opacity="0.8"
            fontSize="18"
            letterSpacing="0.02em"
            style={{
              fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif",
            }}
          >
            <textPath
              ref={rawTextRef}
              href="#wispr-loop-path-mobile"
              startOffset="0px"
              spacing="auto"
            >
              {repeatedRaw}
            </textPath>
          </text>
        </g>

        <path
          d={ribbonPath}
          stroke="#181614"
          strokeWidth="56"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="drop-shadow-lg"
        />

        <text
          fill="#ffffff"
          fontSize="18"
          fontWeight="500"
          dominantBaseline="central"
          style={{
            fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif",
            letterSpacing: "0.015em",
          }}
          dy="1"
        >
          <textPath
            ref={polishedTextRef}
            href="#wispr-ribbon-path-mobile"
            startOffset="0px"
            spacing="auto"
          >
            {repeatedPolished}
          </textPath>
        </text>
      </svg>

      <div
        className="pointer-events-auto absolute left-1/2 flex items-center justify-center w-full max-w-[280px]"
        style={{ top: "28.5%", transform: "translate(-50%, -50%)" }}
      >
        <div className="absolute bottom-[calc(100%+20px)] flex flex-col items-center pointer-events-none w-full z-10">
          <AnimatePresence mode="wait">
            {eventStep !== "idle" && (
              <motion.div
                key={currentEvent.id + eventStep}
                initial={{ opacity: 0, y: 10, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.95 }}
                transition={{ duration: 0.24, ease: "easeOut" }}
                className="flex flex-col items-center gap-4"
              >
                {eventStep === "badge" && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.85, y: 4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 420, damping: 24 }}
                    className="flex items-center gap-1.5 rounded-full bg-[#163832] px-3.5 py-1.5 shadow-sm"
                  >
                    <div className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400/20 text-emerald-300">
                      <Check size={11} strokeWidth={3} />
                    </div>
                    <span className="text-[12.5px] font-medium tracking-tight text-white/95 whitespace-nowrap">
                      {currentEvent.badgeLabel}
                    </span>
                  </motion.div>
                )}

                <div className="flex items-center gap-1 text-[17px] font-medium text-ink font-display tracking-tight text-center flex-wrap justify-center bg-white/80 backdrop-blur-md px-5 py-2.5 rounded-2xl shadow-[0_4px_16px_-4px_rgba(0,0,0,0.08)] border border-line-soft mx-4">
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

        <motion.button
          type="button"
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.45, delay: 0.4 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => setIsRecording(!isRecording)}
          aria-label="Toggle voice dictation simulation"
          className="group relative flex h-[64px] items-center gap-2.5 rounded-full border-[2px] border-[#181614] bg-[#fbf9f1] px-6 shadow-[0_8px_24px_-3px_rgba(0,0,0,0.14)] backdrop-blur transition-all duration-200 hover:shadow-[0_12px_32px_-4px_rgba(0,0,0,0.22)] z-0"
        >
          <div className="flex h-8 items-center gap-[4px] px-1">
            {[6, 12, 18, 28, 16, 22, 30, 20, 24, 32, 18, 12, 22, 14, 8, 12, 6].map(
              (baseH, i) => (
                <motion.span
                  key={i}
                  className="w-[3px] rounded-full bg-[#181614]"
                  animate={
                    isRecording
                      ? {
                        height: [
                          `${Math.max(6, baseH * 0.35)}px`,
                          `${baseH}px`,
                          `${Math.max(6, baseH * 0.45)}px`,
                        ],
                      }
                      : { height: `${Math.max(4, baseH * 0.25)}px` }
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
