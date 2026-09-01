"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { RecentSessions } from "@/components/dashboard/RecentSessions";
import { StrengthsWeaknesses } from "@/components/dashboard/StrengthsWeaknesses";
import { ProgressChart } from "@/components/dashboard/ProgressChart";
import { RecommendedNext } from "@/components/dashboard/RecommendedNext";
import { TrainingModes } from "@/components/dashboard/TrainingModes";
import { getLearnerProfile, getRecentSessions } from "@/services/learnerService";
import type { LearnerProfile, RecentSessionSummary } from "@/lib/types";

export default function DashboardPage() {
  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [sessions, setSessions] = useState<RecentSessionSummary[] | null>(null);

  useEffect(() => {
    getLearnerProfile().then(setProfile);
    getRecentSessions().then(setSessions);
  }, []);

  const loading = !profile || !sessions;

  return (
    <>
      <div className="mx-auto mt-8 flex w-full max-w-6xl flex-col gap-6 px-4 sm:px-6">
        {loading ? (
          <DashboardSkeleton />
        ) : (
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
            className="flex flex-col gap-6"
          >
            <FadeIn>
              <DashboardHero profile={profile} />
            </FadeIn>
            <FadeIn>
              <TrainingModes />
            </FadeIn>
            <FadeIn>
              <RecommendedNext profile={profile} />
            </FadeIn>
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <FadeIn>
                <ProgressChart data={profile.progress} />
              </FadeIn>
              <FadeIn>
                <RecentSessions sessions={sessions} />
              </FadeIn>
            </div>
            <FadeIn>
              <StrengthsWeaknesses strengths={profile.strengths} weaknesses={profile.weaknesses} />
            </FadeIn>
          </motion.div>
        )}
      </div>
    </>
  );
}

function FadeIn({ children }: { children: React.ReactNode }) {
  return (
    <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-[360px] animate-pulse-soft rounded-[28px] border border-line bg-paper-raised" />
      <div className="grid gap-5 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-40 animate-pulse-soft rounded-2xl border border-line bg-paper-raised" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="h-72 animate-pulse-soft rounded-2xl border border-line bg-paper-raised" />
        <div className="h-72 animate-pulse-soft rounded-2xl border border-line bg-paper-raised" />
      </div>
    </div>
  );
}
