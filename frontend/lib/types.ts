// Core domain types for Pitchground.
// Measurements come from recorded media; unavailable values remain null.

export type Language = "English" | "Malayalam" | "Hindi" | "Mixed";

export type Audience =
  | "Technical interviewer"
  | "Recruiter"
  | "Professor"
  | "Manager";

export type Difficulty = "Easy" | "Standard" | "Hard";

export type InterviewType = "Technical Interview" | "Interview";

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
  correctness: number | null; // 0-100
  relevance: number | null;
  topicUnderstanding: number | null;
}

export interface CommunicationAnalysis {
  structure: number | null;
  clarity: number;
  coherence: number | null;
  fluency: number;
}

export interface VoiceAnalysis {
  speakingRateWpm: number;
  fillerCount: number | null;
  fillerRatePercent?: number | null; // Fillers per 100 words
  fillerDetectionStatus?: string;
  fillerEvents?: {start_sec: number | null; end_sec: number | null; confidence: number | null; source: string; text?: string}[];
  pauseCount: number | null;
  pauseRatioPercent?: number | null; // Percentage of time in silence
  responseLatencySeconds: number | null;
}

export interface VisualAnalysis {
  gaze: number | null; // 0-100 engagement-style score
  posture: number | null;
  engagement: number | null;
  stressScore?: number | null; // unavailable until a calibrated stress model exists
  eyeContactScore?: number | null; // 0-100 camera focal alignment
  handGestureScore?: number | null; // 0-100 expressive movement score
}

export interface LanguageAnalysis {
  primaryLanguage: string;
  codeSwitchingDetected: boolean | null;
  englishArticulation: number | null; // 0-100
}

export interface AttemptAnalysis {
  attemptId: string;
  content: ContentAnalysis;
  communication: CommunicationAnalysis;
  voice: VoiceAnalysis;
  visual: VisualAnalysis;
  language: LanguageAnalysis;
  overallScore: number;
  structureAvailable?: boolean;
  transcript?: string;
  wordTimestamps?: { word: string; start_sec: number; end_sec: number }[];
  contentAvailable?: boolean;
  visualAvailable?: boolean;
  answerFeedback?: string;
  referenceAnswer?: string;
  improvements?: string[]; // Actionable feedback tips
}

// --- Diagnosis --------------------------------------------------------------

export interface DiagnosisMetricDelta {
  label: string;
  before: number;
  after: number;
  unit: "%" | "count" | "s" | "x" | "WPM" | "per 100 words";
  direction: "up-is-bad" | "down-is-bad" | "stable-is-good";
}

export interface FailureDiagnosis {
  headline: string;
  explanation: string;
  deltas: DiagnosisMetricDelta[];
  rootCause: "pressure-structure-collapse" | "language-transfer" | "recovery-failure" | null;
  confidence: number | null; // 0-1 when calibrated
  occurrences: number | null; // how many prior sessions show this same pattern
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
  trend: "improving" | "worsening" | "stable" | "insufficient-data";
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
  structure: number | null;
  fillers: number | null;
  englishArticulation: number | null;
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
  languageComparison?: { language: string; comfortable_score: number; english_score: number; content_score: number | null } | null;
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
  overallScore: number | null;
  scoreDelta: number | null;
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
  visualMetrics?: {
    gaze_away: number;
    head_down: number;
    freeze_ratio: number;
    gesture_energy: number;
    stress_score: number;
  };
}

export interface DebateAnalysis {
  argumentation: number | null; // 0-100: logical cohesion, claim backing
  rebuttal: number | null; // 0-100: direct address of counter-arguments
  communication: number; // 0-100: clarity, tone, conviction
  pressureHandling: number | null; // acoustic composure heuristic, not stress diagnosis
  languageFidelity: number | null; // estimated target-language script share
  codeSwitchingRatio: number | null; // estimated share outside target-language script
  overallScore: number;
  openingScore: number;
  rebuttalScore: number;
  keyObservation: string;
  visualPresence?: {
    eyeContact: number | null; // camera-orientation heuristic
    posture: number | null; // 0-100
    composure: number | null; // observed movement continuity
    stressLevel: number | null;
  };
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
  fillerDensity: number | null;
  repetitionCount: number;
}

export interface ImpromptuAnalysis {
  transcript?: string;
  answerFeedback?: string | null;
  wpm?: number;
  durationSeconds?: number;
  fluencyTimeline: ImpromptuFluencyPoint[];
  initialWpm: number;
  finalWpm: number;
  repetitionCount: number;
  fillerCount: number | null;
  coherence: number | null;
  lexicalDiversity: number; // 0-100
  overallScore: number;
  language: Language;
  codeSwitchingDetected: boolean | null;
  visualMetrics?: {
    eyeContact: number | null;
    posture: number | null;
    composure: number | null;
    stressScore: number | null;
  };
}

export interface ImpromptuReport {
  config: ImpromptuConfig;
  transcript: string;
  analysis: ImpromptuAnalysis;
  diagnosis: FailureDiagnosis;
  challenge: TargetedChallenge;
}


export interface RecoveryResult {
  preInterruption: { structure: number | null; fluency: number };
  postInterruption: { structure: number | null; fluency: number };
  recoverySeconds: number | null;
  relevanceMaintained: boolean | null;
  verdict: "strong-recovery" | "partial-recovery" | "weak-recovery";
}
