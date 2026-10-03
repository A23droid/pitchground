# PRD reconciliation

**Date:** 2026-08-28  
**PRD path (not available in this environment):** `/Users/shubham/Downloads/Pitchground.pdf`  
**Primary source used:** Pitchground Product Requirements brief embedded in the architecture request (P0 loop, constraints, phone/laptop split, FastAPI ownership, 30-hour demo).

The PDF was not present in the cloud workspace, git history, or uploads. Terminology below is frozen from that brief so backend/ML work can start from a single vocabulary. If the PDF uses different names, update **only** the enum labels and mapping tables in this file and [ARCHITECTURE.md](ARCHITECTURE.md) — do not change control flow.

## P0 loop (preserved verbatim)

1. Capture a response  
2. Transcribe it  
3. Extract multimodal communication signals  
4. Establish a baseline  
5. Introduce a controlled pressure condition  
6. Detect meaningful deterioration  
7. Diagnose a likely failure condition using evidence  
8. Generate a targeted training challenge  
9. Recreate a comparable failure condition  
10. Allow the student to retry  
11. Compare the attempts  
12. Demonstrate improvement  
13. Persist the learner state  

## Frozen enums (P0)

These are the working names until the PDF is compared line-by-line.

### SkillDimension

| id | Meaning |
|---|---|
| `fluency` | Rate, pauses, fillers |
| `composure` | Stability under pressure (energy/pitch variability, freeze) |
| `presence` | Visual engagement (gaze, stillness) when video exists |
| `structure` | Discourse shape (ramble, incomplete sentences, markers) |
| `language_stability` | Primary-language ratio and code-switch rate |
| `content_adequacy` | Coverage/specificity vs the prompt checklist |

### FailureCondition

| id | Typical evidence pattern |
|---|---|
| `freeze` | Pause-ratio up + visual freeze or silence bursts |
| `fluency_breakdown` | WPM down + filler rate up |
| `language_instability` | Code-switch rate up vs baseline |
| `knowledge_gap` | Content coverage down while fluency stays stable |
| `delivery_collapse` | Fluency/composure down while content stays stable |
| `ramble` | Mean sentence length / repetition up, structure down |

### TrainingObjective

Mapped 1:1 from the primary diagnosis for P0:

| FailureCondition | TrainingObjective |
|---|---|
| `freeze` | `hold_continuity_under_time` |
| `fluency_breakdown` | `hold_fluency_under_interruption` |
| `language_instability` | `stay_in_target_language_under_pressure` |
| `knowledge_gap` | `cover_key_points_under_time` |
| `delivery_collapse` | `deliver_known_content_under_pressure` |
| `ramble` | `structure_answer_under_interruption` |

### Pressure knobs (P0)

Only two knobs are in the hackathon path:

- `time_limit` — seconds; `null` means none  
- `interruption` — boolean; optional script from InterviewerAgent  

P1 knobs (not wired in the state machine): `audience`, `language_shift`.

### Attempt roles

`baseline` | `pressure` | `retry`

### Session phases

`created` → `baseline_prompt` → `baseline_recording` → `baseline_analyzed` → `pressure_prompt` → `pressure_recording` → `pressure_analyzed` → `diagnosing` → `challenge_prompt` → `replay_condition` → `retry_recording` → `comparing` → `profile_updated` → `completed`

### Languages (P0)

- `en` — primary interview language  
- `hi` — secondary; used for code-switch metrics and optional Hindi prompts  

Practice language is stored on the learner (`practice_language`). Replay **keeps** the same language pair so the comparison is valid.

### Agent names (working)

| Name | LLM? |
|---|---|
| SessionOrchestrator | No |
| InterviewerAgent | Yes |
| SignalExtractionService | No |
| BaselineService | No |
| FailureDetectorService | No |
| DiagnosisAgent | Yes (constrained) |
| ChallengeAgent | Yes (constrained) |
| ComparisonService | No |
| LearnerStateService | No |

If the PDF names these differently (for example “Pressure Agent”), treat PDF names as aliases in docs only; keep the Python module names above.

### 30-hour demo script (working)

See [DEMO.md](DEMO.md). Script beats: mic check → baseline (no timer) → pressure (timer + one interruption) → evidence chips → named diagnosis → comparable challenge → retry → comparison of the diagnosed metric → profile snapshot. Fixture fallback if the room is noisy.

## What to check when the PDF is available

- [ ] Failure-condition labels  
- [ ] Skill-dimension labels  
- [ ] Named agents  
- [ ] P0 language list  
- [ ] Pressure knobs allowed in P0  
- [ ] Phone vs laptop ownership  
- [ ] Exact 30-hour demo narrative  
- [ ] Any claim that video is required (architecture treats video as optional)  
