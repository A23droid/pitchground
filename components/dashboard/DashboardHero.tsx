"use client";

import { motion } from "framer-motion";
import { ProgressChart } from "@/components/dashboard/ProgressChart";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import type { LearnerProfile } from "@/lib/types";

export function DashboardHero({ profile }: { profile: LearnerProfile }) {
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-line bg-paper-raised px-6 py-10 shadow-soft-lg sm:px-12 sm:py-14">
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-lavender/40 blur-3xl" />
      <div className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-amber-soft/60 blur-3xl" />

      <div className="relative grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >

          <h1 className="font-display text-2xl font-semibold leading-tight tracking-tight text-ink sm:text-4xl lg:text-[3.2rem] lg:leading-[1.08]">
            <span className="md:hidden">Welcome {profile.name}.</span>
            <span className="hidden md:inline">
              Welcome back,
              <br />
              {profile.name}.
            </span>
            <br />
            <span className="italic text-lavender-ink">Ready to get better?</span>
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-ink-soft">
            Let&apos;s push your communication limits. We&apos;ll identify where you break under pressure and build targeted drills to help you improve.
          </p>
          <div className="mt-8 flex items-center gap-3">
            <Link href="/start">
              <Button size="lg">Start training</Button>
            </Link>
            <Link href="/profile">
              <Button size="lg" variant="outline">
                View your profile
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Mobile-only compact chart stacked below content */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="relative md:hidden"
        >
          <ProgressChart data={profile.progress} />
        </motion.div>

        {/* Desktop side-by-side chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="relative hidden md:block"
        >
          <ProgressChart data={profile.progress} />
        </motion.div>
      </div>
    </div>
  );
}
