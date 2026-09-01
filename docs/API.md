# Pitchground API contracts

Backend ↔ Next.js (laptop) and backend ↔ phone. Not implemented in this planning commit. FastAPI will emit OpenAPI from these shapes.

Base path: `/v1`. JSON UTF-8. Optional header `Authorization: Bearer $DEMO_TOKEN` if the env var is set.

IDs are UUIDs as strings. Times are ISO-8601 UTC.

---

## Error shape

```json
{
  "error": {
    "code": "illegal_transition",
    "message": "Cannot complete attempt in phase created",
    "session_id": "...",
    "phase": "created"
  }
}
```

| HTTP | When |
|---|---|
| 400 | Validation |
| 404 | Unknown learner/session/attempt |
| 409 | Illegal session phase transition |
| 415 | Media missing audio |
| 422 | TrainingSpec failed engine validation (should not reach FE if orchestrator is correct) |
| 202 | Analysis accepted (`POST .../complete`) |

---

## REST

### Learners

`POST /v1/learners`

Request: `{ "display_name": "string", "practice_language": "en" }`  
Response `201`: `{ "id", "display_name", "practice_language", "created_at" }`

`GET /v1/learners/{learner_id}/profile`

Response `200`:

```
{
  learner_id,
  practice_language,
  dimensions: [{ id, score, n, updated_at }],
  recent_failures: [{ condition, confidence, session_id, at }],
  latest_snapshot: object | null
}
```

### Sessions

`POST /v1/sessions`

Request: `{ "learner_id", "policy"?: SessionPolicy }`  
`SessionPolicy` optional overrides: `{ "p0_knobs": ["time_limit","interruption"], "demo_fixture": false }`  
Response `201`: `{ "id", "learner_id", "phase": "created", "current_action": null }`

`GET /v1/sessions/{session_id}`

Response: `{ id, learner_id, phase, current_action, latest_diagnosis?, latest_challenge?, latest_comparison? }`

`POST /v1/sessions/{session_id}/pair-device`

Request: `{ "device_role": "phone" | "laptop" }`  
Response `201`: `{ "session_id", "device_role", "token", "upload_hint": "/v1/sessions/{id}/attempts/{aid}/media" }`

`POST /v1/sessions/{session_id}/advance`

Request: `{ "from_phase": "baseline_analyzed" }`  
Server advances **one** legal step and returns the new session resource. `from_phase` must match current phase (optimistic lock).

### Attempts

`POST /v1/sessions/{session_id}/attempts`

Request: `{ "role": "baseline" | "pressure" | "retry" }`  
Allowed only in the matching `*_recording` (or orchestrator may create the attempt when entering that phase).  
Response `201`: `{ "id", "session_id", "role", "prompt", "pressure_spec" }`

`POST /v1/sessions/{session_id}/attempts/{attempt_id}/media`

`multipart/form-data`: `audio` (required, webm/wav/m4a), `video` (optional, webm/mp4).  
Response `200`: `{ "audio_path", "video_path": null | string, "bytes_audio", "bytes_video" }`

`POST /v1/sessions/{session_id}/attempts/{attempt_id}/complete`

Kicks in-process analysis.  
Response `202`: `{ "attempt_id", "analysis_status": "queued" }`  
When finished: WS `attempt_scored` and `GET` attempt returns metrics.

`GET /v1/sessions/{session_id}/attempts/{attempt_id}`

Response:

```
{
  id, role, prompt, pressure_spec,
  transcript: Transcript | null,
  metrics: SignalBundle | null,
  evidence: Evidence[],
  analysis_status: "pending" | "queued" | "complete" | "failed"
}
```

### Diagnosis, challenge, comparison

`GET /v1/sessions/{session_id}/diagnosis`  
`GET /v1/sessions/{session_id}/challenge`  
`GET /v1/sessions/{session_id}/comparison`

404 if that step has not run.

---

## WebSocket

`GET /v1/sessions/{session_id}/ws` — upgrade.

Client may send: `{ "type": "ping" }` or `{ "type": "recording_started" }` / `{ "type": "recording_stopped" }` (UI telemetry; does not replace REST complete).

Server events (envelope):

```
{ "type": string, "session_id": string, "phase": string, "ts": string, "payload": object }
```

| type | payload (conceptual) |
|---|---|
| `phase_changed` | `{ from, to }` |
| `question` | `InterviewPrompt` |
| `pressure_applied` | `PressureSpec` |
| `analysis_progress` | `{ attempt_id, stage: "transcribe"|"signals"|"score" }` |
| `attempt_scored` | `{ attempt_id, role, fused, quality }` |
| `diagnosis_ready` | `Diagnosis` |
| `challenge_ready` | `{ training_spec, prompt_text }` |
| `compare_ready` | `ComparisonReport` |
| `error` | `{ code, message }` |

---

## Shared conceptual types (frontend ↔ backend)

```
InterviewPrompt:
  prompt_text: string
  language: "en" | "hi"
  expected_duration_sec: number
  interruption_script?: string
  question_bank_id: string

PressureSpec:
  time_limit_sec: number | null
  interruption: boolean

NextAction:
  type: "show_question" | "record" | "wait_analysis" | "show_diagnosis"
        | "show_challenge" | "record_retry" | "show_comparison" | "done"
  question_spec?: InterviewPrompt
  pressure_spec?: PressureSpec
  ui_hints: { show_timer: boolean, show_evidence: boolean }

Diagnosis:
  condition: FailureCondition
  confidence: "low" | "medium" | "high"
  rationale: string
  evidence_ids: string[]

TrainingSpec:
  objective: TrainingObjective
  pressure_level: 0 | 1 | 2
  difficulty: "easy" | "medium"
  language: "en" | "hi"
  audience: "peer"
  time_limit_sec: number | null
  interruption: boolean
  replay_condition: "same_prompt" | "isomorphic_prompt"
  question_bank_id: string

ComparisonReport:
  attempt_a: string
  attempt_b: string
  focus_metrics: string[]
  rows: [{ metric, a, b, delta, verdict: "improved"|"unchanged"|"worsened" }]
  improved: boolean
```

`SignalBundle` and ML types: [ML_CONTRACTS.md](ML_CONTRACTS.md).

---

## Phone ↔ backend

Phone uses the same REST as laptop for media:

1. User enters pairing code / opens `/pair?session_id=&token=` (frontend concern).  
2. `POST /pair-device` with `device_role=phone` if not already paired.  
3. Poll `GET /sessions/{id}` or subscribe to WS until `current_action.type == "record"`.  
4. Upload media to the current attempt id from `GET /sessions/{id}`.  
5. Laptop (or phone) calls `complete`. Prefer **laptop** calling `complete` so there is one owner.

Phone does **not** call `advance`, diagnosis, or challenge endpoints.

---

## Backend ↔ agents (not HTTP in P0)

In-process Python calls. Conceptual:

```
InterviewRenderRequest:
  training_spec: TrainingSpec
  bank_item: { id, prompt, language, key_points }
  last_transcript?: string

InterviewRenderRequest -> InterviewPrompt

DiagnosisRequest:
  candidates: [{ condition, score, evidence_ids }]
  evidence: Evidence[]
  transcript_text: string
  metric_table: object
  allowed_conditions: FailureCondition[]   # closed set

DiagnosisRequest -> Diagnosis   # condition ∈ allowed_conditions

ChallengeRequest:
  diagnosis: Diagnosis
  learner_profile: object
  allowed_knobs: ["time_limit", "interruption"]
  language: "en" | "hi"
  bank_item: object

ChallengeRequest -> { training_spec: TrainingSpec, prompt_text: string }
```

Orchestrator validates outputs before persist and before WS emit.
