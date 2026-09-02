"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { LandingNav } from "@/components/shared/LandingNav";
import { Logo } from "@/components/shared/Logo";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { WisprHeroAnimation } from "@/components/landing/WisprHeroAnimation";
import { LoopStepper } from "@/components/landing/LoopStepper";
import { SignalsGrid } from "@/components/landing/SignalsGrid";
import { LanguageTeaser } from "@/components/landing/LanguageTeaser";
import { ArrowRight, Smartphone, Cpu } from "lucide-react";

export default function LandingPage() {
  return (
    <main className="overflow-x-hidden">
      <LandingNav />

      {/* Hero */}
      <section className="relative isolate mx-auto flex min-h-[96vh] w-full max-w-7xl flex-col items-center justify-start px-4 pb-32 pt-12 text-center sm:px-6 sm:pb-48 sm:pt-20">
        {/* Wispr Flow text-on-path flowing animation layer */}
        <div className="pointer-events-none absolute inset-0 z-0 flex items-end justify-center overflow-visible pb-6">
          <WisprHeroAnimation
            className="w-full max-w-[1600px]"
            rawText="so can you check in with them and see if the notes from yesterday's meeting were sent out, or if they're still waiting on the review and can you ask if we need to reschedule the demo for next week... "
            polishedText="has been a bit chaotic. It feels like nobody really knows what's going on. Can you check in with them and see if the notes from yesterday's meeting were sent out? "
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10"
        >
          {/* <Badge variant="dark" size="sm" className="mb-6">
            iQOO ReSkill 2026 · Smart Education
          </Badge> */}
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 font-display text-4xl leading-[1.04] tracking-tight text-ink sm:text-[3.1rem] md:text-[4.6rem]"
        >
          Find where your
          <br />
          <span className="italic text-lavender-ink">speech breaks.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="relative z-10 mx-auto mt-6 max-w-lg text-[16px] leading-relaxed text-ink-soft"
        >
          Pitchground watches how your communication changes under real interview pressure, diagnoses the exact
          breakdown, and trains that condition until it&apos;s fixed.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="relative z-10 mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          <Link href="/signup">
            <Button size="lg">
              Get started free
              <ArrowRight size={16} />
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline">
              Log in
            </Button>
          </Link>
        </motion.div>

        {/* <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.55 }}
          className="relative z-10 mt-4 text-xs text-muted"
        >
          Works with any technical topic · English, Malayalam, Hindi, or mixed
        </motion.p> */}
      </section>

      {/* How it works */}
      <section id="how-it-works" className="mx-auto w-full max-w-5xl px-4 pb-28 pt-8 sm:px-6">
        <SectionHeading eyebrow="The loop" title="Every attempt trains the next one." />
        <p className="mx-auto -mt-8 mb-10 max-w-xl text-center text-[15px] text-ink-soft">
          Generic AI coaches score you and stop. Pitchground treats each response as evidence for what to try next.
        </p>
        <LoopStepper />
      </section>

      {/* Signals */}
      <section id="signals" className="mx-auto w-full max-w-6xl px-4 pb-28 sm:px-6">
        <SectionHeading eyebrow="What it measures" title="Five signal categories, fused into one diagnosis." />
        <div className="mt-10">
          <SignalsGrid />
        </div>
      </section>

      {/* Language */}
      <section id="language" className="mx-auto w-full max-w-4xl px-4 pb-28 sm:px-6 hidden md:block">
        <SectionHeading
          eyebrow="Multilingual by design"
          title="Knowledge gap, or English articulation gap?"
        />
        <p className="mx-auto -mt-8 mb-10 max-w-xl text-center text-[15px] text-ink-soft">
          Explain a concept comfortably, then again in English. Pitchground separates what you know from how well
          you can say it in the language your interview needs.
        </p>
        <LanguageTeaser />
      </section>

      {/* Hardware role */}
      <section className="mx-auto w-full max-w-5xl px-4 pb-28 sm:px-6">
        <div className="grid gap-4 rounded-[28px] border border-line bg-paper-raised p-6 shadow-soft sm:grid-cols-2 sm:gap-5 sm:p-12">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal-soft">
              <Smartphone size={18} className="text-teal-ink" />
            </div>
            <div>
              <p className="font-display text-lg text-ink">Phone</p>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
                Camera, mic, voice-activity detection, and lightweight local feature extraction — the sensing layer.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-lavender">
              <Cpu size={18} className="text-lavender-ink" />
            </div>
            <div>
              <p className="font-display text-lg text-ink">Orchestrator</p>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
                Multimodal fusion, the learner graph, and scenario generation — the decision layer that closes the
                loop.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto w-full max-w-3xl px-4 pb-28 text-center sm:px-6">
        <h2 className="font-display text-3xl text-ink sm:text-4xl">Ready to find where you break?</h2>
        <p className="mx-auto mt-3 max-w-md text-[15px] text-ink-soft">
          One baseline question. One pressure round. A diagnosis with evidence, not a guess.
        </p>
        <Link href="/signup" className="mt-7 inline-block">
          <Button size="lg">
            Start your first session
            <ArrowRight size={16} />
          </Button>
        </Link>
      </section>

      <footer className="border-t border-line px-4 py-10 sm:px-6">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <Logo />
          <p className="text-xs text-muted">Built for iQOO ReSkill 2026 — Smart Education track.</p>
        </div>
      </footer>
    </main>
  );
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5 }}
      className="mb-8 text-center"
    >
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{eyebrow}</p>
      <h2 className="font-display text-3xl text-ink sm:text-4xl">{title}</h2>
    </motion.div>
  );
}
