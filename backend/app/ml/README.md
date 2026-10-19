# Runtime ML pipeline

Production always uses `RealAnalyzer` and local `LocalWhisperTranscriber`; there is no mock fallback. Missing/invalid media must not create scores or a baseline. Deterministic test data lives only under `backend/tests/`.

- `local_transcriber.py`: multilingual Faster-Whisper small by default, audio-based language detection, explicit transcription rather than translation, original word timestamps and conservative speech VAD. Practice language never forces the decoder into English.
- `acoustic.py`: WPM over complete recording time (including pauses), separate articulation WPM over detected speech, Silero VAD pause/latency measurements and prosody.
- `speech_quality.py`: repetition-loop, duration, alignment and low-confidence rejection before answer review or profile updates. Short genuine repetitions are retained.
- `language.py`: vocal filler counts and script-based language estimates.
- `vision.py`: MediaPipe Tasks face/iris, pose and hand landmark measurements.
- `content.py`: bounded Groq answer review against the actual prompt/rubric.
- `real_analyzer.py`: signal fusion with unavailable modalities omitted and recorded-media provenance.
- `scoring_policy.json`: versioned, configurable engineering weights and reference ranges. These require human calibration.
- `recovery.py`: actual pre/post-interruption audio measurements.

Run `python download_vision_models.py` from `backend` to install the official model assets. Set `WHISPER_MODEL` to the locally supported Faster-Whisper model you intend to run. See [the product audit](../../../docs/IMPROVEMENT_CHECKLIST.md) for limitations and validation work. Stress and facial-tension scores are unavailable until a calibrated model exists; raw facial blendshapes remain observable evidence. ASR settings do not guarantee perfect filler recall. Failed answer-provider calls retain the saved transcript for analysis retries.

## Vocal fillers independent of ASR

Run `python download_filler_model.py` to download the pinned Apache-2.0 `classla/wav2vecbert2-filledPause` waveform classifier (about 2.3 GB). Runtime inference uses local safetensors only and never executes remote model code. It classifies 20 ms audio frames, groups/merges them into events, and combines those events with timestamped transcript matches without counting the same evidence twice. Original ASR words remain unchanged. Silent gaps are not vocal fillers. The UI shows event times and model confidence and labels the result as an estimate. Missing assets/inference failures leave total filler counts/rates unavailable rather than asserting zero.

`filler_policy.json` records the immutable model revision and event-decoding thresholds; these are model/postprocessing configuration, not measured user data. `FILLER_CPU_THREADS` controls CPU use. English/Hindi are outside the published Slavic-language evaluation, so cross-language warnings are recorded and local annotation-based evaluation remains necessary. Lexical discourse markers remain candidates: their communicative role can depend on context.

Model authors: Peter Rupnik, Nikola Ljubešić, Ivan Porupski and Darinka Verdonik. See [model card and published evaluation](https://huggingface.co/classla/wav2vecbert2-filledPause) and [paper](https://aclanthology.org/2025.bsnlp-1.1/). The weights use Apache-2.0.

On memory-constrained Windows machines, `low_memory_frame_model.py` streams tensors from the safetensors file and packs linear layers for int8 CPU inference, keeping other layers in float32. It does not map/duplicate the entire float checkpoint. This avoids the paging failure observed with the reference loader. The inference mode is recorded with detections; quantization/cross-language accuracy needs broader evaluation. The loaded classifier is reused in the backend process.
