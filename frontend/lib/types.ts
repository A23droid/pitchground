// Core domain types for Pitchground.
// These mirror the shape the eventual FastAPI backend will return, so the
// mock service layer can be swapped for real fetch() calls without the UI
// changing shape.

export type Language = "English" | "Malayalam" | "Hindi" | "Mixed";

export type Audience =
  | "Technical interviewer"
  | "Recruiter"
  | "Professor"
  | "Manager";

export type Difficulty = "Easy" | "Standard" | "Hard";

export type InterviewType = "Technical Interview";

export interface ScenarioConfig {
  interviewType: InterviewType;
  topic: string;
  audience: Audience;
  language: Language;
  difficulty: Difficulty;
}

export type PressureType = "none" | "time-limit" | "interruption";

export interface RoundQuestion {
  id: string;
  prompt: string;
  round: "baseline" | "pressure" | "replay" | "retry";
  pressure: PressureType;
  timeLimitSeconds?: number;
}

// --- Analysis -------------------------------------------------------------

export interface ContentAnalysis {
  correctness: number; // 0-100
  relevance: number;
  topicUnderstanding: number;
}

export interface CommunicationAnalysis {
  structure: number;
  clarity: number;
  coherence: number;
  fluency: number;
}

export interface VoiceAnalysis {
  speakingRateWpm: number;
  fillerCount: number;
  pauseCount: number;
  responseLatencySeconds: number;
}

export interface VisualAnalysis {
  gaze: number; // 0-100 engagement-style score
  posture: number;
  engagement: number;
}

export interface LanguageAnalysis {
  primaryLanguage: Language;
  codeSwitchingDetected: boolean;
  englishArticulation: number; // 0-100
}

export interface AttemptAnalysis {
  attemptId: string;
  content: ContentAnalysis;
  communication: CommunicationAnalysis;
  voice: VoiceAnalysis;
  visual: VisualAnalysis;
  language: LanguageAnalysis;
  overallScore: number;
}

// --- Diagnosis --------------------------------------------------------------

export interface DiagnosisMetricDelta {
  label: string;
  before: number;
  after: number;
  unit: "%" | "count" | "s" | "x";
  direction: "up-is-bad" | "down-is-bad" | "stable-is-good";
}

export interface FailureDiagnosis {
  headline: string;
  explanation: string;
  deltas: DiagnosisMetricDelta[];
  rootCause: "pressure-structure-collapse" | "language-transfer" | "recovery-failure";
  confidence: number; // 0-1
  occurrences: number; // how many prior sessions show this same pattern
}

// --- Challenge / Replay -----------------------------------------------------

export interface TargetedChallenge {
  id: string;
  objective: string;
  framework: string[]; // e.g. ["Definition", "Reason", "Example"]
  prompt: string;
  timeLimitSeconds: number;
  weaknessTargeted: string;
}

export interface ReplayConditions {
  topic: string;
  audience: Audience;
  language: Language;
  timeLimitSeconds: number;
  pressure: PressureType;
  weakness: string;
}

// --- Session ------------------------------------------------------------

export type AttemptStage =
  | "baseline"
  | "pressure"
  | "replay"
  | "retry";

export interface Attempt {
  id: string;
  stage: AttemptStage;
  question: RoundQuestion;
  transcript: string;
  analysis: AttemptAnalysis;
  createdAt: string;
}

export interface InterviewSession {
  id: string;
  config: ScenarioConfig;
  attempts: Attempt[];
  diagnosis?: FailureDiagnosis;
  challenge?: TargetedChallenge;
  replayConditions?: ReplayConditions;
  status: "in-progress" | "completed";
  createdAt: string;
}

// --- Learner Profile -----------------------------------------------------

export interface Weakness {
  id: string;
  label: string;
  severity: "high" | "medium" | "low";
  trend: "improving" | "worsening" | "stable";
  description: string;
}

export interface Strength {
  id: string;
  label: string;
  description: string;
}

export interface PressurePattern {
  type: "Time pressure" | "Interruption";
  impact: "High impact" | "Medium impact" | "Low impact";
  note: string;
}

export interface LanguagePattern {
  language: Language;
  level: "Strong" | "Developing" | "Needs work";
}

export interface ProgressPoint {
  sessionLabel: string;
  date: string;
  structure: number;
  fillers: number;
  englishArticulation: number;
}

export interface RecommendedChallenge {
  title: string;
  reason: string;
  weakness: string;
}

export interface LearnerProfile {
  name: string;
  sessionsCompleted: number;
  strengths: Strength[];
  weaknesses: Weakness[];
  pressurePatterns: PressurePattern[];
  languagePatterns: LanguagePattern[];
  progress: ProgressPoint[];
  recommendedNext: RecommendedChallenge;
  streakDays: number;
}

export type TrainingMode =
  | "interview"
  | "debate"
  | "impromptu"
  | "language-diagnostic"
  | "recovery-training";

export interface RecentSessionSummary {
  id: string;
  topic: string;
  mode?: TrainingMode;
  date: string;
  overallScore: number;
  scoreDelta: number;
  primaryWeakness: string;
  status: "completed" | "in-progress";
}

// --- Debate -----------------------------------------------------------------

export type DebatePosition = "For" | "Against";

export interface DebateTopic {
  id: string;
  title: string;
  category: "Technology & AI" | "Software Engineering" | "Work & Society" | "Education";
  context: string;
  forPerspective: string;
  againstPerspective: string;
}

export interface DebateConfig {
  topic: DebateTopic;
  position: DebatePosition;
  language: Language;
  difficulty: Difficulty;
}

export interface DebateRoundData {
  round: 1 | 2; // 1: Opening, 2: Rebuttal
  userTranscript: string;
  aiCounterTranscript?: string;
  timeLimitSeconds: number;
}

export interface DebateAnalysis {
  argumentation: number; // 0-100: logical cohesion, claim backing
  rebuttal: number; // 0-100: direct address of counter-arguments
  communication: number; // 0-100: clarity, tone, conviction
  pressureHandling: number; // 0-100: composure against counter-arguments
  languageFidelity: number; // 0-100: vocabulary depth in selected language
  codeSwitchingRatio: number; // 0-100%: percentage of code-switched terms
  overallScore: number;
  openingScore: number;
  rebuttalScore: number;
  keyObservation: string;
}

export interface DebateReport {
  config: DebateConfig;
  rounds: DebateRoundData[];
  analysis: DebateAnalysis;
  diagnosis: FailureDiagnosis;
  challenge: TargetedChallenge;
}

// --- Impromptu --------------------------------------------------------------

export type ImpromptuDuration = 30 | 60 | 180 | 300; // seconds

export interface ImpromptuTopic {
  id: string;
  prompt: string;
  category: "Spontaneous Thought" | "Tech Metaphor" | "Crisis Decision" | "Abstract Concept";
  hint: string;
}

export interface ImpromptuConfig {
  topic: ImpromptuTopic;
  durationSeconds: ImpromptuDuration;
  language: Language;
  difficulty: Difficulty;
}

export interface ImpromptuFluencyPoint {
  second: number;
  wpm: number;
  fillerDensity: number;
  repetitionCount: number;
}

export interface ImpromptuAnalysis {
  fluencyTimeline: ImpromptuFluencyPoint[];
  initialWpm: number;
  finalWpm: number;
  repetitionCount: number;
  fillerCount: number;
  coherence: number;
  lexicalDiversity: number; // 0-100
  overallScore: number;
  language: Language;
  codeSwitchingDetected: boolean;
}

export interface ImpromptuReport {
  config: ImpromptuConfig;
  transcript: string;
  analysis: ImpromptuAnalysis;
  diagnosis: FailureDiagnosis;
  challenge: TargetedChallenge;
}

