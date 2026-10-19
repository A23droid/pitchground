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
        "AI coding assistants fundamentally transform engineering productivity, and the empirical evidence from the past three years is unambiguous. Teams using tools like GitHub Copilot have reported a 55% reduction in time spent on routine implementation tasks, allowing engineers to allocate cognitive resources to the genuinely hard problems: system design trade-offs, cross-service failure modes, and security architecture decisions that actually require human expertise. The productivity compounding effect is even stronger for junior engineers, who can now implement correct boilerplate and edge-case handling on the first attempt rather than through multiple review cycles. Feature cycle times in our team were cut by roughly half without any degradation in post-release defect rates, because the AI-generated scaffolding was paired with automated test suites that validate behaviour before the code ever reaches a human reviewer. The argument that AI-generated code is inherently dangerous conflates the tool with the process: static analysis, policy gates, and type systems are entirely compatible with AI-assisted development, and in many cases those safeguards are more consistently applied with AI acceleration because engineers are less fatigued by the routine parts.",
      aiCounter:
        "While velocity gains are genuinely documented, your argument makes a critical assumption that consistently fails in production environments: that developers actually review every AI-generated line with adequate diligence. Recent empirical studies, including a Stanford study on Copilot usage in real codebases, found that developers accept flawed code suggestions over 40% of the time under normal deadline conditions (a phenomenon called automation bias, the same cognitive failure mode that has caused aviation accidents). This isn't a training issue; it's a fundamental property of human attention under repetitive cognitive load. When a tool is fast and confident, the human reviewer unconsciously delegates trust to it. The result is silent vulnerabilities (SQL injection patterns, broken access control logic, and subtle concurrency bugs) that pass code review precisely because the reviewer assumed the AI had handled it. No automated test suite catches semantically correct but architecturally insecure code. And the damage compounds: once AI-generated patterns are established in a codebase, they replicate through copy-paste faster than any manual code would, turning a single flawed suggestion into an organisation-wide vulnerability surface.",
      userRebuttal:
        "Well, um... I think that review tools are also improving significantly. And, you know, good engineers always do check the code before merging; that's a process failure, not an AI failure. And like, developers will definitely learn to be more critical of AI suggestions over time as the industry matures. Static analysis catches most of the security issues you're describing anyway, so the risk profile isn't fundamentally different from human-written code, which also has high defect rates. The automation bias argument could be applied to any kind of tooling, not just AI.",
      aiCounter2:
        "Relying on developers to 'just be more careful' is exactly the argument that has failed in every high-stakes engineering context we have historical data on. Under deadline crunch (which is the normal operating state of most engineering teams), cognitive fatigue is not an exception, it's the baseline. When release pressure spikes, even experienced engineers click approve on unvetted code at rates that the data clearly shows. And your rebuttal to the automation bias argument (that we should apply it to all tools) actually strengthens my position: AI assistants generate code at a rate that outpaces any prior tooling by two orders of magnitude. The scale of exposure is categorically different. Static analysis catches syntactically malformed code but is largely blind to logic vulnerabilities that are syntactically valid. The combination of high generation rate and automation bias creates a multiplication of risk that the industry has simply not had to manage before.",
      userClosing:
        "That is precisely why leading engineering organisations implement multi-stage verification pipelines: mandatory static security analysis, SAST and DAST tooling, and architectural review gates that specifically target AI-generated code paths. The solution isn't to halt AI adoption and cede the productivity advantage to competitors; it is to harden the automated verification layer so that velocity and safety are not traded against each other but engineered together. The teams that are winning are not the ones that avoid AI tools; they are the ones that have built governance structures sophisticated enough to capture the upside while systematically eliminating the risk surface.",
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

export function generateDebateAnalysis(config: DebateConfig, rounds?: DebateRoundData[]): DebateAnalysis {
  const isMultilingual = config.language !== "English";
  const openingText = rounds?.find((r) => r.round === 1)?.userTranscript || "";
  const rebuttalText = rounds?.find((r) => r.round === 2)?.userTranscript || "";
  const aiCounter = rounds?.find((r) => r.round === 2)?.aiCounterTranscript || "";

  // 1. Opening argument scoring (depth, thesis grounding, causal tokens)
  const openWords = openingText.trim().split(/\s+/).filter(Boolean);
  const openWordCount = openWords.length;
  const causalRegex = /\b(because|therefore|leads to|results in|proves|evidence|fundamental|specifically|architecture|impact|scale|ensures|leverage)\b/gi;
  const causalHits = (openingText.match(causalRegex) || []).length;
  const openingDepthScore = Math.min(45, openWordCount * 0.6);
  const openingLogicScore = Math.min(35, causalHits * 7);
  const openingScore = openWordCount > 0 ? Math.min(100, Math.max(15, Math.round(openingDepthScore + openingLogicScore + 15))) : 0;

  // 2. Rebuttal argument scoring (counter-premise refutation, contrast tokens, direct address)
  const rebutWords = rebuttalText.trim().split(/\s+/).filter(Boolean);
  const rebutWordCount = rebutWords.length;
  const refutationRegex = /\b(however|contrary|flaw|misunderstands|overlooks|while|instead|mitigate|safeguard|tradeoff|actually|verify|boundary|isolate)\b/gi;
  const refutationHits = (rebuttalText.match(refutationRegex) || []).length;

  // Check overlap against AI counter premise
  const aiTokens = new Set(aiCounter.toLowerCase().split(/\s+/).filter((w) => w.length > 4));
  let premiseOverlap = 0;
  for (const w of rebutWords) {
    if (aiTokens.has(w.toLowerCase())) premiseOverlap++;
  }
  const rebuttalDepthScore = Math.min(40, rebutWordCount * 0.7);
  const rebuttalRefuteScore = Math.min(35, refutationHits * 9);
  const rebuttalTargetScore = Math.min(25, premiseOverlap * 6);
  const rebuttalScore = rebutWordCount > 0 ? Math.min(100, Math.max(15, Math.round(rebuttalDepthScore + rebuttalRefuteScore + rebuttalTargetScore))) : 0;

  // 3. Composite dimensions
  const argumentation = Math.round(openingScore * 0.55 + rebuttalScore * 0.45);
  const rebuttal = rebuttalScore;

  // 4. Communication: vocabulary diversity across all user speeches
  const allWords = [...openWords, ...rebutWords];
  const uniqueWords = new Set(allWords.map((w) => w.toLowerCase()));
  const typeTokenRatio = allWords.length > 0 ? uniqueWords.size / allWords.length : 0.0;
  const communication = allWords.length > 0 ? Math.min(100, Math.max(15, Math.round(typeTokenRatio * 55 + Math.min(45, allWords.length * 0.35)))) : 0;

  // 5. Pressure handling: retention of fluency between opening and rebuttal
  const fluencyDelta = openingScore - rebuttalScore;
  const pressureHandling = (openWordCount > 0 && rebutWordCount > 0)
    ? Math.min(100, Math.max(20, Math.round(100 - Math.max(0, fluencyDelta) * 1.3)))
    : (openWordCount > 0 ? 50 : 0);

  // 6. Language fidelity & code-switching
  const allText = `${openingText} ${rebuttalText}`;
  const latinCount = (allText.match(/[a-zA-Z]/g) || []).length;
  const indicCount = (allText.match(/[\u0900-\u0D7F]/g) || []).length;
  const totalChars = Math.max(1, latinCount + indicCount);
  const codeSwitchingRatio = isMultilingual ? Math.min(100, Math.round((latinCount / totalChars) * 100)) : 0;
  const languageFidelity = isMultilingual ? (totalChars > 1 ? Math.min(100, Math.max(10, Math.round((indicCount / totalChars) * 100))) : 0) : 100;

  // 7. Overall score
  const overallScore = (openWordCount > 0 || rebutWordCount > 0)
    ? Math.round(0.30 * argumentation + 0.30 * rebuttal + 0.20 * communication + 0.20 * pressureHandling)
    : 0;

  const keyObservation =
    rebuttalScore >= openingScore - 8
      ? "Strong debate performance with agile counter-argument refutation and resilient vocal conviction under timer pressure."
      : "Persuasive opening premise; however, under direct AI counter-pressure, the rebuttal retreated to defensive generalizations rather than refuting the opposing boundary conditions.";

  return {
    argumentation,
    rebuttal,
    communication,
    pressureHandling,
    languageFidelity,
    codeSwitchingRatio,
    overallScore,
    openingScore,
    rebuttalScore,
    keyObservation,
  };
}

export function generateDebateDiagnosis(analysis: DebateAnalysis): FailureDiagnosis {
  const openingRebuttalDelta = analysis.openingScore - analysis.rebuttalScore;

  return {
    headline:
      openingRebuttalDelta > 15
        ? "Your opening argument was structured and persuasive, but your rebuttal collapsed under counter-pressure."
        : "Consistent debate delivery with controlled thesis framing across both opening and rebuttal rounds.",
    explanation: `Your opening score reached ${analysis.openingScore}%, demonstrating thesis clarity and structural framing. In the rebuttal phase against the AI counter-argument, your rebuttal score was ${analysis.rebuttalScore}% (delta: ${openingRebuttalDelta > 0 ? "-" : "+"}${Math.abs(openingRebuttalDelta)} points). Overall argumentation scored ${analysis.argumentation}%, with pressure handling at ${analysis.pressureHandling}%.`,
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
        before: analysis.openingScore,
        after: analysis.rebuttal,
        unit: "%",
        direction: "down-is-bad",
      },
      {
        label: "Communication delivery",
        before: analysis.communication,
        after: Math.max(30, analysis.communication - Math.max(0, Math.round(openingRebuttalDelta * 0.4))),
        unit: "%",
        direction: "down-is-bad",
      },
      {
        label: "Pressure handling agility",
        before: 85,
        after: analysis.pressureHandling,
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
