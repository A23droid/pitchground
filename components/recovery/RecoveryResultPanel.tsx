"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { RecoveryResult } from "@/mock/recovery";
import { CheckCircle2, ArrowRight } from "lucide-react";

const verdictCopy: Record<RecoveryResult["verdict"], string> = {
  "strong-recovery": "You recovered structure and fluency within ~2 seconds of the interruption — this is a low-impact condition for you.",
  "partial-recovery": "You recovered most of your structure, but fluency took longer to settle back in.",
  "weak-recovery": "Structure and fluency both dropped and stayed lower for the rest of the answer.",
};

export function RecoveryResultPanel({ result }: { result: RecoveryResult }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <Card className="overflow-hidden p-0">
        <div className="border-b border-line bg-teal-soft/60 px-6 py-6 text-center sm:px-8">
          <Badge variant="teal" size="sm" className="mb-3">
            <CheckCircle2 size={12} />
            Recovery measured
          </Badge>
          <h2 className="font-display text-2xl text-ink sm:text-[1.7rem]">{verdictCopy[result.verdict]}</h2>
          <p className="mt-3 font-mono text-sm text-ink-soft">
            Recovery time: <span className="font-semibold text-ink">{result.recoverySeconds}s</span> · Relevance
            maintained: <span className="font-semibold text-ink">{result.relevanceMaintained ? "Yes" : "No"}</span>
          </p>
        </div>

        <div className="grid grid-cols-2 divide-x divide-line px-6 py-5 sm:px-8">
          <MetricCol label="Before interruption" structure={result.preInterruption.structure} fluency={result.preInterruption.fluency} />
          <MetricCol label="After interruption" structure={result.postInterruption.structure} fluency={result.postInterruption.fluency} pad />
        </div>

        <div className="flex flex-col gap-3 px-6 pb-6 sm:flex-row sm:px-8">
          <Link href="/profile" className="flex-1">
            <Button size="lg" variant="outline" className="w-full">
              View learner profile
            </Button>
          </Link>
          <Link href="/dashboard" className="flex-1">
            <Button size="lg" className="w-full">
              Back to dashboard
              <ArrowRight size={16} />
            </Button>
          </Link>
        </div>
      </Card>
    </motion.div>
  );
}

function MetricCol({ label, structure, fluency, pad = false }: { label: string; structure: number; fluency: number; pad?: boolean }) {
  return (
    <div className={pad ? "pl-6" : "pr-6"}>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <div className="flex flex-col gap-2 text-sm">
        <div className="flex justify-between">
          <span className="text-ink-soft">Structure</span>
          <span className="font-mono font-semibold text-ink">{structure}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-ink-soft">Fluency</span>
          <span className="font-mono font-semibold text-ink">{fluency}%</span>
        </div>
      </div>
    </div>
  );
}
