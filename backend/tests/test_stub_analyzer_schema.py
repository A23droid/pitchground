from app.ml.stub_analyzer import StubAnalyzer
from app.ml.types import AnalysisConfig, AttemptMedia, Transcript


def test_stub_analyzer_returns_complete_bundle():
    analyzer = StubAnalyzer()
    media = AttemptMedia(attempt_id="a1", audio_path="/tmp/x.wav", video_path=None)
    transcript = Transcript(text="Indexing speeds up reads.", language="en")
    for role in ("baseline", "pressure", "retry"):
        bundle = analyzer.analyze_attempt(
            media,
            transcript,
            AnalysisConfig(role=role, question_key_points=["B-tree"], skip_vision=True),  # type: ignore[arg-type]
        )
        data = bundle.model_dump()
        assert data["attempt_id"] == "a1"
        assert "acoustic" in data and "fused" in data and "quality" in data
        assert set(data["fused"]) >= {"fluency", "composure", "presence", "structure", "language_stability", "content"}
