"""Regression coverage for the profile collections consumed by Vercel."""
from __future__ import annotations

import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.api.rest.learners import profile
from fastapi import HTTPException


class DashboardProfileContractTests(unittest.TestCase):
    def make_profile(self, dimensions=None, sessions=None):
        learner = SimpleNamespace(id="learner-1", display_name="Test learner", practice_language="hi")
        db = MagicMock()
        db.get.return_value = learner
        dims_query, snapshot_query, sessions_query = MagicMock(), MagicMock(), MagicMock()
        dims_query.filter.return_value.all.return_value = dimensions or []
        snapshot_query.filter.return_value.order_by.return_value.first.return_value = None
        sessions_query.filter.return_value.order_by.return_value.limit.return_value.all.return_value = sessions or []
        db.query.side_effect = [dims_query, snapshot_query, sessions_query]
        return profile(learner.id, db=db, current=learner)

    def test_new_learner_has_all_collections_used_by_deployed_frontend(self):
        result = self.make_profile()
        for key in ("dimensions", "pressure_drops", "language_scores", "progress", "recent_sessions"):
            self.assertEqual(result[key], [], key)
        self.assertIsNone(result["language_comparison"])
        self.assertIsNone(result["latest_snapshot"])

    def test_recorded_dimensions_survive_without_fabricated_history(self):
        dimension = SimpleNamespace(dimension="structure", score=72.0, n=2, updated_at=None)
        result = self.make_profile(dimensions=[dimension])
        self.assertEqual(result["dimensions"][0]["score"], 72.0)
        self.assertEqual(result["dimensions"][0]["n"], 2)
        for key in ("pressure_drops", "language_scores", "progress"):
            self.assertEqual(result[key], [])

    def test_another_learners_profile_remains_forbidden(self):
        db = MagicMock()
        db.get.return_value = SimpleNamespace(id="other-learner")
        with self.assertRaises(HTTPException) as error:
            profile("other-learner", db=db, current=SimpleNamespace(id="learner-1"))
        self.assertEqual(error.exception.status_code, 403)
        db.query.assert_not_called()


if __name__ == "__main__":
    unittest.main()
