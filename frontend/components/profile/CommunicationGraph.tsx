"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import type { LearnerProfile, RecentSessionSummary } from "@/lib/types";
import { Network } from "lucide-react";

interface Node {
  id: string;
  label: string;
  x: number;
  y: number;
  tone: "ink" | "lavender" | "amber" | "rose" | "teal";
}

const toneFill: Record<Node["tone"], string> = {
  ink: "var(--teal)",
  lavender: "var(--lavender-ink)",
  amber: "var(--amber-ink)",
  rose: "var(--rose-ink)",
  teal: "var(--teal-ink)",
};

export function CommunicationGraph({ profile, sessions }: { profile: LearnerProfile; sessions: RecentSessionSummary[] }) {
  const labels = [...profile.strengths, ...profile.weaknesses].slice(0, 5);
  const nodes: Node[] = [ { id: "student", label: profile.name, x: 60, y: 100, tone: "ink" },
    ...labels.map((item, i) => ({ id: item.id, label: item.label, x: i<3 ? 220 : 400,
      y: 40+(i%3)*60, tone: "lavender" as const })) ];
  const edges: [string,string][] = labels.map((item) => ["student",item.id]);
  const point = (id: string) => nodes.find((n) => n.id === id)!;
  return (
    <Card className="p-6">
      <div className="mb-1 flex items-center gap-2">
        <Network size={16} className="text-teal-ink" />
        <h2 className="font-display text-lg text-ink">Communication graph</h2>
      </div>
      <p className="mb-5 text-[13px] text-ink-soft">
        Your measured communication dimensions from your recorded practice.
      </p>

      {labels.length === 0 && <p className="rounded-xl border border-line bg-paper p-4 text-sm text-muted">Complete a recorded session to build your communication graph.</p>}
      <div className="overflow-x-auto">
        <svg viewBox="0 0 460 200" className="h-52 w-full min-w-[420px]" aria-hidden="true">
          {edges.map(([a, b], i) => {
            const pa = point(a);
            const pb = point(b);
            return (
              <motion.line
                key={`${a}-${b}`}
                x1={pa.x}
                y1={pa.y}
                x2={pb.x}
                y2={pb.y}
                stroke="var(--line-strong)"
                strokeWidth={1.5}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ delay: 0.15 + i * 0.08, duration: 0.5 }}
              />
            );
          })}

          {nodes.map((n, i) => (
            <motion.g
              key={n.id}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.07, duration: 0.35, ease: "backOut" }}
            >
              <circle cx={n.x} cy={n.y} r={5} fill={toneFill[n.tone]} />
              <text
                x={n.x}
                y={n.y - 12}
                textAnchor="middle"
                fontSize="11"
                fontFamily="var(--font-sans)"
                fontWeight={600}
                fill="var(--ink)"
              >
                {n.label}
              </text>
            </motion.g>
          ))}
        </svg>
      </div>
    </Card>
  );
}
