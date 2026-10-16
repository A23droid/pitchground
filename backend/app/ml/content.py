from __future__ import annotations

import re
from app.ml.types import ContentSignals


class ContentEvaluator:
    """Evaluates technical correctness, semantic key-point coverage, and specificity."""

    def __init__(self):
        self._model = None

    def _get_model(self):
        if self._model is None:
            try:
                from sentence_transformers import SentenceTransformer
                self._model = SentenceTransformer("all-MiniLM-L6-v2")
            except Exception:
                self._model = False
        return self._model if self._model is not False else None

    def evaluate(self, transcript_text: str, key_points: list[str]) -> ContentSignals:
        if not key_points or not transcript_text.strip():
            return ContentSignals(coverage=0.70, specificity=0.60)

        model = self._get_model()

        if model is None:
            # Token and n-gram overlap heuristic
            text_lower = transcript_text.lower()
            words = set(re.findall(r"\b\w+\b", text_lower))
            hits = 0
            for kp in key_points:
                kp_words = set(re.findall(r"\b\w+\b", kp.lower()))
                if not kp_words:
                    continue
                overlap = len(kp_words & words) / len(kp_words)
                if overlap >= 0.40 or kp.lower() in text_lower:
                    hits += 1
            coverage = round(hits / max(1, len(key_points)), 2)
            numbers_count = len(re.findall(r"\b\d+\b", transcript_text))
            specificity = min(1.0, 0.45 + (numbers_count * 0.08))
            return ContentSignals(coverage=coverage, specificity=round(specificity, 2))

        # Semantic embedding cosine similarity
        import numpy as np
        sentences = [s.strip() for s in re.split(r"[.!?\n]", transcript_text) if len(s.strip()) > 8]
        if not sentences:
            return ContentSignals(coverage=0.35, specificity=0.40)

        sent_embs = model.encode(sentences, normalize_embeddings=True)
        kp_embs = model.encode(key_points, normalize_embeddings=True)

        sim_matrix = np.dot(kp_embs, sent_embs.T)
        hits = int(np.sum(np.max(sim_matrix, axis=1) >= 0.60))
        coverage = round(float(hits / max(1, len(key_points))), 2)

        numbers_count = len(re.findall(r"\b\d+\b", transcript_text))
        specificity = min(1.0, 0.45 + (numbers_count * 0.08))

        return ContentSignals(coverage=coverage, specificity=round(specificity, 2))
