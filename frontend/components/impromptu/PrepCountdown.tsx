"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Sparkles, Timer, ArrowRight, Lightbulb } from "lucide-react";
import type { ImpromptuConfig } from "@/lib/types";

export function PrepCountdown({
  config,
  onComplete,
}: {
  config: ImpromptuConfig;
  onComplete: () => void;
}) {
  const [seconds, setSeconds] = useState(10);

  useEffect(() => {
    if (seconds <= 0) {
      onComplete();
      return;
    }
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds, onComplete]);

  return (
    <Card className="relative mx-auto max-w-2xl overflow-hidden p-8 text-center sm:p-10">
      {/* <Badge variant="lavender" size="sm" className="mx-auto mb-3">
        <Timer size={12} />
        Preparation Phase
      </Badge> */}

      <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
        &quot;{config.topic.prompt}&quot;
      </h1>
      <p className="mx-auto mt-2 max-w-md text-xs text-ink-soft">
        Category: {config.topic.category} · Duration: {config.durationSeconds}s · Language: {config.language}
      </p>

      {/* Countdown Dial */}
      <div className="my-7 flex flex-col items-center justify-center">
        <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-4 border-lavender bg-paper shadow-soft sm:h-28 sm:w-28">
          <motion.span
            key={seconds}
            initial={{ scale: 1.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="font-display text-4xl font-bold text-ink sm:text-5xl"
          >
            {seconds}
          </motion.span>
        </div>
        <p className="mt-2 text-xs font-medium uppercase tracking-wider text-muted">Seconds to organize thoughts</p>
      </div>

      {/* Mental Framework Card */}
      <div className="mb-6 rounded-2xl border border-line bg-paper p-4 text-left">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-ink">
          <Lightbulb size={13} className="text-amber" />
          Recommended Mental Framework (PEEL):
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-lg bg-paper-raised p-2 text-center">
            <span className="text-[11px] font-bold text-lavender-ink">1. Point</span>
            <p className="text-[10px] text-muted">Core assertion</p>
          </div>
          <div className="rounded-lg bg-paper-raised p-2 text-center">
            <span className="text-[11px] font-bold text-teal-ink">2. Explain</span>
            <p className="text-[10px] text-muted">Why it happens</p>
          </div>
          <div className="rounded-lg bg-paper-raised p-2 text-center">
            <span className="text-[11px] font-bold text-amber-ink">3. Example</span>
            <p className="text-[10px] text-muted">Real story/analogy</p>
          </div>
          <div className="rounded-lg bg-paper-raised p-2 text-center">
            <span className="text-[11px] font-bold text-ink">4. Link</span>
            <p className="text-[10px] text-muted">Final takeaway</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-3">
        <Button size="lg" onClick={onComplete} className="w-full sm:w-auto">
          I&apos;m ready: Start speaking now
          <ArrowRight size={16} />
        </Button>
      </div>
    </Card>
  );
}
