import type { Language, RoundQuestion, ScenarioConfig } from "@/lib/types";

export interface InterviewTopicSet {
  topic: string;
  baseline: string;
  pressure: string;
  replay: string;
}

export const INTERVIEW_TOPICS: InterviewTopicSet[] = [
  {
    topic: "Database Systems",
    baseline: "Explain database indexing and why it improves query performance.",
    pressure: "You have 20 seconds. Explain when indexing can actually hurt database performance.",
    replay: "You have 20 seconds. Explain the trade-off between read speed and write speed that indexes introduce.",
  },
  {
    topic: "Operating Systems",
    baseline: "Explain what a deadlock is and the conditions required for one to occur.",
    pressure: "You have 20 seconds. Explain one practical way an OS can recover from a deadlock.",
    replay: "You have 20 seconds. Explain why deadlock prevention is more expensive than deadlock detection.",
  },
  {
    topic: "System Design",
    baseline: "Explain how a cache improves system performance and where you'd place one.",
    pressure: "You have 20 seconds. Explain what happens when a cache goes stale and how you'd handle it.",
    replay: "You have 20 seconds. Explain the difference between write-through and write-back caching.",
  },
  {
    topic: "Networking",
    baseline: "Explain the difference between TCP and UDP and when you'd choose each.",
    pressure: "You have 20 seconds. Explain why UDP is preferred for real-time video calls.",
    replay: "You have 20 seconds. Explain what a three-way handshake accomplishes.",
  },
  {
    topic: "Data Structures & Algorithms",
    baseline: "Explain how a hash map achieves average O(1) lookup time.",
    pressure: "You have 20 seconds. Explain what causes a hash map's performance to degrade.",
    replay: "You have 20 seconds. Explain the trade-off between array-based and linked-list-based structures.",
  },
  {
    topic: "Object-Oriented Design",
    baseline: "Explain the difference between inheritance and composition.",
    pressure: "You have 20 seconds. Explain why 'composition over inheritance' is common advice.",
    replay: "You have 20 seconds. Explain how an interface differs from an abstract class.",
  },
];

export const MULTILINGUAL_INTERVIEW_TRANSCRIPTS: Record<
  Language,
  { baseline: string; pressure: string; retry: string }
> = {
  English: {
    baseline:
      "Indexing works by creating a separate data structure, usually a B-tree, that stores column values alongside pointers to the actual rows. This lets the database jump straight to matching rows instead of scanning the whole table, which turns an O(n) lookup into roughly O(log n).",
    pressure:
      "Okay so, um, indexing can hurt performance because, like, every time you insert or update a row the database also has to, uh, update the index, so writes get slower, and also, um, if you index a column that doesn't get queried much you're just wasting storage and, uh, memory basically for no reason.",
    retry:
      "Indexes speed up reads but slow down writes, since every insert or update also has to update the index structure. Definition: an index is extra bookkeeping for faster lookups. Reason: that bookkeeping costs time on every write. Example: a heavily-indexed logging table can slow ingestion significantly.",
  },
  Malayalam: {
    baseline:
      "Database indexing എന്ന് പറയുന്നത് ഒരു B-tree അല്ലെങ്കിൽ separate data structure ഉണ്ടാക്കി table-ലെ rows-ലേക്ക് direct pointer കൊടുക്കുന്നതാണ്. ഇത് മുഴുവൻ table scan ചെയ്യുന്നതിന് പകരം O(log n) time-ൽ search ചെയ്യാൻ സഹായിക്കുന്നു.",
    pressure:
      "അത്... indexing write operations-നെ slow ആക്കും, കാരണം ഓരോ insert വരുമ്പോഴും index-ഉം update ചെയ്യണം. പിന്നെ ആവശ്യമില്ലാത്ത column-ൽ index ഇട്ടാൽ memory waste ആകും... അതാണ് main problem.",
    retry:
      "Definition: Indexing എന്നത് search speed കൂട്ടാനുള്ള ഒരു auxiliary data structure ആണ്. Reason: Read speed കൂടുമെങ്കിലും write speed കുറയും കാരണം ഓരോ insert-ലും index structure rebuild ചെയ്യേണ്ടി വരും. Example: Logging table-ൽ അനാവശ്യ index write latency കൂട്ടും.",
  },
  Hindi: {
    baseline:
      "Database indexing ek alag data structure hota hai, usually B-tree, jo rows ke direct pointers store karta hai. Isse pure table scan ki jagah O(log n) time mein exact rows directly lookup ho jati hain.",
    pressure:
      "Matlab... indexing se write operations slow ho jate hain kyunki har naye insert par index ko bhi update karna padta hai, aur unnecessary columns par memory waste hoti hai.",
    retry:
      "Definition: Index ek helper data structure hai jo read speed badhata hai. Reason: Lekin har write par extra overhead hota hai kyunki index update required hai. Example: High-throughput write heavy tables par indexing se latency spike ho sakti hai.",
  },
  Mixed: {
    baseline:
      "Indexing basically ek secondary structure create karta hai with pointers to disk rows. Full table scan ki jagah binary search jaisa O(log n) lookup possible ho jata hai.",
    pressure:
      "Like, writes mein heavy penalty lagta hai. Every insert requires index node balancing, and agar read query frequent nahi hai toh space and IO dono waste hote hain.",
    retry:
      "Definition: Indexes provide fast pointer-based lookups. Reason: Write amplification occurs on each mutate operation. Example: High-velocity analytics ingestion tables suffer severe write lag with multiple active indexes.",
  },
};

export function getInterviewQuestions(topic: string, language: Language = "English") {
  const set = INTERVIEW_TOPICS.find((t) => t.topic === topic) ?? INTERVIEW_TOPICS[0];
  return {
    baseline: {
      id: `q-baseline-${topic}`,
      prompt: set.baseline,
      round: "baseline" as const,
      pressure: "none" as const,
    },
    pressure: {
      id: `q-pressure-${topic}`,
      prompt: set.pressure,
      round: "pressure" as const,
      pressure: "time-limit" as const,
      timeLimitSeconds: 20,
    },
    replay: {
      id: `q-replay-${topic}`,
      prompt: set.replay,
      round: "replay" as const,
      pressure: "time-limit" as const,
      timeLimitSeconds: 20,
    },
  };
}
