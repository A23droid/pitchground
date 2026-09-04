"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { TargetedChallenge } from "@/lib/types";
import { ArrowRight, Target } from "lucide-react";

export function ChallengePanel({ challenge, onPractice }: { challenge: TargetedChallenge; onPractice: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
      <Card className="overflow-hidden p-0">
        <div className="px-6 py-6 sm:px-8">
          <Badge variant="lavender" size="sm" className="mb-3">
            <Target size={12} />
            Training objective
          </Badge>
          <h2 className="font-display text-2xl text-ink">{challenge.objective}</h2>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            {challenge.framework.map((step, i) => (
              <div key={step} className="flex items-center gap-2">
                <span className="rounded-full bg-teal px-3.5 py-1.5 text-sm font-medium text-white">{step}</span>
                {i < challenge.framework.length - 1 && <ArrowRight size={14} className="text-muted" />}
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-xl border border-line bg-paper p-4">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Challenge</p>
            <p className="text-[15px] leading-relaxed text-ink">{challenge.prompt}</p>
          </div>

          <Button size="lg" className="mt-6 w-full sm:w-auto" onClick={onPractice}>
            Practice this weakness
            <ArrowRight size={16} />
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}
