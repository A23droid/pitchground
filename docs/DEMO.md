# Pitchground demo runbook (P0 / ~30-hour hackathon)

Goal: live, explainable loop — **baseline → pressure → evidence → diagnosis → comparable challenge → retry → improvement → persisted profile**. No extra infra.

## Exact architecture on stage

```
[Phone optional capture] --HTTP upload--> [FastAPI :43123]
[Next.js laptop UI]     --REST+WS------> [FastAPI]
                              |-- SQLite data/pitchground.db
                              |-- media  data/media/
                              |-- Whisper HTTP API
                              |-- one LLM HTTP API
```

One laptop runs FastAPI and Next.js. Phone is optional (same Wi-Fi). If phone fails, laptop mic/camera.

**Do not** introduce Redis, Kafka, Celery, or cloud GPUs for the demo.

## Frozen demo policy

- Languages: English question; allow Hindi/English code-switch in the answer (`practice_language: en`).
- Pressure knobs: **timer + one interruption** on the pressure and retry takes.
- Replay: **`same_prompt`** so comparison is fair.
- Analysis: **after each take**.
- Video: nice-to-have; demo still works audio-only (hide presence chips).
- Backup: `policy.demo_fixture: true` replays canned media through the **same APIs**.

## Pre-flight (T−30 min)

1. Env: `OPENAI_BASE_URL`, `OPENAI_API_KEY`, Whisper-compatible key if separate, optional `DEMO_TOKEN`.  
2. Mic check; 5-second clap test upload.  
3. Seed learner `display_name` of the on-stage student.  
4. Confirm Next.js points at the FastAPI origin.  
5. Load fixture wav files onto disk (quiet-room and pressured-room) for the fallback path.  
6. LLM-down fallback: canned interviewer strings in config; detector still runs.

## Live script (target ~6–8 minutes)

| Beat | What the audience sees | Backend phase |
|---|---|---|
| 1. Setup | Student on laptop; optional phone paired | `created` → `baseline_prompt` |
| 2. Baseline | Easy bank question, **no timer** | `baseline_recording` → `baseline_analyzed` |
| 3. Metrics | Calm fused scores / “your baseline” | WS `attempt_scored` |
| 4. Pressure | Same topic family; **countdown** + interviewer interruption line | `pressure_prompt` → `pressure_recording` |
| 5. Deterioration | Red deltas vs baseline | `pressure_analyzed` |
| 6. Evidence | Two chips, e.g. `pause_ratio` and `filler_rate` (or `gaze_away` if video) | detector |
| 7. Diagnosis | Named `FailureCondition` + confidence `medium` + rationale | `diagnosing` |
| 8. Challenge | One-line objective + **same knobs** + same prompt | `challenge_prompt` |
| 9. Retry | Student answers again | `retry_recording` |
| 10. Compare | Chart: diagnosed metrics improved / not | `comparing` |
| 11. Profile | Dimension EMA updated | `profile_updated` → `completed` |

Narrate explicitly: **we are not grading knowledge in isolation; we are showing a controlled pressure delta and a comparable retry.**

## Suggested bank item (demo)

- **Baseline / pressure / retry prompt:** “In 45 seconds, explain what Pitchground trains and why a baseline matters.”  
- **Key points:** adaptive interview, baseline, pressure, evidence, retry.  
- **Interruption script (pressure + retry):** “Stop — give me that in one sentence.”  
- **Time limit:** 45 seconds.

If the student is too polished on baseline, the interruption still tends to surface `fluency_breakdown` or `ramble`. If nothing fires, use fixture mode rather than improvising extra knobs (P0 forbids extra knobs).

## Fixture fallback

`POST /v1/sessions` with `{ "learner_id", "policy": { "demo_fixture": true } }`.

Complete-attempt still runs the detector on fixture `SignalBundle`s (see [ML_CONTRACTS.md](ML_CONTRACTS.md) stub behavior) so the UI is real: evidence, diagnosis, comparison. Do not fake the REST responses in the frontend.

## Failure matrix (what to say if something breaks)

| Failure | Action |
|---|---|
| Whisper timeout | Retry once; then fixture transcript + real acoustics if audio exists |
| LLM down | Bank prompt + template diagnosis sentence; detector unchanged |
| No camera | `visual: null`; use acoustic evidence only |
| Student doesn’t deteriorate | Fixture pressure bundle for the **analysis** of that take (label as demo assist) or re-record with shorter timer |
| Phone won’t pair | Laptop capture only |

## What not to demo

- Multiple failure conditions at once as “the” diagnosis (show one primary).  
- A different question on retry.  
- Streaming token-by-token analysis.  
- A second model vendor.  
- Any screen that implies a vector database or agent swarm.

## Success criteria (judges)

1. Capture and transcript visible.  
2. Baseline vs pressure metric delta visible.  
3. Evidence attached to a named failure condition.  
4. Challenge reuses pressure knobs.  
5. Retry comparison shows a directional result.  
6. Profile GET reflects the session afterward.
