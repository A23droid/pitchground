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
  const text = transcript !== undefined ? transcript : recoveryTranscript;
  const parts = text.split(" ... [interrupted] ... ");
  const preText = parts[0] || "";
  const postText = parts[1] || "";

  const preWords = preText.trim().split(/\s+/).filter(Boolean);
  const postWords = postText.trim().split(/\s+/).filter(Boolean);

  if (preWords.length === 0 && postWords.length === 0) {
    return {
      preInterruption: { structure: 0, fluency: 0 },
      postInterruption: { structure: 0, fluency: 0 },
      recoverySeconds: measuredLatencySeconds !== undefined ? Number(measuredLatencySeconds.toFixed(1)) : 0,
      relevanceMaintained: false,
      verdict: "weak-recovery",
    };
  }

  const preFillers = (preText.match(/\b(uh+|um+|ah+|eh+|er+|mm+|hmm+|like|you know)\b/gi) || []).length;
  const postFillers = (postText.match(/\b(uh+|um+|ah+|eh+|er+|mm+|hmm+|like|you know)\b/gi) || []).length;

  const preStructure = preWords.length > 0 ? Math.min(100, Math.max(15, Math.round(Math.min(50, preWords.length * 1.6) + 30))) : 0;
  const preFluency = preWords.length > 0 ? Math.min(100, Math.max(15, Math.round(100 - (preFillers / preWords.length) * 120))) : 0;

  const postStructure = postWords.length > 0 ? Math.min(100, Math.max(15, Math.round(Math.min(50, postWords.length * 1.5) + 30))) : 0;
  const postFluency = postWords.length > 0 ? Math.min(100, Math.max(15, Math.round(100 - (postFillers / postWords.length) * 140))) : 0;

  const recoverySeconds = measuredLatencySeconds !== undefined ? Number(measuredLatencySeconds.toFixed(1)) : 0;

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
