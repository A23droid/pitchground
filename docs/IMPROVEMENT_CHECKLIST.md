# Pitchground improvement checklist and implementation audit

Reviewed: 19–20 October 2026. `[x]` means implemented in this working tree; `[ ]` means further work or validation remains. A passing isolated test is not evidence of model accuracy on people.

## Scope and rules

- [x] Preserve the homepage, theme, global CSS, fonts, colours and shared design tokens.
- [x] Reuse existing cards, controls and layouts; replace fixed topic lists with free-text input boxes.
- [x] Remove sample learner identities, seeded scores, canned transcripts and canned opponent responses from production frontend flows.
- [x] Keep UI configuration (languages, difficulty choices, timers, chart colours) separate from measured user data. Policy thresholds and weights are not recorded measurements.
- [x] Keep work local; do not push to any remote.

## What the audit found

| Area | Before this change | Current implementation |
| --- | --- | --- |
| Authentication | Route guard dropped learner ID; stale local identity bypassed failed server checks; OAuth callback decoded an unverified token in the browser | Server verifies tokens; identity includes learner ID; expired sessions redirect, network failures show retry |
| Database | Cloud failures silently selected a different local database | Explicitly configured database remains authoritative; connection errors surface |
| Interview | Fixed technical topic list, unrelated DBMS fallback, forced English, correctness inferred from coverage | Free text, Groq question + rubric, requested language, separate answer review |
| Impromptu | Mock report and fabricated pacing timeline; timer could finish before transcription | Stored audio/video analysis and timeline from actual timestamped words |
| Debate | Canned user responses and counters on failure; mock scores; closing turn omitted from report data | Recorded turns, generated counters, server reports from analyzed takes |
| Language | Mock generators fed partial real metrics; two transcriptions of the same clip; English take could use wrong language hint | One shared media pipeline; per-attempt language; same generated question in both takes |
| Recovery | Typed sample transcript and button-click latency | Actual recording, interruption event time, word-timestamp recovery and pre/post audio analysis |
| Dashboard/profile | Mock identity, progress, strengths, language scores, graph and default session score of 70 | Stored learner measurements, real session counts/history, unavailable-data boxes |
| Vision | Haar face boxes plus whole-frame differences labelled as eye contact/hand movement | MediaPipe face/iris, pose and handedness-associated hand landmarks |
| STT | Word timestamps existed, but silent gaps were counted as fillers; articles could match filler regex | Vocal filler rules separated from silence; actual counts, audio pause counts and latency |
| Orchestration | Invalid speech could become a baseline; failures stayed queued; no deterioration still became “ramble” | Failed takes cannot update baseline/profile; terminal failure status; no-failure result allowed |

## 1. Login, signup and account access

- [x] Retain `learner_id` when restoring authentication in `RequireAuth`.
- [x] Verify `/auth/me` before saving a login/signup/OAuth session.
- [x] Remove stale-local-session bypass of backend authentication.
- [x] Show backend-unavailable and demo-login errors using existing styled boxes.
- [x] Compare account emails case-insensitively and normalize newly created email addresses.
- [x] Load backend `.env` from an absolute backend path, independent of shell directory.
- [x] Prevent network-path redirects (`//...`) in OAuth return paths.
- [x] Remove silent database fallback, which could hide accounts in another database.
- [x] Verify signup, correct/incorrect password, invalid JWT and `/auth/me` with an isolated database.
- [x] Verify the configured cloud database responds to a read-only `SELECT 1`.
- [ ] Verify the user's own Google sign-in redirect, consent and callback in a browser. No Google credentials were entered during this audit.
- [x] Use signed, expiring OAuth state with a browser-bound HTTP-only nonce cookie, independent of worker memory.
- [ ] Replace localStorage JWTs with an appropriately designed secure cookie/session lifecycle and logout revocation.
- [ ] Add login/reset rate limits, reset-delivery monitoring and reset-token invalidation of old sessions.
- [x] Test topic migration with existing rows and apply migration 003 to the configured PostgreSQL database.

## 2. Interview page

- [x] Replace fixed computer-science topics with a topic/role/domain input box in the same layout.
- [x] Send topic, audience, language, mode and difficulty to Groq.
- [x] Validate generated question JSON, expected duration, criteria and example answer before using it.
- [x] Remove the unrelated Database Systems fallback and forced English generation.
- [x] Persist the generated answer rubric with the actual attempt, not a topic-bank lookup.
- [x] Review the recorded answer against its prompt, rubric and illustrative answer.
- [x] Present separate correctness/relevance/coverage and feedback; expose an example answer after analysis.
- [x] Display transcript words and measured gaps instead of a canned response.
- [x] Upload genuine A/V tracks; do not attach an audio-only blob as a camera recording.
- [x] Block fake clips when microphone/recorder access fails.
- [x] Preserve the pressure question, rubric, timer and interruption setting for a comparable retry.
- [x] Allow improved, unchanged and worsened outcomes in the result heading.
- [ ] Verify a complete baseline → pressure → diagnosis → retry → profile session with real microphone/camera data in each supported language.
- [ ] Add resume/reconnect and recoverable failed-generation controls at every transition.
- [ ] Add domain-specific rubrics for interviews that require external verified factual references.

## 3. Impromptu page

- [x] Replace preset-only topics with a free-text topic/domain input.
- [x] Generate the actual speaking prompt through Groq before the preparation countdown.
- [x] Keep existing duration, difficulty, language and preparation controls.
- [x] Analyze the recording once through the shared backend pipeline.
- [x] Compute timeline windows, WPM, filler density and repetition from timestamped words.
- [x] Remove fixed late-phase pace, invented decay timelines and guaranteed improvement text.
- [x] Generate coaching from recorded evidence and analyze retry media before displaying results; keep the retry question comparable.
- [x] Persist completion only after a successfully analyzed recording.
- [ ] Evaluate timing-window stability and short final-window bias on 30s, 60s, 180s and 300s recordings.
- [ ] Validate that coaching recognizes good spontaneous responses as well as deterioration.

## 4. Debate page

- [x] Replace fixed debate topics with an input accepting any proposition or domain.
- [x] Generate a proposition before opening the arena and generate opposing replies from actual speech.
- [x] Remove canned user arguments and software-specific canned fallback counters.
- [x] Analyze recorded A/V for opening, rebuttal and closing turns.
- [x] Use per-turn prompts containing the actual opposing argument for answer review.
- [x] Wait for analysis before permitting user-turn submission.
- [x] Prevent progression from an empty/incomplete generated opponent response.
- [x] Build reports from all completed persisted attempts, including closing and retries.
- [x] Remove fixed refutation-improvement percentages and scripted retry success.
- [x] Retry opponent generation and failed turn analysis without restarting the arena.
- [ ] Add separate debate rubric dimensions (claim support, counterargument coverage, evidence quality and fallacies) with validated calibration.
- [ ] Verify actual microphone/camera and turn boundaries under slow transcription, network failure and early finish.
- [x] Fall back to audio-only debate when camera access fails and the microphone is available.

## 5. Language diagnostic page

- [x] Replace the fixed technical-concept list with a topic input.
- [x] Generate one question and compare two recordings of that same question.
- [x] Pass comfortable-language and English language hints separately per attempt.
- [x] Use backend SignalBundles instead of mock language analysis generators.
- [x] Remove duplicate STT uploads and fabricated visual/communication scores.
- [x] Replace unconditional “language barrier” claims with measured differences and unavailable-data wording.
- [ ] Validate multilingual/romanized code switching using a word-level language-ID model. Current script-based estimates cannot reliably detect all romanized speech.
- [ ] Validate equivalent answer rubrics across languages and avoid treating translation differences as knowledge gaps.
- [ ] Extend supported languages only after transcription, filler and rubric validation for those languages.

## 6. Dashboard page

- [x] Remove mock profile spreading and automatic fixture fallback after request failure.
- [x] Use authenticated learner name, session totals, dimensions and chronological recorded progress.
- [x] Include measured zero scores in averages; exclude genuinely unavailable dimensions.
- [x] Remove the hardcoded 70 score and in-progress/completed fixture history.
- [x] Display empty/error boxes rather than fabricated progress or endless loading.
- [x] Make the progress scale support the complete 0–100 range.
- [x] Choose the recommendation from the learner's weakest measured dimension.
- [x] Deduplicate concurrent profile fetches and eager-load metrics/diagnoses to remove per-session queries.
- [ ] Add paginated history for large accounts.
- [x] Exclude unverified historical metrics and cached dimensions from scores, trends, progress and mastery; preserve historical rows with unavailable-score labels.

## 7. Profile page

- [x] Derive name, completed-session count and streak from the server.
- [x] Replace seeded mode averages and fixed mastery percentages with actual recorded-session aggregates.
- [x] Replace the fixed Aravind/DBMS relationship graph with the learner's measured dimensions.
- [x] Remove fixed Malayalam/English percentages and unsupported diagnostic recommendations.
- [x] Show absent evidence as a box instead of pretending it has been measured.
- [x] Calculate improving/declining/stable trends only with six comparable readings sharing mode, language and difficulty; otherwise label evidence insufficient.
- [x] Extend the existing mastery cards to all five modes using verified session averages.
- [ ] Add profile editing, account data export and explicit media/session deletion controls.
- [ ] Add time-zone-aware streak aggregation using the learner's chosen time zone (current calculation uses server UTC dates).

## 8. Recovery page

- [x] Replace the typed hash-map answer with a generated topic question and real MediaRecorder capture.
- [x] Record the interruption timestamp relative to the actual recording start.
- [x] Calculate recovery latency from the first detected post-interruption word, not the resume button.
- [x] Split actual audio before/after the interruption and score those speech spans.
- [x] Persist only analyzed media; remove canned success and fixed recovery-time claims.
- [ ] Validate interruption accessibility, boundary words and overlapping speech with real sessions.

## 9. Shared backend, Groq and validation

- [x] Generate structured questions and rubrics with the configured OpenAI-compatible Groq connection.
- [x] Reject malformed provider JSON instead of silently displaying canned output.
- [x] Keep API keys server-side.
- [x] Treat transcripts/topic fields as untrusted data in model instructions.
- [x] Validate answer-review ranges and required feedback before accepting scores.
- [x] Fail malformed answer reviews with an explicit retryable error; never infer correctness from answer length or keyword overlap.
- [x] Reject client-submitted transcripts/diagnoses/scores through generic completion.
- [x] Add a shared authenticated report endpoint sourced from persisted analyzed media; cache reports by analyzed attempt IDs and persist generated diagnoses.
- [x] Stop pretending a timed animation proves the backend finished; wait for real work.
- [x] Mark failed background jobs terminally failed and reject speechless attempts before baseline/profile updates.
- [x] Avoid submitting analysis twice for already queued/completed attempts.
- [ ] Add durable background jobs, concurrency protection, upload size/duration limits, retention and cancellation.
- [x] Add role-specific Groq credentials/models, safe error codes, Retry-After handling, shared cooldown and one transient retry using the same credential.
- [x] Retry analysis without re-uploading media or repeating successful STT; show safe failure messages.
- [ ] Add durable jobs and transcription progress/timeouts for large recordings.
- [x] Persist rubrics, answer model, versioned fusion policy, media provenance and report coaching.
- [x] Remove silent cloud-storage-to-local fallback and clean temporary downloads after analysis.
- [x] Require authentication and learner ownership for WebSocket session access.
- [ ] Extend ownership/security regression coverage to every route and validate media content and size.
- [x] Reject client policy overrides; session setup fields remain authoritative.
- [x] Remove the question-bank seeder, canned Sarvam transcript implementation and shadow database/model/schema modules.

## 10. ML: vision

- [x] Replace frame-wide motion and Haar boxes with MediaPipe Tasks face/iris, pose and hand landmarks.
- [x] Calculate upper-body movement from visible body landmarks and hand movement from matched handedness over frames.
- [x] Calculate camera-gaze/head orientation heuristics from facial geometry; do not count a blank scene as a bad performance.
- [x] Return unavailable data when model assets, subject visibility or video quality are insufficient.
- [x] Keep missing hands unavailable; do not assign a fake gesture score.
- [x] Download the official face, pose-lite and hand model assets via a reproducible setup script.
- [x] Smoke-test initialization and inference with an empty video; ensure no subject yields unavailable results.
- [ ] Calibrate gaze, head tilt, body-motion thresholds and visibility coverage across lighting, camera positions, skin tones, glasses and mobility differences.
- [x] Remove uncalibrated stress/tension formulas; retain raw facial blendshapes and show stress as unavailable.
- [ ] Train/validate any future stress model against appropriate labeled data before exposing scores.
- [ ] Add clear coverage/uncertainty per visual metric and temporal smoothing; do not reward excessive gestures or punish natural stillness.

## 11. ML: speech, fillers and pauses

- [x] Keep local Faster-Whisper word timestamps, audible repetitions and disfluency-friendly decoder settings.
- [x] Preserve observed word gaps; display actual gap durations in recorded transcripts.
- [x] Separate lexical/vocal fillers from silent pauses and repeated words.
- [x] Stop classifying ordinary articles and pronouns as fillers through a vowel-only regex.
- [x] Calculate filler count, WPM, silence ratio, pause count and response latency from recorded evidence.
- [x] Correct the PyAV resampler handling (resampling returns a list of frames).
- [x] Detect actual all-zero audio as speechless.
- [ ] Benchmark filler recall/precision and timestamp alignment against manually annotated real English, Hindi, Malayalam and mixed-language recordings. Decoder settings do not guarantee that every filler will be transcribed.
- [ ] Add a dedicated acoustic disfluency detector if ASR continues dropping short fillers.
- [ ] Validate VAD/noise rejection, voiced pitch extraction, false starts and punctuation across accents and environments.
- [x] Move standalone STT work into a synchronous FastAPI worker and require authentication.
- [ ] Add standalone STT request quotas and rate limits.

## 12. ML: orchestrator, scoring and feedback

- [x] Use the same real analyzer for all modes; do not allow missing/failed audio to improve a learner profile.
- [x] Keep missing visual/content dimensions unavailable and renormalize observed-score averages.
- [x] Remove fabricated fallback deterioration/evidence and allow “no measured deterioration”.
- [x] Constrain diagnosis evidence IDs to supplied evidence and prevent the LLM from raising confidence to high.
- [x] Preserve comparable retry conditions and allow worse/equal results.
- [ ] Calibrate fusion weights, failure thresholds and level bands using real outcomes; current weights are engineering policies, not a trained scoring model.
- [x] Persist the full versioned scoring policy and recorded-media provenance.
- [ ] Calibrate repeat-evidence thresholds and meaningful confidence intervals.
- [x] Display uncalibrated confidence and unknown root causes explicitly instead of fixed numeric confidence or a fabricated failure label.
- [ ] Replace remaining generic structure/pressure labels with precisely validated mode-specific measures.
- [ ] Add comparable before/after evaluation across difficulty levels; changing question content can confound apparent pressure effects.

## 13. Documentation and verification

- [x] Record this implementation audit separately from the older hackathon plans.
- [x] Document which old instructions are superseded by the product requirements.
- [x] Run isolated authentication/provider/quality-gate regression tests and TypeScript checks.
- [x] Build the frontend successfully with homepage/theme files unchanged.
- [ ] Complete browser and real-media end-to-end checks for all modes and slow/failing services before calling this production-ready.
- [ ] Resolve pre-existing lint findings and replace obsolete demo/live-test scripts with reproducible isolated suites.

## Documentation reconciliation

`ARCHITECTURE.md`, `ML_CONTRACTS.md`, `DEMO.md`, and the two ML blueprint guides contain historical demo assumptions: optional auth, bank-first questions, stub metrics, OpenAI/Sarvam-vs-local STT alternatives, and example code returning fixed scores. Those are not instructions for production data. This checklist and the current code follow the requested product behavior: authenticated users, arbitrary domains, generated questions/rubrics, actual recorded media and explicit unavailable values.

The “orchestrator model” is currently a deterministic controller plus signal fusion and constrained Groq review/coaching, not a trained end-to-end multimodal neural network. Real-world stress recognition and guaranteed filler preservation have not been demonstrated.

MediaPipe implementation references: [face/iris](https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker/python), [pose](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/python), [hands](https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker/python).


## Verification record (20 October 2026)

- Final isolated run: **63 tests passed** (`test_product_integrity.py`, `test_llm_routing.py` and the relocated test-only fixture schema test). Regressions cover signup/login, invalid JWTs, new-user empty profiles, arbitrary domains in every mode, malformed provider output, invalid-audio gating, real silent-audio extraction, MediaPipe initialization/inference on an empty video, content-review validation, report caching/invalidation including closing/retry attempts, and access by another learner.
- Frontend TypeScript checking and the production build pass. Homepage and global theme files have no changes.
- The configured database passed read-only `SELECT 1`; configured Groq passed a generic gardening-question generation request and a generic plant-care answer review.
- Latest frontend lint audit: 32 errors and 60 warnings, including existing effect/typing findings and unchanged homepage animations. TypeScript and production build pass. Homepage files remain preserved.
- Browser automation could not initialize because its runtime assets were unavailable. An isolated temporary API was stopped afterward; the user's existing frontend dev server was left running. Google consent/login and real human recordings were not tested.

## Additional verification and setup

- Analysis retry regression verifies one saved transcript, one STT call, one metrics row and an immediate profile update after provider recovery.
- Provider tests cover role-specific credentials/models, missing credentials, safe 401/429 errors, shared cooldown, transient same-key retry and malformed JSON.
- Guest identities are separate; OAuth state is signed, expiring and browser-bound. Policy override and existing-row migration regressions pass.
- Migration 003 is applied to the configured PostgreSQL database. New routed Groq calls passed real generic gardening-question generation and answer review.
- Configure optional separate keys using [Groq setup](GROQ_SETUP.md). Existing credentials work; additional keys are optional.

- Local development services are now running: backend `/health` and frontend `/login` both returned HTTP 200. CORS preflight from `http://localhost:3000` to the backend passed. Existing-account credentials and Google consent were not exercised.

## Interview transition correction

- Prevent overlapping start/transition clicks with a synchronous in-flight guard and disabled controls.
- Pair the visible question with its session ID only after question generation commits.
- Recover a baseline screen still backed by a created session, and accept an already-entered recording phase.
- Serialize same-session backend transitions with a row lock; safely return the existing result for an immediately repeated transition.
- Display nested API error messages as readable text.
- Regression checks verify persisted phases, duplicate requests, baseline attempt creation and retry after failed question generation. All 45 isolated checks, TypeScript and the production build pass.

## Speech accuracy correction

- [x] Replace the base default with installed multilingual small; cache models by identity and provide a speech-model setup script.
- [x] Detect spoken language independently of practice language; force transcription task, never translation.
- [x] Remove English priming; disable previous-text conditioning; enable conservative Silero speech filtering and decoder confidence/compression fallbacks.
- [x] Reject repetition loops, invalid word alignment and very low recognition confidence before Groq review or learner updates; retain genuine short repetitions.
- [x] Use full recording duration for WPM and expose separate voiced-time articulation WPM, duration and word count.
- [x] Version speech provenance/cache and avoid mixing legacy/new speech pipelines in trends. Exclude known historical hallucination loops without deleting recordings.
- [x] Replay the reported real 23.4-second clip locally: detected Hindi, 13 recognized words, 33.3 elapsed-time WPM; the repeated English output is gone. Runtime approximately 19 seconds on this machine. This single clip is a regression observation, not a measured Hindi accuracy benchmark.
- [ ] Benchmark Hindi spelling, code switches, filler recall and timestamp error against annotated recordings from multiple speakers; the current model still makes recognition errors.

Decoder reference: [Faster-Whisper implementation and VAD documentation](https://github.com/SYSTRAN/faster-whisper). Local model files and the private recording-validation artifact are ignored by Git.

- Final speech regression run: 53 tests pass, including proof that repetition loops cannot call the answer-review model. TypeScript and production build pass. Backend restarted with `WHISPER_MODEL=small`.

## Independent vocal-filler detection

- [x] Add a pinned Apache-2.0 waveform frame classifier independent of Whisper transcription. No vowel spelling was added as an acoustic rule.
- [x] Group actual model probabilities into timestamped events; reject brief spikes, merge prediction flicker and deduplicate audio/transcript overlap.
- [x] Preserve original ASR text; show audio-only vocal hesitations as separate event markers with model confidence. Rename ASR word gaps as gaps rather than asserting silence.
- [x] Apply the detector to the shared five-mode analyzer and authenticated STT route; use recorded filler events in impromptu timelines.
- [x] Keep total filler counts/rates unavailable when the waveform detector cannot run; do not turn missing inference into zero or reward it in fluency fusion.
- [x] Version filler policy/model/revision and keep scoring versions separate when calculating comparable trends.
- [x] Pass grouping, duplicate-evidence, silent-gap and unavailable-model regression tests.
- [ ] Measure precision/recall on annotated English, Hindi, Malayalam and mixed-language recordings. The pretrained checkpoint was evaluated on Slavic speech; English/Hindi transfer is unvalidated. Lexical discourse markers remain context-dependent candidates.

Sources: [model card](https://huggingface.co/classla/wav2vecbert2-filledPause), [published evaluation](https://aclanthology.org/2025.bsnlp-1.1/).

- Real-recording waveform validation completed: 2 audio-only filled-pause candidates at 2.58-3.92s and 23.70-24.38s, while transcript lexical matches remain zero. ASR text was not changed. Local cold load plus inference took about 64 seconds. These are model predictions awaiting human review, not a measured precision/recall claim.
- The reference float32 loader exceeded Windows paging capacity. A streamed int8-linear loader now reads the real safetensors weights one tensor at a time, keeps non-linear layers in float32 and records quantized inference provenance. Published checkpoint SHA-256 was verified. Unit regression compares the loader against a small float checkpoint fixture.

## Groq opponent and actual voice playback

- [x] Generate concise opponent text using the existing Groq debate-role connection, latest recorded argument and prior exchange; validate request/response fields and reject missing arguments.
- [x] Replace typewriter-based pretend speaking with Sarvam audio, driven by real playback events.
- [x] Add play/replay/stop controls; cancel voice on turn changes, recording and navigation. Retries preserve the generated text without a second AI call.
- [x] Handle synthesis failures and autoplay errors explicitly. Sarvam receives the configured reply language; installed browser language voices are no longer required.
- [x] Deduplicate overlapping identical generation requests and prevent stale reply text being submitted for a new AI turn.
- [x] Pass 63 isolated backend checks, 6 speech-engine lifecycle checks, TypeScript and production build. Live Groq opponent generation passed using a generic public-transport argument.
- [ ] Verify actual audible output and autoplay permissions in the user browser. Lifecycle tests use explicit isolated audio doubles.

## Sarvam voice and debate submission follow-up

- [x] Replace browser speech synthesis with authenticated backend Sarvam WAV generation, retaining the existing debate layout.
- [x] Keep API key server-side; validate generated audio and expose actionable configuration, provider and playback errors.
- [x] Handle actual audio start/end, autoplay rejection, replay caching, stop, cancellation and late synthesis responses.
- [x] Live supplied-key check returned a valid 2.73-second WAV through Sarvam.
- [x] Release the recorded argument once its validated transcript is saved, while expensive scoring continues in the background. Wait for every recorded turn before publishing the report.
- [x] Attach camera streams when animated video elements actually mount, fixing the preview mounting race.
- [x] Guard finishing an inactive recorder and reject submission before recording finishes; show transcription progress.
- [ ] Confirm audible playback and a complete real microphone debate in the user's browser/device; API and isolated lifecycle tests cannot establish speaker audibility.

- Live authenticated Hindi Groq-to-Sarvam check passed: native-script counterargument and valid 18.96-second WAV. Local sample: `backend/data/speech-validation/sarvam-opponent-hindi.wav` (ignored by Git).

## Match the speaker's language

- [x] Use the latest recorded transcript and its audio-detected language for each opponent turn instead of the session language selector.
- [x] Preserve Hindi, Malayalam and mixed-script replies; pass the resolved response language to Sarvam for both automatic playback and replay.
- [x] Retry a reply that drops the required Indic script once, then expose generation failure rather than speaking the wrong-language reply.
- [x] Cover English-setting/Hindi-speech, Hindi-setting/English-speech, Malayalam, mixed-language speech, romanized Hindi with audio metadata and wrong-language retries in regression tests.
- Limitation: mixed-language selection uses observed scripts plus audio language detection; romanized code-switches remain dependent on ASR language accuracy.

## Impromptu and language practice: local-model follow-up

- [x] Keep speech recognition, acoustic/filler inference and optional camera analysis on the shared local interview pipeline. Sarvam is restricted to the debate AI opponent's text-to-speech; no question or feedback audio was added to these modes.
- [x] Generate answer review and impromptu coaching in the latest recorded answer's language, independently of the setup language; retry answer reviews that omit required Indic script.
- [x] Show impromptu's actual transcript, answer review, detected language, elapsed recording time and WPM. Include trailing silence in pacing windows.
- [x] Translate the language diagnostic's original question into English without generating a different concept or changing its private rubric. Cache the translation and enforce session ownership.
- [x] Let the English recording start after the comfortable answer has a validated local transcript; wait for both complete analyses before showing results.
- [x] Show each recording's detected language and answer feedback. Suppress cross-language gap claims when the recordings do not match the requested languages. Add English-only and paired retakes.
- [x] Exclude mismatched diagnostic pairs from the profile's language comparison.
- [x] Prevent duplicate session launches, preserve uploads for analysis retries, reject empty/inactive recordings, improve audio-only fallback and detach recorder handlers on navigation.
- [x] Normalize multiple provider-supplied coaching weakness labels without inventing evidence. Version cached reports so language/pacing fixes regenerate stale reports.
- [x] Pass 85 backend regressions, 7 audio lifecycle checks, TypeScript and production build.
- [ ] Verify physical microphone/camera behavior and visual layout on the user's browser/device. API replay uses previously captured real recordings; it cannot establish device permissions or recording behavior.

- Live real-recording verification: impromptu local analysis, report and session save passed (59.4 WPM over 25.259 seconds). Language diagnostic's Hindi comfortable take passed local analysis (33.3 WPM over 23.399 seconds) and produced Hindi feedback. No Sarvam request is involved in these flows.
- Live language diagnostic verification completed: translated equivalent English question, local Hindi and English transcription, both full analyses and final session save passed. Hindi feedback remained in Devanagari; both modes' pages returned HTTP 200.
