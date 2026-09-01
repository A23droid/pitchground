import type { AttemptAnalysis } from "@/lib/types";

export interface RecoveryResult {
  preInterruption: { structure: number; fluency: number };
  postInterruption: { structure: number; fluency: number };
  recoverySeconds: number;
  relevanceMaintained: boolean;
  verdict: "strong-recovery" | "partial-recovery" | "weak-recovery";
}

export function generateRecoveryResult(): RecoveryResult {
  return {
    preInterruption: { structure: 80, fluency: 83 },
    postInterruption: { structure: 74, fluency: 76 },
    recoverySeconds: 2.1,
    relevanceMaintained: true,
    verdict: "strong-recovery",
  };
}

export const recoveryTranscript =
  "So a hash map achieves average constant time lookup because it computes a hash of the key and — [interrupted] — right, and that hash maps directly to a bucket index, so most lookups touch just one bucket instead of scanning a list.";

export const interruptionPrompt =
  "Explain how a hash map achieves average O(1) lookup time.";
