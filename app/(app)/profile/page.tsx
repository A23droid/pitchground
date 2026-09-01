"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ModeUsageCard } from "@/components/profile/ModeUsageCard";
import { StrengthsWeaknesses } from "@/components/dashboard/StrengthsWeaknesses";
import { ProgressChart } from "@/components/dashboard/ProgressChart";
import { RecommendedNext } from "@/components/dashboard/RecommendedNext";
import { LanguageDiagnosticCard } from "@/components/profile/LanguageDiagnosticCard";
import { CommunicationGraph } from "@/components/profile/CommunicationGraph";
import { getLearnerProfile } from "@/services/learnerService";
import type { LearnerProfile } from "@/lib/types";

export default function ProfilePage() {
  const [profile, setProfile] = useState<LearnerProfile | null>(null);

  useEffect(() => {
    getLearnerProfile().then(setProfile);
  }, []);

  return (
    <>
      <div className="mx-auto mt-8 flex w-full max-w-6xl flex-col gap-6 px-4 sm:px-6">
        {!profile ? (
          <div className="h-40 animate-pulse-soft rounded-2xl border border-line bg-paper-raised" />
        ) : (
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
            className="flex flex-col gap-6"
          >
            <FadeIn>
              <ProfileHeader profile={profile} />
            </FadeIn>

            {/* 3 Training Modes Breakdown (Interview, Debate, Impromptu) */}
            <FadeIn>
              <ModeUsageCard />
            </FadeIn>

            <FadeIn>
              <RecommendedNext profile={profile} />
            </FadeIn>
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <FadeIn>
                <ProgressChart data={profile.progress} />
              </FadeIn>
              <FadeIn>
                <LanguageDiagnosticCard />
              </FadeIn>
            </div>
            <FadeIn>
              <StrengthsWeaknesses strengths={profile.strengths} weaknesses={profile.weaknesses} />
            </FadeIn>
            <FadeIn>
              <CommunicationGraph />
            </FadeIn>
          </motion.div>
        )}
      </div>
    </>
  );
}

function FadeIn({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
