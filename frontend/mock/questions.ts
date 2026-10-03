import type { RoundQuestion } from "@/lib/types";

interface TopicQuestionSet {
  baseline: string;
  pressure: string;
  replay: string;
}

const questionBank: Record<string, TopicQuestionSet> = {
  "Database Systems": {
    baseline: "Explain database indexing and why it improves query performance.",
    pressure: "You have 20 seconds. Explain when indexing can actually hurt database performance.",
    replay: "You have 20 seconds. Explain the trade-off between read speed and write speed that indexes introduce.",
  },
  "Operating Systems": {
    baseline: "Explain what a deadlock is and the conditions required for one to occur.",
    pressure: "You have 20 seconds. Explain one practical way an OS can recover from a deadlock.",
    replay: "You have 20 seconds. Explain why deadlock prevention is more expensive than deadlock detection.",
  },
  "System Design": {
    baseline: "Explain how a cache improves system performance and where you'd place one.",
    pressure: "You have 20 seconds. Explain what happens when a cache goes stale and how you'd handle it.",
    replay: "You have 20 seconds. Explain the difference between write-through and write-back caching.",
  },
  Networking: {
    baseline: "Explain the difference between TCP and UDP and when you'd choose each.",
    pressure: "You have 20 seconds. Explain why UDP is preferred for real-time video calls.",
    replay: "You have 20 seconds. Explain what a three-way handshake accomplishes.",
  },
  "Data Structures & Algorithms": {
    baseline: "Explain how a hash map achieves average O(1) lookup time.",
    pressure: "You have 20 seconds. Explain what causes a hash map's performance to degrade.",
    replay: "You have 20 seconds. Explain the trade-off between array-based and linked-list-based structures.",
  },
  "Object-Oriented Design": {
    baseline: "Explain the difference between inheritance and composition.",
    pressure: "You have 20 seconds. Explain why 'composition over inheritance' is common advice.",
    replay: "You have 20 seconds. Explain how an interface differs from an abstract class.",
  },
};

const fallback: TopicQuestionSet = {
  baseline: "Explain the core idea behind this topic and why it matters in practice.",
  pressure: "You have 20 seconds. Explain the biggest trade-off involved in this topic.",
  replay: "You have 20 seconds. Explain this concept the way you'd explain it to a teammate.",
};

export function getQuestionSet(topic: string): TopicQuestionSet {
  return questionBank[topic] ?? fallback;
}

export function buildBaselineQuestion(topic: string): RoundQuestion {
  return {
    id: `q-baseline-${topic}`,
    prompt: getQuestionSet(topic).baseline,
    round: "baseline",
    pressure: "none",
  };
}

export function buildPressureQuestion(topic: string): RoundQuestion {
  return {
    id: `q-pressure-${topic}`,
    prompt: getQuestionSet(topic).pressure,
    round: "pressure",
    pressure: "time-limit",
    timeLimitSeconds: 20,
  };
}

export function buildReplayQuestion(topic: string): RoundQuestion {
  return {
    id: `q-replay-${topic}`,
    prompt: getQuestionSet(topic).replay,
    round: "replay",
    pressure: "time-limit",
    timeLimitSeconds: 20,
  };
}
