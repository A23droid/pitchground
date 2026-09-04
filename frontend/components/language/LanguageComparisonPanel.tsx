"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import type { AttemptAnalysis, Language } from "@/lib/types";
import { ArrowRight, Languages } from "lucide-react";

function Column({ title, language, analysis }: { title: string; language: Language; analysis: AttemptAnalysis }) {
  const rows = [
    { label: "Concept understanding", value: analysis.content.topicUnderstanding },
    { label: "Communication (structure)", value: analysis.communication.structure },
    { label: "Fluency", value: analysis.communication.fluency },
  ];
  return (
    <div className="flex-1">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">{title}</p>
      <p className="mb-4 font-display text-lg text-ink">{language}</p>
      <div className="flex flex-col gap-3.5">
        {rows.map((r) => (
          <div key={r.label}>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="text-ink-soft">{r.label}</span>
              <span className="font-mono font-semibold text-ink">{r.value}%</span>
            </div>
            <Progress value={r.value} barClassName={r.value < 65 ? "bg-amber" : "bg-teal"} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function LanguageComparisonPanel({
  comfortableLanguage,
  comfortable,
  english,
  onDone,
}: {
  comfortableLanguage: Language;
  comfortable: AttemptAnalysis;
  english: AttemptAnalysis;
  onDone: () => void;
}) {
  const gap = comfortable.communication.structure - english.communication.structure;
  const knowledgeGap = Math.abs(comfortable.content.topicUnderstanding - english.content.topicUnderstanding);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <Card className="overflow-hidden p-0">
        <div className="border-b border-line bg-lavender/40 px-6 py-5 sm:px-8">
          <Badge variant="lavender" size="sm" className="mb-3">
            <Languages size={12} />
            Evidence suggests a communication/language barrier
          </Badge>
          <h2 className="font-display text-2xl leading-snug text-ink sm:text-[1.6rem]">
            Knowledge stayed within {knowledgeGap} points across languages — communication didn&apos;t.
          </h2>
          <p className="mt-2 max-w-xl text-[14px] text-ink-soft">
            Structure dropped {gap} points once the same concept had to be explained in English. Pitchground
            recommends training target-language articulation, not the underlying concept.
          </p>
        </div>

        <div className="flex flex-col gap-6 px-6 py-6 sm:flex-row sm:px-8">
          <Column title="Attempt A" language={comfortableLanguage} analysis={comfortable} />
          <div className="hidden w-px self-stretch bg-line sm:block" />
          <Column title="Attempt B" language="English" analysis={english} />
        </div>

        <div className="mx-6 mb-6 rounded-xl border border-line bg-paper p-4 sm:mx-8">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Recommendation</p>
          <p className="text-sm text-ink-soft">
            Practice explaining technical concepts in professional English. Code-switching in your comfortable
            attempt was treated as a legitimate signal, not penalized.
          </p>
        </div>

        <div className="flex flex-col gap-3 px-6 pb-6 sm:flex-row sm:px-8">
          <Button size="lg" onClick={onDone} className="flex-1">
            Save to profile
          </Button>
          <Link href="/profile" className="flex-1">
            <Button size="lg" variant="outline" className="w-full">
              View learner profile
              <ArrowRight size={16} />
            </Button>
          </Link>
        </div>
      </Card>
    </motion.div>
  );
}
