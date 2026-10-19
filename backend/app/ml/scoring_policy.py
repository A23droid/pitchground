"""Explicit, versioned engineering policy; this is not a learned calibration."""
import json
import os
from pathlib import Path

def load_policy() -> dict:
    path=Path(os.getenv("SCORING_POLICY_PATH", str(Path(__file__).with_name("scoring_policy.json"))))
    policy=json.loads(path.read_text(encoding="utf-8"))
    for name in ("pace_reference_wpm","filler_reference_per_100_words","energy_variability_reference"):
        if not isinstance(policy.get(name),(int,float)) or policy[name]<=0:
            raise ValueError(f"Invalid scoring policy: {name}")
    for name in ("fluency_weights","presence_weights"):
        weights=policy.get(name,{})
        if not weights or any(not isinstance(w,(int,float)) or w<0 for w in weights.values()) or abs(sum(weights.values())-1)>1e-6:
            raise ValueError(f"Invalid scoring policy weights: {name}")
    return policy
