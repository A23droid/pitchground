"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { LearnerProfile } from "@/lib/types";
import { Zap, Gauge, Languages } from "lucide-react";

export function RecommendedNext({ profile }: { profile: LearnerProfile }) {
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <Card className="flex flex-col justify-between p-6 lg:col-span-1">
        <div>
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-lavender">
            <Zap size={17} className="text-lavender-ink" />
          </div>
          <h3 className="font-display text-lg text-ink">Recommended next</h3>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{profile.recommendedNext.reason}</p>
        </div>
        <Link href="/start?difficulty=Intense&topic=Database%20Systems" className="mt-5">
          <Button className="w-full">Practice this weakness</Button>
        </Link>
      </Card>

      <Card className="p-6">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-amber-soft">
          <Gauge size={17} className="text-amber-ink" />
        </div>
        <h3 className="font-display text-lg text-ink">Pressure performance</h3>
        <ul className="mt-3 flex flex-col gap-3">
          {profile.pressurePatterns.map((p) => (
            <li key={p.type} className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-ink">{p.type}</p>
                <p className="text-[13px] text-ink-soft">{p.note}</p>
              </div>
              <Badge
                variant={p.impact === "High impact" ? "rose" : p.impact === "Medium impact" ? "amber" : "teal"}
                size="sm"
                className="shrink-0"
              >
                {p.impact}
              </Badge>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-6">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-teal-soft">
          <Languages size={17} className="text-teal-ink" />
        </div>
        <h3 className="font-display text-lg text-ink">Language performance</h3>
        <ul className="mt-3 flex flex-col gap-3">
          {profile.languagePatterns.map((l) => (
            <li key={l.language} className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-ink">{l.language}</p>
              <Badge
                variant={l.level === "Strong" ? "teal" : l.level === "Developing" ? "amber" : "rose"}
                size="sm"
              >
                {l.level}
              </Badge>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
