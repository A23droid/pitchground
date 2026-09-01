"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ChipGroup, OptionGrid } from "@/components/shared/OptionGrid";
import { audiences, comingSoonModes, difficulties, languages, topics } from "@/mock/scenarios";
import type { Audience, Difficulty, Language } from "@/lib/types";
import { ArrowLeft, ArrowRight, Lock, Mic, Languages as LanguagesIcon, Zap, Swords, ShieldAlert } from "lucide-react";


export default function StartPage() {
  return (
    <Suspense fallback={<div className="mx-auto mt-12 h-64 max-w-3xl animate-pulse-soft rounded-2xl border border-line bg-paper-raised" />}>
      <StartSetupContent />
    </Suspense>
  );
}

function StartSetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialTopic = searchParams.get("topic") || topics[0];
  const initialAudience = (searchParams.get("audience") as Audience) || "Technical interviewer";
  const initialLanguage = (searchParams.get("language") as Language) || "English";
  const initialDifficulty = (searchParams.get("difficulty") as Difficulty) || "Standard";

  const [topic, setTopic] = useState(initialTopic);
  const [audience, setAudience] = useState<Audience>(initialAudience);
  const [language, setLanguage] = useState<Language>(initialLanguage);
  const [difficulty, setDifficulty] = useState<Difficulty>(initialDifficulty);
  const [launching, setLaunching] = useState(false);

  function begin() {
    setLaunching(true);
    const params = new URLSearchParams({ topic, audience, language, difficulty });
    setTimeout(() => router.push(`/interview?${params.toString()}`), 350);
  }

  return (
    <div className="mx-auto mt-6 w-full max-w-3xl px-4 pb-20 sm:px-6">
      {/* Back button */}
      <motion.div initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
        <Link
          href="/dashboard"
          className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted transition-colors hover:text-ink"
        >
          <ArrowLeft size={14} />
          Back to dashboard
        </Link>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Badge variant="lavender" size="sm" className="mb-4">
          New session
        </Badge>
        <h1 className="font-display text-3xl tracking-tight text-ink sm:text-4xl">Set up your interview</h1>
        <p className="mt-2 text-[15px] text-ink-soft">
          Pitchground will start with a baseline question, then introduce a pressure round to find where your
          communication breaks down.
        </p>
      </motion.div>

      <div className="mt-8 flex flex-col gap-6">
        {/* Mode Selector */}
        <Section title="Mode" delay={0.05}>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-full border border-teal bg-teal px-4 py-1.5 text-sm font-medium text-white shadow-soft"
            >
              <Mic size={13} />
              Technical interview
            </button>
            <Link
              href="/debate"
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper-raised px-3.5 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
            >
              <Swords size={13} />
              Debate arena
            </Link>
            <Link
              href="/impromptu"
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper-raised px-3.5 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
            >
              <Zap size={13} />
              Impromptu speaking
            </Link>
            <Link
              href="/language-diagnostic"
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper-raised px-3.5 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
            >
              <LanguagesIcon size={13} />
              Language diagnostic
            </Link>
            <Link
              href="/recovery-training"
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper-raised px-3.5 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
            >
              <ShieldAlert size={13} />
              Recovery training
            </Link>
          </div>
        </Section>

        {/* Topic Selection */}
        <Section title="Topic" delay={0.1}>
          <ChipGroup options={topics} value={topic} onChange={setTopic} />
        </Section>

        {/* Audience Selection */}
        <Section title="Audience" delay={0.15}>
          <OptionGrid
            options={audiences.map((a) => ({ value: a.value, label: a.value, description: a.description }))}
            value={audience}
            onChange={setAudience}
            columns={2}
          />
        </Section>

        {/* Language Selection */}
        <Section title="Language" delay={0.2}>
          <OptionGrid
            options={languages.map((l) => ({ value: l.value, label: l.value, description: l.description }))}
            value={language}
            onChange={setLanguage}
            columns={2}
          />
        </Section>

        {/* Difficulty Selection */}
        <Section title="Difficulty" delay={0.25}>
          <ChipGroup options={difficulties.map((d) => d.value)} value={difficulty} onChange={setDifficulty} />
          <p className="mt-2 text-xs text-muted">
            {difficulties.find((d) => d.value === difficulty)?.description}
          </p>
        </Section>

        {/* Sticky Launch Bar */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="sticky bottom-6 mt-2"
        >
          <Card className="flex items-center justify-between gap-4 p-4 pl-5 shadow-soft-lg">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{topic}</p>
              <p className="truncate text-xs text-ink-soft">
                {audience} · {language} · {difficulty}
              </p>
            </div>
            <Button size="lg" onClick={begin} disabled={launching} className="shrink-0">
              {launching ? "Starting…" : "Begin interview"}
              {!launching && <ArrowRight size={16} />}
            </Button>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

function Section({ title, delay, children }: { title: string; delay: number; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay }}>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">{title}</h2>
      {children}
    </motion.div>
  );
}

