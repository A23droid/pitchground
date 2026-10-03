from __future__ import annotations

import json

from sqlalchemy.orm import Session

from app.models import QuestionBankItem

BANK = [
    {
        "topic": "Database Systems",
        "role": "baseline",
        "prompt": "Explain database indexing and why it improves query performance.",
        "key_points": ["B-tree or hash structure", "avoids full table scan", "read vs write tradeoff"],
        "time_limit_sec": None,
    },
    {
        "topic": "Database Systems",
        "role": "pressure",
        "prompt": "You have 20 seconds. Explain when indexing can actually hurt database performance.",
        "key_points": ["write amplification", "unused indexes", "planner choosing wrong index"],
        "time_limit_sec": 20,
    },
    {
        "topic": "Database Systems",
        "role": "retry",
        "prompt": "You have 20 seconds. Explain the trade-off between read speed and write speed that indexes introduce.",
        "key_points": ["faster reads", "slower writes", "concrete example"],
        "time_limit_sec": 20,
    },
    {
        "topic": "Operating Systems",
        "role": "baseline",
        "prompt": "Explain what a deadlock is and the conditions required for one to occur.",
        "key_points": ["mutual exclusion", "hold and wait", "no preemption", "circular wait"],
        "time_limit_sec": None,
    },
    {
        "topic": "Operating Systems",
        "role": "pressure",
        "prompt": "You have 20 seconds. Explain one practical way an OS can recover from a deadlock.",
        "key_points": ["process termination", "resource preemption"],
        "time_limit_sec": 20,
    },
    {
        "topic": "Operating Systems",
        "role": "retry",
        "prompt": "You have 20 seconds. Explain why deadlock prevention is more expensive than deadlock detection.",
        "key_points": ["restrictive resource allocation", "runtime overhead of prevention"],
        "time_limit_sec": 20,
    },
    {
        "topic": "System Design",
        "role": "baseline",
        "prompt": "Explain how a cache improves system performance and where you'd place one.",
        "key_points": ["latency reduction", "hot data", "client/CDN/app/DB layers"],
        "time_limit_sec": None,
    },
    {
        "topic": "System Design",
        "role": "pressure",
        "prompt": "You have 20 seconds. Explain what happens when a cache goes stale and how you'd handle it.",
        "key_points": ["TTL", "invalidation", "stale reads"],
        "time_limit_sec": 20,
    },
    {
        "topic": "System Design",
        "role": "retry",
        "prompt": "You have 20 seconds. Explain the difference between write-through and write-back caching.",
        "key_points": ["write-through durability", "write-back latency", "failure risk"],
        "time_limit_sec": 20,
    },
]


def seed_question_bank(db: Session) -> None:
    if db.query(QuestionBankItem).count() > 0:
        return
    for item in BANK:
        db.add(
            QuestionBankItem(
                topic=item["topic"],
                role=item["role"],
                prompt=item["prompt"],
                key_points_json=json.dumps(item["key_points"]),
                language="en",
                time_limit_sec=item["time_limit_sec"],
            )
        )
    db.commit()
