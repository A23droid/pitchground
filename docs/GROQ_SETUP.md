# Groq configuration

Set credentials only in `backend/.env`, then restart the backend. Do not paste credentials into frontend code, `NEXT_PUBLIC_*` variables, Git, or chat.

One shared credential is enough:

```dotenv
GROQ_API_KEY=your_server_side_key
GROQ_BASE_URL=https://api.groq.com/openai/v1
GROQ_MODEL=your_available_model
```

Optionally separate responsibilities:

| Variable | Responsibility |
| --- | --- |
| `GROQ_QUESTIONS_API_KEY` | Generate a question, rubric and illustrative answer |
| `GROQ_ANSWERS_API_KEY` | Review the recorded answer against that question |
| `GROQ_COACHING_API_KEY` | Generate diagnosis wording and targeted practice |
| `GROQ_DEBATE_API_KEY` | Generate the opposing debate turns |

An unset role key uses `GROQ_API_KEY`, then the legacy `OPENAI_API_KEY`. Optional `GROQ_QUESTIONS_MODEL`, `GROQ_ANSWERS_MODEL`, `GROQ_COACHING_MODEL` and `GROQ_DEBATE_MODEL` override `GROQ_MODEL`. Existing `OPENAI_BASE_URL`/`OPENAI_MODEL` deployments remain supported. Use one configuration scheme consistently; do not change a working legacy base URL independently of its key.

Multiple keys in the same organization do not multiply its rate limits. Groq documents organization-level limits in its [rate-limit guide](https://console.groq.com/docs/rate-limits). The app does not rotate keys to bypass 429 responses: it respects Retry-After and exposes the failed stage. Brief transient connection/server failures get one retry using the same credential. Invalid credentials, JSON or scores never produce canned questions or invented review scores.

`LLM_TIMEOUT_SECONDS` and `LLM_MAX_COMPLETION_TOKENS` configure provider requests. Keep limits suitable for the selected model and account. A failed analysis retains its uploaded recording and saved transcript; use Retry analysis after resolving the provider issue. Local speech and vision models do not use Groq API keys.

## Spoken debate opponent

Opponent replies use the existing Groq debate role; `GROQ_DEBATE_API_KEY` and `GROQ_DEBATE_MODEL` can override the shared configuration. Replies are validated and based on the latest recorded argument plus previous exchange. No new key is needed when the current Groq connection works.

## Sarvam opponent voice

The debate AI now generates text with Groq and reads it using server-side Sarvam TTS. Set `SARVAM_API_KEY` in `backend/.env`, then restart the backend. `SARVAM_TTS_MODEL` defaults to `bulbul:v3`; `SARVAM_TTS_SPEAKER` is optional and must match that model. The key never goes to the browser. No extra browser or operating-system language voice is required.

Authenticated `POST /v1/debate/speech` accepts the generated reply and practice language. The backend uses Sarvam's `language_code`, `api-subscription-key` header and WAV output, validates the audio, and returns only audio bytes. English, Hindi, Malayalam and mixed-script replies are supported. Provider failures remain visible without replacing the reply. Browser play/replay/stop controls use real audio playback events; replay reuses session-local audio. If autoplay is blocked, press **Play voice**.

Reference: [Sarvam REST text-to-speech](https://docs.sarvam.ai/api-reference/text-to-speech/convert).

Opponent language follows the latest recorded argument and audio-detected language on every turn. The session selector remains a practice setting; it does not force English onto Hindi speech. The counter endpoint returns the resolved `language`, used for both Sarvam autoplay and replay. Mixed-script replies mirror the argument's code-switching. A missing required Hindi/Malayalam script triggers one regeneration attempt, then a visible failure.

Impromptu and language diagnostic continue to use the **local interview ML pipeline** for transcription, word timing, pacing, waveform fillers and optional vision. Sarvam is used only at `/v1/debate/speech` for the AI opponent; these practice modes do not synthesize questions or feedback. Groq still generates questions, validates answer content, translates the equivalent English diagnostic prompt and writes evidence-based feedback in the recorded answer's language.
