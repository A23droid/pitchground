"use client";

import { motion } from "framer-motion";
import { ProgressChart } from "@/components/dashboard/ProgressChart";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import type { LearnerProfile } from "@/lib/types";

export function DashboardHero({ profile }: { profile: LearnerProfile }) {
  return (
    <div className="relative w-full min-w-0 overflow-hidden rounded-[24px] border border-line bg-paper-raised p-5 shadow-soft-lg sm:rounded-[28px] sm:p-8 md:p-10 lg:px-12 lg:py-14">
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-lavender/40 blur-3xl" />
      <div className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-amber-soft/60 blur-3xl" />

      <div className="relative grid min-w-0 gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="flex min-w-0 flex-col"
        >
          <h1 className="font-display text-2xl font-semibold leading-tight tracking-tight text-ink break-words sm:text-4xl lg:text-[3.2rem] lg:leading-[1.08]">
            <span className="md:hidden">Welcome {profile.name}.</span>
            <span className="hidden md:inline">
              Welcome back,
              <br />
              {profile.name}.
            </span>
            <br />
            <span className="italic text-lavender-ink">Ready to get better?</span>
          </h1>
          <p className="mt-3.5 max-w-md text-sm leading-relaxed text-ink-soft break-words sm:mt-5 sm:text-[15px]">
            Let&apos;s push your communication limits. We&apos;ll identify where you break under pressure and build targeted drills to help you improve.
          </p>
          <div className="mt-6 flex w-full flex-wrap items-center gap-2.5 sm:mt-8 sm:gap-3">
            <Link href="/start" className="min-w-[130px] flex-1 sm:flex-initial">
              <Button size="lg" className="h-11 w-full px-4 text-sm sm:h-14 sm:w-auto sm:px-7 sm:text-base">
                Start training
              </Button>
            </Link>
            <Link href="/profile" className="min-w-[130px] flex-1 sm:flex-initial">
              <Button size="lg" variant="outline" className="h-11 w-full px-4 text-sm sm:h-14 sm:w-auto sm:px-7 sm:text-base">
                View your profile
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Responsive chart container */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full min-w-0"
        >
          <ProgressChart data={profile.progress} />
        </motion.div>
      </div>
    </div>
  );
}
