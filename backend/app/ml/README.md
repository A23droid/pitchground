# Local Multimodal ML Engine (`app/ml`)

Production-ready, local multimodal ML pipeline for Pitchground that processes speech, camera video, linguistic hesitations, and technical content without third-party API dependencies.

## Architecture & Submodules

```
backend/app/ml/
├── protocols.py          # TranscriberProtocol & AttemptAnalyzerProtocol
├── types.py              # Pydantic schemas (SignalBundle, Transcript, FusedDimensions, etc.)
├── factory.py            # build_transcriber() & build_analyzer() with graceful fallbacks
├── local_transcriber.py  # Local Faster-Whisper (CPU int8, verbatim disfluencies preserved)
├── acoustic.py           # Librosa prosody (WPM, pause ratio, F0 pitch & RMS energy jitter)
├── vision.py             # MediaPipe Face Mesh & Pose (stress, eye gaze, posture, gestures)
├── language.py           # Verbatim multilingual filler extractor (English & Hindi / Hinglish)
├── content.py            # Key-point technical semantic coverage & specificity evaluator
├── real_analyzer.py      # Production multimodal fusion into 6 normalized dimensions
└── stub_analyzer.py      # Low-resource deterministic mock fallback
```

## Configuration

Set in `.env`:

```env
# Use 'real' to run local Faster-Whisper, MediaPipe, Librosa, and filler extractors
ML_ANALYZER=real
```

If dependencies are missing or an exception occurs at runtime, `app/ml/factory.py` automatically falls back to `StubAnalyzer` and `SarvamTranscriber`.

## How the Modules Work

### 1. Verbatim Speech-to-Text (`local_transcriber.py`)
- Engine: `faster-whisper` (`base` model with CTranslate2 `int8` quantization).
- Configured with `suppress_tokens=[]` and a disfluency-priming prompt so conversational hesitations (*"um"*, *"uh"*, *"matlab"*, *"like"*, *"you know"*) are **retained** rather than stripped out.

### 2. Acoustic Prosody (`acoustic.py`)
- Engine: `librosa` + `soundfile`.
- Extracts:
  - Speaking Rate (`wpm`) normalized to active speech.
  - Pause ratio and prolonged silence bursts ($\ge 700\text{ ms}$).
  - Pitch variance ($F_0$) via probabilistic YIN.
  - Short-time RMS energy variance (jitter/stability).

### 3. Computer Vision & Stress Analysis (`vision.py`)
- Engine: `mediapipe` (Face Mesh + Pose Landmarks) + `OpenCV`.
- Sampled at 5 FPS:
  - **Eye Contact & Gaze:** Iris center displacement relative to eye corners (`gaze_away`).
  - **Posture Stability:** Nose-to-shoulder vertical distance and head tilt (`head_down`).
  - **Hand Gestures & Energy:** Wrist landmark velocity and displacement (`gesture_energy`).
  - **Camera Stress Score (0–100):** Synthesizes eye blink spikes, posture freezing, and rapid micro-movements.

### 4. Multilingual Filler Detection (`language.py`)
- Detects English fillers (*"um"*, *"uh"*, *"ahh"*, *"like"*, *"basically"*, *"you know"*) and Hindi/Hinglish fillers (*"मतलब"*, *"यार"*, *"वो"*, *"अरे"*, *"हम्म"*).
- Calculates:
  $$\text{filler\_rate} = \frac{N_{\text{fillers}}}{N_{\text{words}}} \times 100$$

### 5. Multimodal Fusion (`real_analyzer.py`)
Fuses all signals into 6 normalized dimensions $(0.0 - 1.0)$:
- **Fluency:** Balanced pacing (120–150 WPM), low pause ratio, low filler rate.
- **Composure:** Vocal pitch/energy stability and physical composure.
- **Presence:** Direct camera gaze and expressive hand gestures.
- **Structure:** Content progression and key concept coverage.
- **Language Stability:** Primary language adherence and low code-switch intrusion.
- **Content:** Technical key-point coverage.

## Running Tests

From `backend/`:

```powershell
# 1. Local ML Unit Tests (synthesized audio & frame tests)
python tests/test_local_ml.py

# 2. Verbatim Speech & Filler Integration Tests
python tests/test_phase2_stt.py

# 3. Factory & Signal Fusion Smoke Tests
python tests/test_phase2_api.py

# 4. Live REST & Background Job End-to-End Test (requires running server)
python tests/test_live_verbatim_speech.py
```
