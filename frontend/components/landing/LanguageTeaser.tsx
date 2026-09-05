"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Progress";
import { Languages } from "lucide-react";

const malayalam = [
  { label: "Concept understanding", value: 91 },
  { label: "Communication", value: 87 },
];
const english = [
  { label: "Concept understanding", value: 88 },
  { label: "Communication", value: 54 },
];

export function LanguageTeaser() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5 }}
    >
      <Card className="overflow-hidden p-0">
        <div className="grid gap-0 lg:grid-cols-2">
          <div className="border-b border-line p-6 sm:p-8 lg:border-b-0 lg:border-r">
            <Badge variant="lavender" size="sm" className="mb-3">
              <Languages size={12} />
              Malayalam attempt
            </Badge>
            {malayalam.map((r) => (
              <Row key={r.label} {...r} tone="bg-teal" />
            ))}
          </div>
          <div className="p-6 sm:p-8">
            <Badge variant="rose" size="sm" className="mb-3">
              <Languages size={12} />
              English attempt
            </Badge>
            {english.map((r) => (
              <Row key={r.label} {...r} tone={r.value < 65 ? "bg-amber" : "bg-teal"} />
            ))}
          </div>
        </div>
        <div className="border-t border-line bg-paper px-6 py-5 sm:px-8">
          <p className="text-sm text-ink-soft">
            Concept understanding barely moves. Communication drops 33 points. Pitchground recommends practicing
            <span className="font-medium text-ink"> professional English articulation</span>, not another DBMS
            lesson.
          </p>
        </div>
      </Card>
    </motion.div>
  );
}

function Row({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="mb-4 last:mb-0">
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="text-ink-soft">{label}</span>
        <span className="font-mono font-semibold text-ink">{value}%</span>
      </div>
      <Progress value={value} barClassName={tone} />
    </div>
  );
}
