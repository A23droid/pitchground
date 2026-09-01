"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { AudioLines, FileText, BrainCircuit, Eye, Languages } from "lucide-react";

const signals = [
  {
    icon: AudioLines,
    title: "Speech",
    desc: "Speaking rate, pauses, response latency, filler frequency, prosody shifts.",
  },
  {
    icon: FileText,
    title: "Transcript",
    desc: "Structure, clarity, coherence, transitions — fillers kept in, not scrubbed out.",
  },
  {
    icon: BrainCircuit,
    title: "Content",
    desc: "Correctness and concept coverage, scored separately from delivery.",
  },
  {
    icon: Eye,
    title: "Visual",
    desc: "Gaze stability and engagement — observable signals, not a confidence score.",
  },
  {
    icon: Languages,
    title: "Language",
    desc: "Code-switching detected as a signal, not automatically penalized.",
  },
];

export function SignalsGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {signals.map((s, i) => (
        <motion.div
          key={s.title}
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ delay: i * 0.07, duration: 0.45 }}
        >
          <Card className="h-full p-5">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-lavender">
              <s.icon size={16} className="text-lavender-ink" />
            </div>
            <p className="text-sm font-semibold text-ink">{s.title}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">{s.desc}</p>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
