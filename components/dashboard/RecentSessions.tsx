"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatSigned } from "@/lib/utils";
import type { RecentSessionSummary } from "@/lib/types";
import { TrendingUp, Mic, Swords, Zap, Languages } from "lucide-react";

export function RecentSessions({ sessions }: { sessions: RecentSessionSummary[] }) {
  return (
    <Card className="p-6">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-display text-xl text-ink">Recent sessions</h2>
        <span className="text-xs font-medium text-muted">Pitchground remembers all of these</span>
      </div>
      <div className="flex flex-col">
        {sessions.map((s, i) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05, duration: 0.35 }}
            className="flex items-center justify-between gap-4 border-b border-line py-3.5 last:border-b-0"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {s.mode === "debate" && (
                  <Badge variant="lavender" size="sm" className="h-5 px-1.5 text-[10px]">
                    <Swords size={9} /> Debate
                  </Badge>
                )}
                {s.mode === "impromptu" && (
                  <Badge variant="amber" size="sm" className="h-5 px-1.5 text-[10px]">
                    <Zap size={9} /> Impromptu
                  </Badge>
                )}
                {s.mode === "interview" && (
                  <Badge variant="teal" size="sm" className="h-5 px-1.5 text-[10px]">
                    <Mic size={9} /> Interview
                  </Badge>
                )}
                {s.mode === "language-diagnostic" && (
                  <Badge variant="outline" size="sm" className="h-5 px-1.5 text-[10px]">
                    <Languages size={9} /> Language
                  </Badge>
                )}
                <p className="truncate text-sm font-medium text-ink">{s.topic}</p>
              </div>
              <p className="mt-0.5 text-xs text-muted">
                {s.date} · {s.primaryWeakness}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {s.scoreDelta !== 0 && (
                <Badge variant={s.scoreDelta > 0 ? "teal" : "amber"} size="sm" className="font-mono">
                  <TrendingUp size={11} />
                  {formatSigned(s.scoreDelta)}
                </Badge>
              )}
              <span className="w-10 text-right font-mono text-sm font-semibold text-ink">{s.overallScore}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </Card>
  );
}

