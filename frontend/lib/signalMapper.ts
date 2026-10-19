import type { AttemptAnalysis, DiagnosisMetricDelta, FailureDiagnosis, TargetedChallenge } from "@/lib/types";

type Data = Record<string, unknown>;
const object = (value: unknown): Data => value && typeof value === "object" && !Array.isArray(value) ? value as Data : {};
const number = (value: unknown): number | null => typeof value === "number" && Number.isFinite(value) ? value : null;
const pct = (value: unknown): number | null => { const n=number(value); return n===null ? null : Math.round(n*100); };
const text = (value: unknown): string | undefined => typeof value === "string" && value.trim() ? value : undefined;
const inversePct = (value: unknown) => { const n=number(value); return n===null ? null : pct(1-n); };

/** Missing measurements remain null throughout the UI; no synthetic scores or advice. */
export function signalBundleToAttemptAnalysis(value: unknown, attemptId: string): AttemptAnalysis {
  const bundle=object(value), fused=object(bundle.fused), acoustic=object(bundle.acoustic);
  const content=object(bundle.content), visual=object(bundle.visual), language=object(bundle.language), quality=object(bundle.quality);
  const fluency=pct(fused.fluency), wpm=number(acoustic.wpm);
  if (quality.audio_ok !== true || fluency===null || wpm===null) throw new Error("No valid recorded speech analysis is available.");
  const scores=Object.values(fused).filter((v): v is number => number(v)!==null);
  if (!scores.length) throw new Error("No measured dimensions are available.");
  const transcript=object(bundle.transcript);
  const primary=text(language.primary);
  const fillerDetection=object(acoustic.filler_detection);
  const fillersMeasured=fillerDetection.status==="complete";
  const languageNames: Record<string,string>={en:"English",hi:"Hindi",ml:"Malayalam",mixed:"Mixed",unknown:"Unknown"};
  return {
    attemptId,
    content:{correctness:pct(content.correctness),relevance:pct(content.relevance),topicUnderstanding:pct(content.coverage)},
    communication:{structure:pct(fused.structure),clarity:fluency,coherence:pct(fused.structure),fluency},
    voice:{speakingRateWpm:Math.round(wpm),fillerCount:fillersMeasured ? number(acoustic.filler_count) : null,fillerRatePercent:fillersMeasured ? number(acoustic.filler_rate) : null,
      fillerDetectionStatus:text(fillerDetection.status) || "unavailable",
      fillerEvents:Array.isArray(acoustic.filler_events) ? acoustic.filler_events.map(value=>{const event=object(value);return {start_sec:number(event.start_sec),end_sec:number(event.end_sec),confidence:number(event.confidence),source:text(event.source)||"unknown",text:text(event.text)};}) : [],
      pauseCount:number(acoustic.pause_count),pauseRatioPercent:pct(acoustic.pause_ratio),responseLatencySeconds:number(acoustic.response_latency_sec)},
    visual:{gaze:inversePct(visual.gaze_away),posture:inversePct(visual.head_down),engagement:pct(visual.gesture_energy),
      stressScore:pct(visual.stress_score),eyeContactScore:inversePct(visual.gaze_away),handGestureScore:pct(visual.gesture_energy)},
    language:{primaryLanguage:primary ? languageNames[primary] || primary : "Unknown",codeSwitchingDetected:number(language.code_switch_rate)===null ? null : Number(language.code_switch_rate)>0,
      englishArticulation:pct(language.primary_ratio)},
    overallScore:Math.round(scores.reduce((a,b)=>a+b,0)/scores.length*100),
    structureAvailable:number(fused.structure)!==null,contentAvailable:content.validation_status==="llm_reviewed",
    visualAvailable:quality.video_ok===true && bundle.visual!==null,
    transcript:text(transcript.text),wordTimestamps:Array.isArray(transcript.words) ? transcript.words as AttemptAnalysis["wordTimestamps"] : [],
    answerFeedback:text(content.feedback),referenceAnswer:text(content.reference_answer),
    improvements:text(content.feedback) ? [String(content.feedback)] : [],
  };
}

export function mapDiagnosis(value: unknown): FailureDiagnosis {
  const d=object(value), condition=text(d.condition), rationale=text(d.rationale);
  if (!condition || !rationale) throw new Error("The diagnosis is not ready. Please retry.");
  return {headline:condition.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase()),explanation:rationale,
    deltas:Array.isArray(d.metric_rows) ? comparisonToDeltas({rows:d.metric_rows}) : [],
    rootCause:null,confidence:null,occurrences:number(d.attempt_count)};
}

export function challengeToUi(value: unknown, topic: string): TargetedChallenge {
  const c=object(value),spec=object(c.training_spec);
  const prompt=text(c.prompt_text),objective=text(spec.objective),limit=number(spec.time_limit_sec);
  if (!prompt || !objective || limit===null) throw new Error("The challenge is not ready. Please retry.");
  return {id:text(c.id) || `challenge-${topic}`,objective,framework:Array.isArray(c.framework) ? c.framework.filter((v): v is string=>typeof v==="string") : [],
    prompt,timeLimitSeconds:limit,weaknessTargeted:objective};
}

export function comparisonToDeltas(value: unknown): DiagnosisMetricDelta[] {
  const report=object(value);
  if (!Array.isArray(report.rows)) throw new Error("The comparison is not ready.");
  return report.rows.map(value=>{
    const r=object(value),metric=text(r.metric),before=number(r.a),after=number(r.b);
    if (!metric || before===null || after===null) throw new Error("The comparison contains an invalid measurement.");
    const ratio=metric.startsWith("fused.") || metric.startsWith("content.") || metric.startsWith("visual.") || metric.endsWith("pause_ratio") || metric.endsWith("primary_ratio");
    const lower=["pause","filler","gaze","freeze","stress"].some(name=>metric.includes(name));
    return {label:metric.split(".").pop()!.replace(/_/g," "),before:Math.round(before*(ratio?100:1)*10)/10,after:Math.round(after*(ratio?100:1)*10)/10,
      unit:ratio ? "%" : metric.endsWith("wpm") ? "WPM" : metric.endsWith("filler_rate") ? "per 100 words" : "count",direction:lower ? "up-is-bad" : "down-is-bad"};
  });
}
