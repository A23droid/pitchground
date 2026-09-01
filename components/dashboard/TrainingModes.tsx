"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { ArrowRight, Mic, Swords, Zap, Languages, ShieldAlert } from "lucide-react";

const modes = [
  {
    href: "/start",
    icon: Mic,
    title: "Adaptive interview",
    desc: "Baseline → pressure round → diagnosis → targeted retry.",
    tone: "bg-teal-soft text-teal-ink",
  },
  {
    href: "/debate",
    icon: Swords,
    title: "Debate arena",
    desc: "Opening argument → AI counterattack → pressure rebuttal drill.",
    tone: "bg-lavender text-lavender-ink",
  },
  {
    href: "/impromptu",
    icon: Zap,
    title: "Impromptu speaking",
    desc: "Spontaneous prompt → 10s prep → fluency decay diagnosis.",
    tone: "bg-lavender text-lavender-ink",
  },
  {
    href: "/language-diagnostic",
    icon: Languages,
    title: "Language diagnostic",
    desc: "Separate technical knowledge from English articulation.",
    tone: "bg-teal-soft text-teal-ink",
  },
  {
    href: "/recovery-training",
    icon: ShieldAlert,
    title: "Recovery training",
    desc: "Get interrupted mid-answer. Measure how fast you regain composure.",
    tone: "bg-amber-soft text-amber-ink",
  },
];

export function TrainingModes() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {modes.map((m, i) => (
        <motion.div
          key={m.href}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, duration: 0.35 }}
        >
          <Link href={m.href}>
            <Card className="group h-full p-5 transition-transform duration-200 hover:-translate-y-1">
              <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-full ${m.tone}`}>
                <m.icon size={16} />
              </div>
              <p className="flex items-center justify-between text-sm font-semibold text-ink">
                {m.title}
                <ArrowRight size={14} className="text-muted transition-transform group-hover:translate-x-0.5" />
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">{m.desc}</p>
            </Card>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}

