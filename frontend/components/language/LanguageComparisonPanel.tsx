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
  const rows: { label: string; value: number | null }[] = [
    { label: "Answer key-point coverage", value: analysis.contentAvailable === false ? null : analysis.content.topicUnderstanding },
    { label: "Communication (structure)", value: analysis.structureAvailable === false ? null : analysis.communication.structure },
    { label: "Fluency", value: analysis.communication.fluency },
  ];
  if (analysis.visualAvailable !== false && analysis.visual) {
    rows.push({ label: "Eye Contact Engagement", value: analysis.visual.eyeContactScore ?? analysis.visual.gaze });
    rows.push({ label: "Posture Steadiness", value: analysis.visual.posture });
  }
  return (
    <div className="flex-1">
      <div className="flex items-center justify-between">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">{title}</p>
        {analysis.visual?.stressScore != null && analysis.visual.stressScore > 0 && (
          <span className="text-[11px] font-mono text-muted">Stress: {analysis.visual.stressScore}%</span>
        )}
      </div>
      <p className="mb-1 font-display text-lg text-ink">{language}</p>
      <p className="mb-4 text-xs text-muted">Detected: {analysis.language.primaryLanguage}</p>
      <div className="flex flex-col gap-3.5">
        {rows.map((r) => (
          <div key={r.label}>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="text-ink-soft">{r.label}</span>
              <span className="font-mono font-semibold text-ink">{r.value === null ? "Not measured" : `${r.value}%`}</span>
            </div>
            <Progress value={r.value ?? 0} barClassName={(r.value ?? 0) < 65 ? "bg-amber" : "bg-teal"} />
          </div>
        ))}
      </div>
      <dl className="mt-4 space-y-2 rounded-xl border border-line bg-paper p-3 text-xs">
        <div className="flex justify-between gap-3"><dt className="text-muted">Speaking rate</dt><dd className="font-mono text-ink">{Math.round(analysis.voice.speakingRateWpm)} WPM</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-muted">Hesitations &amp; fillers</dt><dd className="font-mono text-ink">{analysis.voice.fillerCount ?? "Not measured"}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-muted">Pause / dead air</dt><dd className="font-mono text-ink">{analysis.voice.pauseRatioPercent == null ? "Not measured" : `${analysis.voice.pauseRatioPercent}%`}</dd></div>
      </dl>
      {analysis.transcript && <details className="mt-4 text-sm text-ink-soft"><summary className="cursor-pointer font-semibold">Recorded transcript</summary><p className="mt-2 whitespace-pre-wrap">{analysis.transcript}</p></details>}
      {analysis.answerFeedback && <div className="mt-4 rounded-xl border border-line bg-paper p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Answer review</p>
        <p className="text-sm leading-relaxed text-ink-soft">{analysis.answerFeedback}</p>
      </div>}
    </div>
  );
}

export function LanguageComparisonPanel({
  comfortableLanguage,
  comfortable,
  english,
  onDone,
  onRetakeEnglish,
  onRetakeBoth,
}: {
  comfortableLanguage: Language;
  comfortable: AttemptAnalysis;
  english: AttemptAnalysis;
  onDone: () => void;
  onRetakeEnglish: () => void;
  onRetakeBoth: () => void;
}) {
  const languagesMatch = english.language.primaryLanguage === "English" &&
    (comfortableLanguage === "Mixed" ? comfortable.language.primaryLanguage !== "Unknown" : comfortable.language.primaryLanguage === comfortableLanguage);
  const gap = !languagesMatch || comfortable.structureAvailable === false || english.structureAvailable === false || comfortable.communication.structure === null || english.communication.structure === null ? null : comfortable.communication.structure - english.communication.structure;
  const knowledgeGap = !languagesMatch || comfortable.contentAvailable === false || english.contentAvailable === false || comfortable.content.topicUnderstanding === null || english.content.topicUnderstanding === null ? null : Math.abs(comfortable.content.topicUnderstanding - english.content.topicUnderstanding);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <Card className="overflow-hidden p-0">
        <div className="border-b border-line bg-lavender/40 px-6 py-5 sm:px-8">
          <Badge variant="lavender" size="sm" className="mb-3">
            <Languages size={12} />
            Your language comparison
          </Badge>
          <h2 className="font-display text-2xl leading-snug text-ink sm:text-[1.6rem]">
            {!languagesMatch ? "The recordings did not match both requested languages." : knowledgeGap === null ? "Answer validation is unavailable for this comparison." : `Content coverage differed by ${knowledgeGap} points across languages.`}
          </h2>
          <p className="mt-2 max-w-xl text-[14px] text-ink-soft">
            {gap === null ? "Structure could not be reviewed for both recordings." : `The measured structure difference is ${gap} points (comfortable language minus English).`} Compare the recordings before deciding what to practice next.
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
            {languagesMatch ? "Review the recorded answers and their individual feedback above. Differences in coverage or structure are observations from these two attempts, rather than a diagnosis of language ability." : `Attempt A was detected as ${comfortable.language.primaryLanguage} and attempt B as ${english.language.primaryLanguage}. Record the requested languages again before interpreting a language gap.`}
          </p>
        </div>

        <div className="flex flex-col gap-3 px-6 pb-6 sm:flex-row sm:px-8">
          <Button variant="outline" onClick={onRetakeEnglish}>Record English again</Button>
          <Button variant="outline" onClick={onRetakeBoth}>Repeat both answers</Button>
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
