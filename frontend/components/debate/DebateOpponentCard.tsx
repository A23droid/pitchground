"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bot, Volume2, ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { DebatePosition } from "@/lib/types";

export function DebateOpponentCard({
  position,
  counterArgument,
  isSpeaking,
  onFinishedSpeaking,
}: {
  position: DebatePosition;
  counterArgument: string;
  isSpeaking: boolean;
  onFinishedSpeaking?: () => void;
}) {
  const [typedText, setTypedText] = useState("");
  const opponentPosition: DebatePosition = position === "For" ? "Against" : "For";

  useEffect(() => {
    if (!isSpeaking) {
      setTypedText(counterArgument);
      return;
    }
    setTypedText("");
    let i = 0;
    const interval = setInterval(() => {
      i += 3;
      setTypedText(counterArgument.slice(0, i));
      if (i >= counterArgument.length) {
        clearInterval(interval);
        if (onFinishedSpeaking) {
          setTimeout(onFinishedSpeaking, 600);
        }
      }
    }, 18);

    return () => clearInterval(interval);
  }, [counterArgument, isSpeaking, onFinishedSpeaking]);

  return (
    <Card className="relative overflow-hidden border-lavender/50 bg-lavender/15 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ink text-white shadow-soft">
            <Bot size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-ink">AI Opponent</p>
              <Badge variant="lavender" size="sm">
                Argues {opponentPosition}
              </Badge>
            </div>
            <p className="text-xs text-ink-soft">Adversarial Sparring Model</p>
          </div>
        </div>

        {isSpeaking && (
          <div className="flex items-center gap-1.5 rounded-full bg-lavender px-3 py-1 text-xs font-medium text-lavender-ink">
            <Volume2 size={13} className="animate-pulse" />
            <span>Countering…</span>
          </div>
        )}
      </div>

      <div className="mt-4 rounded-xl border border-line bg-paper-raised p-4">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted">
          <ShieldAlert size={12} className="text-amber-ink" />
          Direct Counter-Argument
        </div>
        <p className="min-h-[72px] text-sm leading-relaxed text-ink">
          {typedText}
          {isSpeaking && <span className="animate-pulse font-mono font-bold text-ink">▍</span>}
        </p>
      </div>

      {isSpeaking && (
        <div className="mt-3 flex items-center justify-center gap-1">
          {[6, 14, 22, 12, 18, 9, 16, 24, 11, 7, 15, 8].map((h, i) => (
            <motion.span
              key={i}
              className="w-[2.5px] rounded-full bg-ink"
              animate={{ height: [4, h, 4] }}
              transition={{ duration: 0.6 + (i % 3) * 0.15, repeat: Infinity, ease: "easeInOut" }}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

