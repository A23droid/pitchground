# ML adapters (teammate seat)

The orchestrator never imports your model internals. Implement these two protocols and register them via env.

## Protocols

```python
# app/ml/protocols.py
transcribe(audio_path, language_hint) -> Transcript
analyze_attempt(media, transcript, config) -> SignalBundle
```

See [docs/ML_CONTRACTS.md](../../docs/ML_CONTRACTS.md) for every field.

## How to plug in your model

1. Create `app/ml/real_analyzer.py` with a class `RealAnalyzer` implementing `analyze_attempt`.
2. Optionally replace Sarvam in `app/services/stt_sarvam.py` or add `app/ml/whisper_adapter.py`.
3. Set `ML_ANALYZER=real` in `.env`.
4. Keep returning the same Pydantic `SignalBundle` shape — fixtures and the detector depend on it.

## Rules

- Do **not** import repositories, the orchestrator, or LLM agents.
- Do **not** write SQLite or advance session phase.
- If audio is unusable, set `quality.audio_ok = False` and add a warning.

## Local demo without a model

`ML_ANALYZER=stub` (default) returns deterministic baseline / pressure / retry bundles so the full interview loop works.
