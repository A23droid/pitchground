"use client";

import { Card } from "@/components/ui/Card";
import type { ProgressPoint } from "@/lib/types";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function ProgressChart({ data }: { data: ProgressPoint[] }) {
  return (
    <Card className="p-6">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="font-display text-lg text-ink">Structure, over time</h2>
        <span className="font-mono text-xs text-muted">last {data.length} sessions</span>
      </div>
      <p className="mb-4 text-[13px] text-ink-soft">
        The metric that breaks down first under pressure — and the one Pitchground trains hardest.
      </p>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
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
              tick={{ fill: "var(--muted)", fontSize: 11 }}
            />
            <YAxis
              domain={[40, 90]}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--muted)", fontSize: 11 }}
              width={30}
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
