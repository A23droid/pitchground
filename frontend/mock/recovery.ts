import type { AttemptAnalysis } from "@/lib/types";

export interface RecoveryResult {
  preInterruption: { structure: number; fluency: number };
  postInterruption: { structure: number; fluency: number };
  recoverySeconds: number;
  relevanceMaintained: boolean;
  verdict: "strong-recovery" | "partial-recovery" | "weak-recovery";
}

export function generateRecoveryResult(
  transcript?: string,
  measuredLatencySeconds?: number,
): RecoveryResult {
  const text = transcript || recoveryTranscript;
  const parts = text.split(" ... [interrupted] ... ");
  const preText = parts[0] || "";
  const postText = parts[1] || "";

  const preWords = preText.trim().split(/\s+/).filter(Boolean);
  const postWords = postText.trim().split(/\s+/).filter(Boolean);

  const preFillers = (preText.match(/\b(uh+|um+|ah+|eh+|er+|mm+|hmm+|like|you know)\b/gi) || []).length;
  const postFillers = (postText.match(/\b(uh+|um+|ah+|eh+|er+|mm+|hmm+|like|you know)\b/gi) || []).length;

  const preStructure = Math.min(100, Math.max(40, Math.round(Math.min(50, preWords.length * 1.6) + 40)));
  const preFluency = Math.min(100, Math.max(35, Math.round(100 - (preFillers / Math.max(1, preWords.length)) * 120)));

  const postStructure = Math.min(100, Math.max(30, Math.round(Math.min(50, postWords.length * 1.5) + 35)));
  const postFluency = Math.min(100, Math.max(30, Math.round(100 - (postFillers / Math.max(1, postWords.length)) * 140)));

  const recoverySeconds = measuredLatencySeconds ? Number(measuredLatencySeconds.toFixed(1)) : 2.1;

  // Check if post-interruption maintained topical relevance
  const preKeywords = new Set(preWords.map((w) => w.toLowerCase()).filter((w) => w.length > 3));
  let overlap = 0;
  for (const w of postWords) {
    if (preKeywords.has(w.toLowerCase())) overlap++;
  }
  const relevanceMaintained = overlap > 0 || postWords.length > 5;

  const fluencyDrop = preFluency - postFluency;
  const verdict: "strong-recovery" | "partial-recovery" | "weak-recovery" =
    fluencyDrop <= 8 && relevanceMaintained
      ? "strong-recovery"
      : fluencyDrop <= 20
      ? "partial-recovery"
      : "weak-recovery";

  return {
    preInterruption: { structure: preStructure, fluency: preFluency },
    postInterruption: { structure: postStructure, fluency: postFluency },
    recoverySeconds,
    relevanceMaintained,
    verdict,
  };
}

export const recoveryTranscript =
  "So a hash map achieves average constant time lookup because it computes a hash of the key and ... [interrupted] ... right, and that hash maps directly to a bucket index, so most lookups touch just one bucket instead of scanning a list.";

export const interruptionPrompt =
  "Explain how a hash map achieves average O(1) lookup time.";
