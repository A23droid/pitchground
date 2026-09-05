"use client";

import { motion } from "framer-motion";

/**
 * A faint, looping scribble of text sitting behind the hero headline, the
 * landing-page cousin of FlowSignature. The words are a real (mocked)
 * rambling transcript, since that's literally the thing Pitchground fixes.
 */
export function LoopText({ className }: { className?: string }) {
  const loop =
    "M50,190 C10,140 20,60 90,55 C160,50 175,120 120,150 C65,180 40,110 95,90 C150,70 190,110 175,160 C160,205 100,205 80,175";

  const phrase =
    "okay so um it can hurt performance because like every time you insert · ";
  const repeated = phrase.repeat(6);

  return (
    <svg viewBox="0 0 240 240" className={className} aria-hidden="true">
      <defs>
        <path id="loop-path" d={loop} fill="none" />
      </defs>
      <motion.text
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ duration: 1.4, delay: 0.6 }}
        fontFamily="var(--font-display)"
        fontStyle="italic"
        fontSize="9.5"
        fill="var(--muted)"
        letterSpacing="0.2"
      >
        <textPath href="#loop-path" startOffset="0%">
          {repeated}
        </textPath>
      </motion.text>
    </svg>
  );
}
