"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Network } from "lucide-react";

interface Node {
  id: string;
  label: string;
  x: number;
  y: number;
  tone: "ink" | "lavender" | "amber" | "rose" | "teal";
}

const nodes: Node[] = [
  { id: "student", label: "Aravind", x: 60, y: 100, tone: "ink" },
  { id: "topic", label: "DBMS", x: 220, y: 40, tone: "lavender" },
  { id: "weakness", label: "Structure", x: 220, y: 100, tone: "rose" },
  { id: "condition", label: "Time pressure", x: 220, y: 160, tone: "amber" },
  { id: "language", label: "English", x: 400, y: 60, tone: "lavender" },
  { id: "recovery", label: "Interruption", x: 400, y: 140, tone: "teal" },
];

const edges: [string, string][] = [
  ["student", "topic"],
  ["student", "weakness"],
  ["student", "condition"],
  ["weakness", "condition"],
  ["weakness", "language"],
  ["condition", "recovery"],
];

const toneFill: Record<Node["tone"], string> = {
  ink: "var(--teal)",
  lavender: "var(--lavender-ink)",
  amber: "var(--amber-ink)",
  rose: "var(--rose-ink)",
  teal: "var(--teal-ink)",
};

function point(id: string) {
  const n = nodes.find((n) => n.id === id)!;
  return n;
}

export function CommunicationGraph() {
  return (
    <Card className="p-6">
      <div className="mb-1 flex items-center gap-2">
        <Network size={16} className="text-teal-ink" />
        <h2 className="font-display text-lg text-ink">Communication graph</h2>
      </div>
      <p className="mb-5 text-[13px] text-ink-soft">
        Relationships Pitchground has learned — e.g. &ldquo;English + time pressure → structure deterioration&rdquo; —
        become persistent knowledge, not a one-time score.
      </p>

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
