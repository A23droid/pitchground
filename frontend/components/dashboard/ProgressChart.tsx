"use client";

import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { ProgressPoint } from "@/lib/types";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function ProgressChart({ data, className }: { data: ProgressPoint[]; className?: string }) {
  return (
    <Card className={cn("w-full min-w-0 overflow-hidden p-4 sm:p-6", className)}>
      <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
        <h2 className="font-display text-base text-ink sm:text-lg">Structure, over time</h2>
        <span className="shrink-0 font-mono text-[11px] text-muted sm:text-xs">last {data.length} sessions</span>
      </div>
      <p className="mb-3 text-xs leading-relaxed text-ink-soft sm:mb-4 sm:text-[13px]">
        The metric that breaks down first under pressure, and the one Pitchground trains hardest.
      </p>
      <div className="h-48 w-full min-w-0 sm:h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 6, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="structureFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--lavender-ink)" stopOpacity={0.28} />
                <stop offset="100%" stopColor="var(--lavender-ink)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--line)" />
            <XAxis
              dataKey="sessionLabel"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--muted)", fontSize: 10 }}
              interval="preserveStartEnd"
              minTickGap={6}
              padding={{ left: 6, right: 6 }}
            />
            <YAxis
              domain={[40, 90]}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--muted)", fontSize: 10 }}
              width={28}
            />
            <Tooltip
              contentStyle={{
                background: "var(--paper-raised)",
                border: "1px solid var(--line)",
                borderRadius: 12,
                fontSize: 12,
                boxShadow: "0 8px 24px -12px rgba(32,26,12,0.25)",
              }}
              labelStyle={{ color: "var(--ink)", fontWeight: 600 }}
            />
            <Area
              type="monotone"
              dataKey="structure"
              stroke="var(--lavender-ink)"
              strokeWidth={2.5}
              fill="url(#structureFill)"
              animationDuration={1200}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
