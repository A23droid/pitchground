"use client";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { Strength, Weakness } from "@/lib/types";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";

const trendIcon = { improving: TrendingUp, worsening: TrendingDown, stable: Minus };
const severityVariant = { high: "rose", medium: "amber", low: "teal" } as const;

export function StrengthsWeaknesses({ strengths, weaknesses }: { strengths: Strength[]; weaknesses: Weakness[] }) {
  return (
    <div className="grid min-w-0 gap-5 sm:grid-cols-2">
      <Card className="min-w-0 p-5 sm:p-6">
        <h2 className="mb-4 font-display text-lg text-ink">Strengths</h2>
        <ul className="flex flex-col gap-4">
          {strengths.map((s) => (
            <li key={s.id} className="min-w-0">
              <p className="text-sm font-semibold text-ink break-words">{s.label}</p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-ink-soft break-words">{s.description}</p>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="min-w-0 p-5 sm:p-6">
        <h2 className="mb-4 font-display text-lg text-ink">Current weaknesses</h2>
        <ul className="flex flex-col gap-4">
          {weaknesses.map((w) => {
            const Icon = trendIcon[w.trend];
            return (
              <li key={w.id} className="min-w-0">
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <p className="text-sm font-semibold text-ink break-words min-w-0">{w.label}</p>
                  <Badge variant={severityVariant[w.severity]} size="sm" className="shrink-0">
                    <Icon size={11} />
                    {w.trend}
                  </Badge>
                </div>
                <p className="mt-0.5 text-[13px] leading-relaxed text-ink-soft break-words">{w.description}</p>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
