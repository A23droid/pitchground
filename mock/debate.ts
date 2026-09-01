import type {
  DebateAnalysis,
  DebateConfig,
  DebatePosition,
  DebateReport,
  DebateRoundData,
  DebateTopic,
  FailureDiagnosis,
  Language,
  TargetedChallenge,
} from "@/lib/types";

export const DEBATE_TOPICS: DebateTopic[] = [
  {
    id: "topic-ai-codegen",
    title: "AI Code Generation Tools in Production",
    category: "Technology & AI",
    context:
      "Automated coding assistants like Copilot and Claude are increasingly writing production software.",
    forPerspective:
      "AI accelerators multiply developer velocity and automate boilerplate, freeing engineers for system architecture.",
    againstPerspective:
      "Unvetted AI-generated code introduces insidious security vulnerabilities and technical debt that outpaces review capacity.",
  },
  {
    id: "topic-remote-work",
    title: "Mandatory In-Office Return for Engineering Teams",
    category: "Work & Society",
    context:
      "Major tech enterprises are enforcing 5-day return-to-office mandates to foster mentorship and speed.",
    forPerspective:
      "In-person collaboration accelerates junior mentorship, impromptu whiteboard architecture, and team cohesion.",
    againstPerspective:
      "Strict mandates kill hiring diversity, increase burnout, and ignore proven async remote productivity metrics.",
  },
  {
    id: "topic-microservices",
    title: "Microservices vs. Modular Monolith for Startups",
    category: "Software Engineering",
    context:
      "Early-stage engineering teams must decide between distributed services or a structured single binary.",
    forPerspective:
      "Microservices enforce team boundary isolation and allow independent scaling of critical hotpaths early on.",
    againstPerspective:
      "Distributed transactions and deployment overhead drain early startup velocity before product-market fit.",
  },
  {
    id: "topic-ai-creativity",
    title: "Generative AI and the Future of Human Intellectual Property",
    category: "Education",
    context:
      "Foundation models trained on public web knowledge challenge traditional authorship and ownership frameworks.",
    forPerspective:
      "Knowledge synthesis is the foundation of progress; generative models democratize creative capability for everyone.",
    againstPerspective:
      "Training on uncompensated human work without consent commodifies human effort and discourages original creation.",
  },
];

export interface MultilingualDebateData {
  userOpening: string;
  aiCounter: string;
  userRebuttal: string;
  aiCounter2: string;
  userClosing: string;
}

export const MULTILINGUAL_DEBATE_SCRIPTS: Record<Language, Record<string, MultilingualDebateData>> = {
  English: {
    "topic-ai-codegen": {
      userOpening:
        "AI coding assistants fundamentally transform engineering productivity. By eliminating routine boilerplate and generating initial test harnesses, developers can focus on high-level system architecture and edge cases. In real-world teams, we see feature cycle times cut in half without degrading quality when paired with automated test suites.",
      aiCounter:
        "While velocity gains are undeniable, your argument assumes developers actually review every generated line. Recent empirical studies show that developers accept flawed code suggestions over 40% of the time due to automation bias, introducing silent vulnerabilities and subtle architectural drift that no test suite catches.",
      userRebuttal:
        "Well, um... I think that review tools are also improving. And, you know, good engineers always check the code before merging anyway, so... like, developers will just learn to be more careful with AI tools over time.",
      aiCounter2:
        "Relying on developers to 'just be careful' historically fails under deadline crunch. When release pressure spikes, cognitive fatigue leads engineers to click approve on unvetted code, making AI a force multiplier for catastrophic vulnerabilities.",
      userClosing:
        "That's why organizations implement multi-stage static analysis and policy gates. The solution isn't halting AI adoption—it is hardening the automated verification pipeline so developers get high velocity with zero compromise on safety.",
    },
    default: {
      userOpening:
        "My core position is that proactive adoption of this technology delivers compounding efficiency advantages. The productivity yield vastly outweighs the transitional friction when implemented with proper engineering guardrails.",
      aiCounter:
        "That perspective underestimates systemic downside risk. The friction isn't merely transitional; it fundamentally compromises long-term reliability and team autonomy in ways standard guardrails cannot mitigate.",
      userRebuttal:
        "Um, but if we don't adopt it, we get left behind. And obviously we would have monitoring in place, so the risks are, like, mostly manageable if the team is smart about it.",
      aiCounter2:
        "Competitiveness cannot come at the expense of fundamental structural integrity. Over-indexing on immediate speed always results in exponential refactoring costs down the road.",
      userClosing:
        "By enforcing strict architectural boundaries from day one, we harness maximum leverage while keeping long-term maintenance costs predictable and controlled.",
    },
  },
  Malayalam: {
    "topic-ai-codegen": {
      userOpening:
        "AI coding assistants developers-ന്റെ productivity വലിയ രീതിയിൽ കൂട്ടുന്നുണ്ട്. Boilerplate code-ഉം unit test-കളും വേഗത്തിൽ generate ചെയ്യാൻ കഴിയുന്നതുകൊണ്ട് engineers-ന് core architecture-ലും business logic-ലും കൂടുതൽ ശ്രദ്ധ കേന്ദ്രീകരിക്കാം. ഇത് development cycle speed ഇരട്ടിയാക്കും.",
      aiCounter:
        "Speed കൂടുന്നുണ്ടെന്നത് ശരിയാണ്, പക്ഷെ automation bias കാരണം developers പലപ്പോഴും generated code കൃത്യമായി review ചെയ്യാതെ approve ചെയ്യുന്നു. ഇത് സിസ്റ്റത്തിൽ undetected security bugs-ഉം maintenance overhead-ഉം ഉണ്ടാക്കില്ലേ?",
      userRebuttal:
        "അത്... developers ശ്രദ്ധിച്ചാൽ മതിയാകും. പിന്നെ automation tools-ഉം വരുന്നുണ്ടല്ലോ, അതുകൊണ്ട് അത്ര വലിയ പ്രശ്നം വരില്ലെന്നാണ് എന്റെ ഒരു ഇത്...",
      aiCounter2:
        "Deadline പ്രഷർ വരുമ്പോൾ ആരും അത്ര സൂക്ഷ്മമായി review ചെയ്യില്ല. ഇത് critical security loopholes ഉണ്ടാക്കാനുള്ള സാധ്യത വളരെ കൂടുതലാണ്.",
      userClosing:
        "അതുകൊണ്ടാണ് automated CI/CD security scanning നിർബന്ധമാക്കുന്നത്. AI ഉപയോഗിക്കുന്നതിനൊപ്പം ശക്തമായ automated testing കൂടി ചേരുമ്പോൾ സുരക്ഷ ഉറപ്പാക്കാം.",
    },
    default: {
      userOpening:
        "ഈ സാങ്കേതികവിദ്യ നടപ്പിലാക്കുന്നത് വഴി വലിയ സാമ്പത്തിക, പ്രൊഡക്റ്റിവിറ്റി നേട്ടങ്ങൾ ഉണ്ടാക്കാൻ സാധിക്കും. കൃത്യമായ നിയന്ത്രണങ്ങളോടെ ഇത് ഉപയോഗിച്ചാൽ റിസ്ക് കുറയ്ക്കാനാകും.",
      aiCounter:
        "നിയന്ത്രണങ്ങൾ എപ്പോഴും പ്രാക്ടിക്കലായി വർക്ക് ആകണമെന്നില്ല. ഇത് സിസ്റ്റത്തിന്റെ അടിസ്ഥാന സുരക്ഷയെയും ദീർഘകാല സ്ഥിരതയെയും സാരമായി ബാധിക്കും.",
      userRebuttal:
        "എങ്കിലും... റിസ്ക് ഉണ്ടെന്ന് കരുതി പുതിയ മാറ്റങ്ങൾ കൊണ്ടുവരാതിരിക്കാൻ പറ്റില്ലല്ലോ. കൃത്യമായ monitoring ഉണ്ടെങ്കിൽ ഇത് മാനേജ് ചെയ്യാം.",
      aiCounter2:
        "അനിയന്ത്രിതമായ വേഗത ദീർഘകാലാടിസ്ഥാനത്തിൽ സിസ്റ്റം തകർച്ചയിലേക്ക് നയിക്കും. അടിസ്ഥാന ഉറപ്പില്ലാതെ വേഗത കൂട്ടുന്നത് അപകടകരമാണ്.",
      userClosing:
        "ശരിയായ policy framework-ഉം continuous audit-ഉം ഉണ്ടെങ്കിൽ risk പൂർണ്ണമായും ഒഴിവാക്കി മികച്ച റിസൾട്ട് ഉണ്ടാക്കാം.",
    },
  },
  Hindi: {
    "topic-ai-codegen": {
      userOpening:
        "AI code generation tools developers ki productivity ko significantly boost karte hain. Repetitive boilerplate code aur test cases seconds mein ban jate hain, jisse engineers high-level system design aur core logic par focus kar sakte hain.",
      aiCounter:
        "Lekin speed ke chakkar mein security compromise ho rahi hai. Automation bias ki wajah se developers generated code ko blindly accept kar lete hain, jisse hidden vulnerabilities aur technical debt grow hota hai.",
      userRebuttal:
        "Umm... code review process strong karke hum isko handle kar sakte hain. Aur developers bhi dheere dheere samajh jaenge ki kahan verify karna zaroori hai.",
      aiCounter2:
        "Deadline pressure mein developers deep audit nahi karte. Ek single unchecked vulnerability poore enterprise infrastructure ko compromise kar sakti hai.",
      userClosing:
        "Isliye automated security pipelines aur strict linting gates mandate kiye jaate hain. AI velocity ke sath automated verification combine karke hum maximum safety ensure karte hain.",
    },
    default: {
      userOpening:
        "Mera mukhya tarka hai ki is technology ko proactively apnana team ki overall efficiency ko naye level par le jata hai. Proper guidelines ke sath yeh risk-free hai.",
      aiCounter:
        "Aap long-term risks ko ignore kar rahe hain. Guidelines banana aasan hai par fast-paced production environment mein yeh fail ho jati hain.",
      userRebuttal:
        "Lekin agar hum risk ke darr se ruk gaye toh hum industry mein peeche reh jaenge. Isliye balance maintain karna hi better approach hai.",
      aiCounter2:
        "Bina strong foundation ke speed sirf technical debt aur failure rate badhati hai.",
      userClosing:
        "Proper architectural benchmarks aur continuous testing ke sath hum long-term stability aur fast delivery dono achieve kar sakte hain.",
    },
  },
  Mixed: {
    "topic-ai-codegen": {
      userOpening:
        "AI copilots use karne se developer throughput drastically improve hota hai. Boilerplate write-up aur standard CRUD APIs automatically ban jaate hain, so engineers can focus on scale and resilient architecture.",
      aiCounter:
        "Par issue yeh hai ki team lead level par code audit impossible ho jata hai when volume explodes. Studies prove developers develop automation fatigue and overlook subtle security leaks.",
      userRebuttal:
        "I mean, CI/CD pipeline mein static security analyzers use kar sakte hain. And eventually team standard establish ho jata hai, so completely block karna logical nahi hai.",
      aiCounter2:
        "Static analyzers complex logical flaws aur subtle race conditions detect nahi kar sakte. AI blind reliance will inevitably cause major production downtime.",
      userClosing:
        "The goal is hybrid synergy: AI handles initial generation while human engineers focus strictly on vulnerability verification and integration boundaries.",
    },
    default: {
      userOpening:
        "Strategic adoption se massive leverage milta hai. With structured guardrails, the competitive advantage is way higher than potential downsides.",
      aiCounter:
        "Theoretical guardrails production chaos mein sustain nahi karte. Long term structural debt becomes exponential.",
      userRebuttal:
        "Um, every new framework brings some debt initially. Proper linting aur automated observability se we can easily balance out the impact.",
      aiCounter2:
        "Rushing velocity without deep sanity checks is recipe for disaster in mission-critical applications.",
      userClosing:
        "Structured validation gates establish a safe envelope so team speed accelerates without risking platform integrity.",
    },
  },
};

export function getDebateScript(topicId: string, language: Language): MultilingualDebateData {
  const langTable = MULTILINGUAL_DEBATE_SCRIPTS[language] ?? MULTILINGUAL_DEBATE_SCRIPTS.English;
  return langTable[topicId] ?? langTable.default;
}

export function generateDebateAnalysis(config: DebateConfig): DebateAnalysis {
  const isMultilingual = config.language !== "English";

  return {
    argumentation: 84,
    rebuttal: 51,
    communication: 72,
    pressureHandling: 58,
    languageFidelity: isMultilingual ? 86 : 82,
    codeSwitchingRatio: config.language === "Mixed" ? 42 : config.language === "English" ? 0 : 14,
    overallScore: 66,
    openingScore: 85,
    rebuttalScore: 51,
    keyObservation:
      "Strong conceptual opening backed by clear rationale; under direct AI counter-pressure, rebuttal reverted to defensive generalizations rather than refuting the opponent's premise.",
  };
}

export function generateDebateDiagnosis(analysis: DebateAnalysis): FailureDiagnosis {
  const openingRebuttalDelta = analysis.openingScore - analysis.rebuttalScore;

  return {
    headline: "Your opening argument was structured and persuasive, but your rebuttal collapsed under counter-pressure.",
    explanation: `Your opening score reached ${analysis.openingScore}%, demonstrating strong thesis clarity and framing. However, upon facing the opponent's counterargument, your rebuttal score dropped by ${openingRebuttalDelta} points (${analysis.rebuttalScore}%). Instead of dismantling the counterargument's core premise, your response retreated into general assertions ("developers will just be careful") with high pause latency.`,
    deltas: [
      {
        label: "Argumentation clarity",
        before: analysis.openingScore,
        after: analysis.rebuttalScore,
        unit: "%",
        direction: "down-is-bad",
      },
      {
        label: "Direct premise refutation",
        before: 82,
        after: 44,
        unit: "%",
        direction: "down-is-bad",
      },
      {
        label: "Filler word rate",
        before: 4,
        after: 16,
        unit: "count",
        direction: "up-is-bad",
      },
      {
        label: "Counter-framing agility",
        before: 80,
        after: 50,
        unit: "%",
        direction: "down-is-bad",
      },
    ],
    rootCause: "pressure-structure-collapse",
    confidence: 0.88,
    occurrences: 2,
  };
}

export function generateDebateChallenge(config: DebateConfig): TargetedChallenge {
  return {
    id: `debate-chal-${Date.now()}`,
    objective: "Master the Point-Refutation-Turnaround (PRT) Rebuttal Framework under 30s counter-pressure.",
    framework: [
      "1. Acknowledge & Isolate Premise",
      "2. Expose Fallacy or Boundary Condition",
      "3. Turn Around to Reinforce Your Thesis",
    ],
    prompt: `Deliver a 30-second rebuttal against the premise that 'AI tools inevitably introduce unmanageable security debt' using the PRT framework.`,
    timeLimitSeconds: 30,
    weaknessTargeted: "Direct rebuttal under adversarial pushback",
  };
}
