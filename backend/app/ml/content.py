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
        text = transcript_text.strip()
        if not text:
            return ContentSignals(coverage=0.0, specificity=0.0)

        # 1. Lexical Specificity (Technical terms, metrics, numbers, precision tokens)
        words = re.findall(r"\b\w+\b", text.lower())
        unique_words = len(set(words))
        type_token_ratio = unique_words / max(1, len(words))
        numbers_count = len(re.findall(r"\b\d+\b", text))
        technical_acronyms = len(re.findall(r"\b[A-Z]{2,}\b", transcript_text))
        
        # Specificity score based on vocabulary diversity and quantitative/technical grounding
        specificity = min(1.0, (type_token_ratio * 0.5) + (min(numbers_count, 5) * 0.06) + (min(technical_acronyms, 4) * 0.05))
        specificity = round(max(0.10, specificity), 2)

        # If no key points were provided to check against
        if not key_points:
            coverage = round(min(1.0, len(words) / 60.0), 2)  # depth based on substantive answer
            return ContentSignals(coverage=coverage, specificity=specificity)

        model = self._get_model()

        if model is None:
            # Token and n-gram overlap heuristic
            text_lower = text.lower()
            word_set = set(words)
            hits = 0
            for kp in key_points:
                kp_words = set(re.findall(r"\b\w+\b", kp.lower()))
                if not kp_words:
                    continue
                overlap = len(kp_words & word_set) / len(kp_words)
                if overlap >= 0.40 or kp.lower() in text_lower:
                    hits += 1
            coverage = round(hits / max(1, len(key_points)), 2)
            return ContentSignals(coverage=coverage, specificity=specificity)

        # Semantic embedding cosine similarity
        import numpy as np
        sentences = [s.strip() for s in re.split(r"[.!?\n]", text) if len(s.strip()) > 8]
        if not sentences:
            return ContentSignals(coverage=0.0, specificity=specificity)

        sent_embs = model.encode(sentences, normalize_embeddings=True)
        kp_embs = model.encode(key_points, normalize_embeddings=True)

        sim_matrix = np.dot(kp_embs, sent_embs.T)
        hits = int(np.sum(np.max(sim_matrix, axis=1) >= 0.60))
        coverage = round(float(hits / max(1, len(key_points))), 2)

        return ContentSignals(coverage=coverage, specificity=specificity)
