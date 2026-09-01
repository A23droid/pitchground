# Pitchground ML contracts

Backend ↔ ML boundary. Joint ML work fills adapters; the orchestrator owns **when** they run. ML **does not** write SQLite, advance session phase, or call the LLM.

P0: in-process Python protocols. A later process split can keep these types unchanged.

---

## Protocols

```
TranscribeRequest:
  audio_path: string
  language_hint: "en" | "hi" | "auto"

Transcript:
  text: string
  language: "en" | "hi" | "mixed" | "unknown"
  confidence: number | null
  segments: [{
    start_sec: number
    end_sec: number
    text: string
    language: "en" | "hi" | "unknown"
  }]

AttemptMedia:
  attempt_id: string
  audio_path: string
  video_path: string | null

AnalysisConfig:
  practice_language: "en" | "hi"
  question_key_points: string[]     # from question bank
  sample_fps: number                # default 5
  skip_vision: boolean              # true if no video

AnalyzeAttemptRequest:
  media: AttemptMedia
  transcript: Transcript            # from transcribe, or empty if caller wants adapter to transcribe
  config: AnalysisConfig

SignalBundle:
  attempt_id: string
  transcript: Transcript
  acoustic: AcousticSignals
  language: LanguageSignals
  visual: VisualSignals | null
  content: ContentSignals | null
  fused: FusedDimensions
  quality: QualityFlags
```

`analyze_attempt(...) -> SignalBundle` may call transcribe internally if `transcript.text` is empty.

---

## Signal groups

### AcousticSignals

| Field | Type | Notes |
|---|---|---|
| `wpm` | number | Words per minute over speech spans |
| `pause_ratio` | number | 0–1, silence / duration |
| `filler_rate` | number | Fillers per 100 words (en/hi lists) |
| `pitch_var` | number | std of f0 over voiced frames; null if unvoiced |
| `energy_var` | number | std of RMS |
| `silence_burst_count` | integer | Pauses ≥ 700 ms |

### LanguageSignals

| Field | Type |
|---|---|
| `primary` | `"en"` \| `"hi"` \| `"mixed"` \| `"unknown"` |
| `primary_ratio` | 0–1 share of `practice_language` among segments |
| `code_switch_rate` | switches per minute |

### VisualSignals (null if no video or `skip_vision`)

| Field | Type |
|---|---|
| `gaze_away` | 0–1 estimated frames not facing camera |
| `head_down` | 0–1 |
| `freeze_ratio` | 0–1 low pose-delta frames |
| `gesture_energy` | ≥ 0 mean landmark motion |

### ContentSignals

| Field | Type |
|---|---|
| `coverage` | 0–1 key-point hit rate |
| `specificity` | 0–1 heuristic (numbers, named entities, unique tokens) |

No second LLM provider. Checklist overlap is deterministic. Optional reuse of the **same** diagnosis LLM is P1, not in this contract.

### FusedDimensions

All floats; **z-scores vs this session’s baseline** after baseline exists. On the baseline attempt itself, fused values are raw 0–1 min-max placeholders (documented in `quality.warnings`).

| id |
|---|
| `fluency` |
| `composure` |
| `presence` |
| `structure` |
| `language_stability` |
| `content` |

P0 fusion (config, not trained):

```
fluency            <- wpm (−pause_ratio) (−filler_rate)
composure          <- (−energy_var) (−pitch_var) (−freeze_ratio)
presence           <- (−gaze_away) (−head_down) (+gesture_energy)   # omitted if visual is null
structure          <- transcript rules (inverse ramble)
language_stability <- primary_ratio (−code_switch_rate)
content            <- coverage, specificity
```

Missing modality: drop those terms and renormalize weights.

### QualityFlags

```
audio_ok: boolean
video_ok: boolean
warnings: string[]   # e.g. "short_audio", "no_voice", "no_video", "baseline_unnormalized"
```

If `audio_ok` is false, orchestrator must not treat the take as a valid baseline or pressure probe (HTTP/WS error; ask to re-record).

---

## Detector input/output (backend service, not ML)

ML stops at `SignalBundle`. FailureDetectorService consumes two bundles:

```
MetricDelta:
  metric: string          # dotted path e.g. acoustic.pause_ratio
  baseline: number
  observed: number
  delta: number           # observed - baseline (sign: deterioration defined per metric)
  z_delta: number
  threshold: number
  fired: boolean
  modality: "acoustic" | "language" | "visual" | "content" | "fused"

Evidence:
  id: string
  attempt_id: string
  metric: string
  delta: number
  threshold: number
  modality: string
  excerpt: string | null
  span: { start_sec: number, end_sec: number } | null

CandidateFailure:
  condition: FailureCondition
  score: number           # 0–1
  evidence_ids: string[]
```

Deterioration direction (P0): higher is worse for `pause_ratio`, `filler_rate`, `code_switch_rate`, `gaze_away`, `freeze_ratio`; lower is worse for `wpm`, `coverage`, `primary_ratio`, fused dimensions.

---

## Pipeline ownership

| Stage | Component | Runtime |
|---|---|---|
| Decode / resample | `ml/acoustic` | local CPU |
| ASR | `ml/whisper_adapter` | HTTP Whisper API |
| Acoustic features | `ml/acoustic` | local (librosa) |
| Transcript rules | `ml/language` + services | local |
| Language ID | Whisper segment lang; optional langid | local / ASR |
| Vision | `ml/vision` MediaPipe | local CPU, 5 fps |
| Fusion | `ml/fusion` | local |
| Breakdown | FailureDetectorService | local rules |

**Do not add** a vector database, embedding search service, or a second model vendor for P0.

---

## Stub behavior (implementation step 1–2)

Until adapters exist, `analyze_attempt` may return a fixture `SignalBundle` keyed by `role`:

- `baseline` — healthy band  
- `pressure` — deteriorated `pause_ratio` + `wpm` (and visual freeze if video)  
- `retry` — partial recovery on the diagnosed metric  

This is required so frontend and the state machine can integrate before ML is ready. Fixtures must still pass the same Pydantic/schema contract.
