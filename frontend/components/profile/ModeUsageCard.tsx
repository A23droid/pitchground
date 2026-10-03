"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { getStoredSessions } from "@/mock/sessions";
import { formatSigned } from "@/lib/utils";
import type { RecentSessionSummary, TrainingMode } from "@/lib/types";
import {
  Mic,
  Swords,
  Zap,
  ArrowRight,
  TrendingUp,
  Award,
  Layers,
  Clock,
  ShieldAlert,
} from "lucide-react";

export function ModeUsageCard() {
  const [activeFilter, setActiveFilter] = useState<"all" | TrainingMode>("all");
  const sessions = getStoredSessions();

  // Compute live statistics per mode
  const interviewSessions = sessions.filter((s) => s.mode === "interview" || !s.mode);
  const debateSessions = sessions.filter((s) => s.mode === "debate");
  const impromptuSessions = sessions.filter((s) => s.mode === "impromptu");

  const calcAvg = (list: RecentSessionSummary[], defaultScore: number) => {
    if (list.length === 0) return defaultScore;
    const total = list.reduce((acc, s) => acc + s.overallScore, 0);
    return Math.round(total / list.length);
  };

  const interviewAvg = calcAvg(interviewSessions, 72);
  const debateAvg = calcAvg(debateSessions, 66);
  const impromptuAvg = calcAvg(impromptuSessions, 68);

  const filteredSessions =
    activeFilter === "all"
      ? sessions
      : sessions.filter((s) => s.mode === activeFilter);

  return (
    <div className="flex flex-col gap-6">
      {/* 3 Training Modes Mastery Grid */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl text-ink">Training Modes Mastery</h2>
            <p className="text-xs text-ink-soft">
              Continuous adaptive metrics across all three Pitchground training formats.
            </p>
          </div>
          <Badge variant="outline" size="sm">
            3 Active Modes
          </Badge>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {/* 1. TECHNICAL INTERVIEW */}
          <Card className="flex flex-col justify-between border-line bg-paper-raised p-5 shadow-soft transition-all hover:border-teal">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-soft text-teal-ink">
                  <Mic size={18} />
                </div>
                <Badge variant="teal" size="sm">
                  {interviewSessions.length} Sessions
                </Badge>
              </div>

              <h3 className="mt-3 font-display text-base font-semibold text-ink">
                Technical Interview
              </h3>
              <p className="mt-0.5 text-xs text-ink-soft">
                Baseline + multi-round pressure testing with live coding questions.
              </p>

              <div className="my-4 flex items-baseline justify-between border-y border-line/60 py-3">
                <span className="text-xs text-muted">Average Score</span>
                <div className="flex items-baseline gap-1">
                  <span className="font-display text-2xl font-bold text-ink">{interviewAvg}</span>
                  <span className="text-xs text-muted">/100</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-ink-soft">Structure retention</span>
                  <span className="font-mono font-medium text-ink">78%</span>
                </div>
                <Progress value={78} barClassName="bg-teal" />

                <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted">
                  <ShieldAlert size={12} className="text-amber-ink" />
                  <span>Target: Answer structure under 20s</span>
                </div>
              </div>
            </div>

            <Link href="/start" className="mt-5">
              <Button size="sm" variant="outline" className="w-full justify-center text-xs">
                Launch Interview
                <ArrowRight size={13} />
              </Button>
            </Link>
          </Card>

          {/* 2. DEBATE ARENA */}
          <Card className="flex flex-col justify-between border-line bg-paper-raised p-5 shadow-soft transition-all hover:border-lavender-strong">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-lavender text-lavender-ink">
                  <Swords size={18} />
                </div>
                <Badge variant="lavender" size="sm">
                  {debateSessions.length} Sessions
                </Badge>
              </div>

              <h3 className="mt-3 font-display text-base font-semibold text-ink">
                Debate Arena
              </h3>
              <p className="mt-0.5 text-xs text-ink-soft">
                Adversarial live sparring against counter-arguments under time pressure.
              </p>

              <div className="my-4 flex items-baseline justify-between border-y border-line/60 py-3">
                <span className="text-xs text-muted">Average Score</span>
                <div className="flex items-baseline gap-1">
                  <span className="font-display text-2xl font-bold text-ink">{debateAvg}</span>
                  <span className="text-xs text-muted">/100</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-ink-soft">Premise refutation</span>
                  <span className="font-mono font-medium text-ink">64%</span>
                </div>
                <Progress value={64} barClassName="bg-lavender-strong" />

                <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted">
                  <ShieldAlert size={12} className="text-amber-ink" />
                  <span>Target: Point-Refutation-Turnaround (PRT)</span>
                </div>
              </div>
            </div>

            <Link href="/debate" className="mt-5">
              <Button size="sm" variant="outline" className="w-full justify-center text-xs">
                Enter Debate Arena
                <ArrowRight size={13} />
              </Button>
            </Link>
          </Card>

          {/* 3. IMPROMPTU SPEAKING */}
          <Card className="flex flex-col justify-between border-line bg-paper-raised p-5 shadow-soft transition-all hover:border-amber">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-soft text-amber-ink">
                  <Zap size={18} />
                </div>
                <Badge variant="amber" size="sm">
                  {impromptuSessions.length} Sessions
                </Badge>
              </div>

              <h3 className="mt-3 font-display text-base font-semibold text-ink">
                Impromptu Speaking
              </h3>
              <p className="mt-0.5 text-xs text-ink-soft">
                Unprepared spontaneous topic drills measuring lexical decay after 30s.
              </p>

              <div className="my-4 flex items-baseline justify-between border-y border-line/60 py-3">
                <span className="text-xs text-muted">Average Score</span>
                <div className="flex items-baseline gap-1">
                  <span className="font-display text-2xl font-bold text-ink">{impromptuAvg}</span>
                  <span className="text-xs text-muted">/100</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-ink-soft">Pacing endurance</span>
                  <span className="font-mono font-medium text-ink">71%</span>
                </div>
                <Progress value={71} barClassName="bg-amber" />

                <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted">
                  <ShieldAlert size={12} className="text-amber-ink" />
                  <span>Target: PEEL structure without repetition</span>
                </div>
              </div>
            </div>

            <Link href="/impromptu" className="mt-5">
              <Button size="sm" variant="outline" className="w-full justify-center text-xs">
                Practice Impromptu
                <ArrowRight size={13} />
              </Button>
            </Link>
          </Card>
        </div>
      </div>

      {/* Mode Sessions History with Filter Tabs */}
      <Card className="p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl text-ink">Session History by Mode</h2>
            <p className="text-xs text-muted">Filtered across Interview, Debate, and Impromptu drills</p>
          </div>

          {/* Mode Filters */}
          <div className="flex items-center gap-1.5 rounded-full border border-line bg-paper p-1 text-xs">
            <button
              type="button"
              onClick={() => setActiveFilter("all")}
              className={`rounded-full px-3 py-1 font-medium transition-colors ${
                activeFilter === "all" ? "bg-ink text-white shadow-xs" : "text-ink-soft hover:text-ink"
              }`}
            >
              All ({sessions.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("interview")}
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 font-medium transition-colors ${
                activeFilter === "interview" ? "bg-teal text-white shadow-xs" : "text-ink-soft hover:text-ink"
              }`}
            >
              <Mic size={11} />
              Interview ({interviewSessions.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("debate")}
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 font-medium transition-colors ${
                activeFilter === "debate" ? "bg-lavender-strong text-lavender-ink shadow-xs" : "text-ink-soft hover:text-ink"
              }`}
            >
              <Swords size={11} />
              Debate ({debateSessions.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("impromptu")}
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 font-medium transition-colors ${
                activeFilter === "impromptu" ? "bg-amber text-amber-ink shadow-xs" : "text-ink-soft hover:text-ink"
              }`}
            >
              <Zap size={11} />
              Impromptu ({impromptuSessions.length})
            </button>
          </div>
        </div>

        {/* Sessions List */}
        <div className="flex flex-col">
          {filteredSessions.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted">No completed sessions recorded in this mode yet.</p>
          ) : (
            filteredSessions.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
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
                    {(s.mode === "interview" || !s.mode) && (
                      <Badge variant="teal" size="sm" className="h-5 px-1.5 text-[10px]">
                        <Mic size={9} /> Interview
                      </Badge>
                    )}
                    {s.mode === "language-diagnostic" && (
                      <Badge variant="outline" size="sm" className="h-5 px-1.5 text-[10px]">
                        Language
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
                  <span className="w-10 text-right font-mono text-sm font-semibold text-ink">
                    {s.overallScore}
                  </span>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
