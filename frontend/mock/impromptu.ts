import type {
  FailureDiagnosis,
  ImpromptuAnalysis,
  ImpromptuConfig,
  ImpromptuDuration,
  ImpromptuFluencyPoint,
  ImpromptuTopic,
  Language,
  TargetedChallenge,
} from "@/lib/types";

export const IMPROMPTU_TOPICS: ImpromptuTopic[] = [
  {
    id: "imp-distributed-traffic",
    prompt: "Explain how a distributed system is like rush hour traffic in a major city.",
    category: "Tech Metaphor",
    hint: "Think about bottlenecks, lane expansions (scaling), and traffic signals (rate limiting).",
  },
  {
    id: "imp-decision-under-uncertainty",
    prompt: "Should a team ship a product that is 80% ready, or wait until it reaches 99%?",
    category: "Crisis Decision",
    hint: "Consider market timing, cost of bugs, feedback loops, and customer trust.",
  },
  {
    id: "imp-silence-communication",
    prompt: "When is silence more powerful than speaking in leadership communication?",
    category: "Spontaneous Thought",
    hint: "Reflect on listening, intentional pauses, authority, and de-escalation.",
  },
  {
    id: "imp-fail-fast-myth",
    prompt: "Is 'fail fast' genuine wisdom or just an excuse for inadequate preparation?",
    category: "Abstract Concept",
    hint: "Examine iterative learning vs. avoidable negligence.",
  },
  {
    id: "imp-privacy-convenience",
    prompt: "If privacy and convenience are zero-sum, which should society optimize for?",
    category: "Crisis Decision",
    hint: "Think about biometric auth, smart assistants, and sovereign data rights.",
  },
];

export const MULTILINGUAL_IMPROMPTU_TRANSCRIPTS: Record<
  Language,
  Record<string, string>
> = {
  English: {
    "imp-distributed-traffic":
      "A distributed system is almost identical to urban rush hour traffic at a macro level. Consider peak Bangalore traffic: when demand is low, every car — every network packet — flows smoothly through its designated route with minimal delay. Now imagine a flash sale hits an e-commerce platform. Concurrent requests spike by 10×. Suddenly, single-lane roads — your central database or API gateway — become massive bottlenecks. Adding more servers is like adding highway lanes, which helps throughput, but if the exit ramp into your downstream service isn't wide enough, the queue simply shifts rather than disappears. Rate limiting is your traffic signal system — it's not glamorous, but without it, unconstrained bursts cause complete gridlock. Service meshes act like intelligent traffic routing, redirecting packets around accident-prone roads dynamically. And circuit breakers are the elevated flyover that simply refuses to let more cars in when the road below is at capacity. The core insight is that distributed systems, like road networks, are only as fast as their slowest interdependency — and optimising for throughput without designing for failure modes is like building a six-lane motorway that feeds into a single dirt road.",
    default:
      "When we examine the initial premise, the foundational argument is genuinely compelling. In the first phase, there is clear directional momentum and the logic holds together coherently. However, as complexity increases, you begin to encounter unexpected friction points that weren't apparent at the outset. The challenge at this stage is to maintain analytical discipline rather than defaulting to surface-level observations. A mature perspective acknowledges that the initial framing, while useful, can't fully account for the emergent behaviours that appear at scale. And so, um, the basic problem is that... you know, things start repeating, and like, it becomes hard to keep advancing the argument without circling back to prior points — which is exactly the failure mode we're trying to identify and correct.",
  },
  Malayalam: {
    "imp-distributed-traffic":
      "ഒരു distributed system-നെ നമ്മുടെ നഗരത്തിലെ rush hour traffic-മായി direct ആയി compare ചെയ്യാം. ആദ്യം traffic കുറവുള്ളപ്പോൾ എല്ലാ vehicles-ഉം സുഗമമായി move ചെയ്യും. എന്നാൽ പെട്ടെന്ന് heavy load വരുമ്പോൾ ഒരു single junction അല്ലെങ്കിൽ bottleneck റോഡുകൾ പൂർണ്ണമായും block ആകും. കൂടുതൽ server add ചെയ്യുന്നത് കൂടുതൽ വരികൾ ഉണ്ടാക്കുന്നത് പോലെയാണ്... പക്ഷെ exit junction ചെറുതാണെങ്കിൽ പിന്നെയും block വരും. അത്... പിന്നെയും വണ്ടികൾ കിടന്ന് വട്ടം കറങ്ങുന്നത് പോലെ, system-ലും requests queue-ൽ നിന്ന് നിന്ന് delay കൂടിക്കൊണ്ടേയിരിക്കും... വീണ്ടും വീണ്ടും ഒരേ delay തന്നെ വരും.",
    default:
      "ഈ വിഷയത്തിലേക്ക് നോക്കുമ്പോൾ തുടക്കത്തിൽ കാര്യങ്ങൾ വളരെ വ്യക്തമാണ്. ലക്ഷ്യം കൃത്യമാണെങ്കിൽ ആദ്യത്തെ കുറച്ചു സമയം നല്ല flow കിട്ടും. പക്ഷെ സമയം മുന്നോട്ട് പോകുമ്പോൾ... ആ... പിന്നെ ഒരേ കാര്യങ്ങൾ തന്നെ വീണ്ടും വീണ്ടും പറയേണ്ടി വരുന്ന അവസ്ഥ വരും, കാരണം പുതിയ പോയിന്റുകൾ പെട്ടെന്ന് ഓർമ്മയിൽ വരാതെ വാക്കുകൾ തടയും.",
  },
  Hindi: {
    "imp-distributed-traffic":
      "Distributed system bilkul rush hour traffic ki tarah behave karta hai. Starting mein jab load kam hota hai, har request smoothly process ho jati hai. Lekin jaise hi concurrent traffic badhta hai, narrow roads—jaise single database connection—massive bottleneck ban jati hain. Naye servers add karna highway par nayi lanes add karne jaisa hai, par agar exit bridge chhota hai toh jam vahi ka vahi rahega... Aur phir matlab, wahi jam lagta rehta hai, requests queue mein phans jati hain, aur baar baar wahi problem repeat hoti hai.",
    default:
      "Is vishay ko agar hum dekhein toh shuruat mein point bohot solid lagta hai. Shuru ke 20 seconds mein flow bohot accha rehta hai. Lekin jaise time aage badhta hai, naye examples na milne ki wajah se umm... wahi baat ghuma phira kar bolna shuru ho jata hai aur repetition badh jata hai.",
  },
  Mixed: {
    "imp-distributed-traffic":
      "Distributed architecture is literally identical to peak Bangalore rush hour. Off-peak time mein every packet reaches destination with zero latency. But jab flash sale jaisa heavy concurrency hit hota hai, bottlenecks emerge at un-indexed endpoints. Scaling horizontal pods is like opening flyovers, but without proper load balancers, downstream choke-points traffic ko completely stall kar dete hain... and then, you know, same circular waiting pattern loop ho jata hai.",
    default:
      "Initially the perspective is super straightforward and structured. First half mein argument build karna easy hota hai. But around 30 seconds ke baad, without a framework, ideas run dry ho jaate hain and circular repetition kick in karta hai.",
  },
};

export function getImpromptuTranscript(topicId: string, language: Language): string {
  const langTable = MULTILINGUAL_IMPROMPTU_TRANSCRIPTS[language] ?? MULTILINGUAL_IMPROMPTU_TRANSCRIPTS.English;
  return langTable[topicId] ?? langTable.default;
}

export function generateImpromptuAnalysis(config: ImpromptuConfig): ImpromptuAnalysis {
  const duration = config.durationSeconds;
  const isMultilingual = config.language !== "English";

  // Build fluency decay timeline matching the demo story:
  // Starts strong (~150 WPM, 0 fillers), decays at 35s+ (90 WPM, filler spike, word repetition).
  const timeline: ImpromptuFluencyPoint[] = [
    { second: 5, wpm: 148, fillerDensity: 0, repetitionCount: 0 },
    { second: 15, wpm: 152, fillerDensity: 1, repetitionCount: 0 },
    { second: 25, wpm: 140, fillerDensity: 2, repetitionCount: 1 },
    { second: 35, wpm: 110, fillerDensity: 6, repetitionCount: 4 },
    { second: 45, wpm: 92, fillerDensity: 11, repetitionCount: 8 },
    { second: Math.min(60, duration), wpm: 84, fillerDensity: 14, repetitionCount: 12 },
  ];

  return {
    fluencyTimeline: timeline,
    initialWpm: 150,
    finalWpm: 88,
    repetitionCount: 12,
    fillerCount: 14,
    coherence: 64,
    lexicalDiversity: 58,
    overallScore: 67,
    language: config.language,
    codeSwitchingDetected: config.language === "Mixed",
  };
}

export function generateImpromptuDiagnosis(analysis: ImpromptuAnalysis): FailureDiagnosis {
  const wpmDrop = analysis.initialWpm - analysis.finalWpm;

  return {
    headline: "You started with high fluency and strong conviction, but lexical momentum collapsed past the 30-second mark.",
    explanation: `Your speech began at a brisk ${analysis.initialWpm} WPM with zero structural hesitation. However, once the initial thesis was expressed, speech rate dropped by ${wpmDrop} WPM (${analysis.finalWpm} WPM) and ${analysis.repetitionCount} circular phrase repetitions emerged. Rather than advancing into a concrete example or actionable conclusion, the answer circled back to restating the opening metaphor.`,
    deltas: [
      {
        label: "Speaking pace",
        before: analysis.initialWpm,
        after: analysis.finalWpm,
        unit: "count",
        direction: "down-is-bad",
      },
      {
        label: "Filler density (late phase)",
        before: 1,
        after: 14,
        unit: "count",
        direction: "up-is-bad",
      },
      {
        label: "Vocabulary variety",
        before: 88,
        after: 54,
        unit: "%",
        direction: "down-is-bad",
      },
      {
        label: "Structural advancement",
        before: 90,
        after: 48,
        unit: "%",
        direction: "down-is-bad",
      },
    ],
    rootCause: "pressure-structure-collapse",
    confidence: 0.91,
    occurrences: 4,
  };
}

export function generateImpromptuChallenge(config: ImpromptuConfig): TargetedChallenge {
  return {
    id: `impromptu-chal-${Date.now()}`,
    objective: "Master the 30-second P-E-E-L Framework (Point → Explanation → Example → Link) to avoid circular repetition.",
    framework: [
      "1. Point (5s): State your one core premise",
      "2. Explanation (10s): Unpack the fundamental mechanics",
      "3. Example (10s): Anchor in one concrete scenario",
      "4. Link (5s): Tie back to the broader takeaway",
    ],
    prompt: `Deliver a 30-second impromptu speech on '${config.topic.prompt}' strictly following the PEEL progression without repeating any prior phrase.`,
    timeLimitSeconds: 30,
    weaknessTargeted: "Pacing decay and lexical repetition in extended speaking",
  };
}
