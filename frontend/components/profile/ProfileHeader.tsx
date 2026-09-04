"use client";

import { motion } from "framer-motion";
import type { LearnerProfile } from "@/lib/types";

export function ProfileHeader({ profile }: { profile: LearnerProfile }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-start gap-4 rounded-[24px] border border-line bg-paper-raised p-7 shadow-soft sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-lavender font-display text-xl text-lavender-ink">
          {profile.name.charAt(0)}
        </div>
        <div>
          <h1 className="font-display text-2xl text-ink">{profile.name}&apos;s communication profile</h1>
          <p className="mt-0.5 text-sm text-ink-soft">
            {profile.sessionsCompleted} sessions · {profile.streakDays}-day streak
          </p>
        </div>
      </div>

    </motion.div>
  );
}
