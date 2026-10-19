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
    {
        "topic": "Networking",
        "role": "baseline",
        "prompt": "Explain what happens when a client establishes a TCP connection with a server.",
        "key_points": ["three-way handshake", "SYN, SYN-ACK, ACK", "sequence number negotiation", "reliability guarantee"],
        "time_limit_sec": None,
    },
    {
        "topic": "Networking",
        "role": "pressure",
        "prompt": "You have 20 seconds. Explain head-of-line blocking in HTTP/1.1 and how HTTP/2 addresses it.",
        "key_points": ["FIFO request blocking", "multiplexing over single TCP connection", "binary framing"],
        "time_limit_sec": 20,
    },
    {
        "topic": "Networking",
        "role": "retry",
        "prompt": "You have 20 seconds. Explain the difference between latency and throughput with a concrete real-world analogy.",
        "key_points": ["latency is round-trip delay", "throughput is data volume per unit time", "bandwidth-delay product"],
        "time_limit_sec": 20,
    },
    {
        "topic": "Data Structures & Algorithms",
        "role": "baseline",
        "prompt": "Explain how a hash map resolves collisions and why lookups are average O(1).",
        "key_points": ["hash function", "chaining vs open addressing", "bucket array", "load factor and resizing"],
        "time_limit_sec": None,
    },
    {
        "topic": "Data Structures & Algorithms",
        "role": "pressure",
        "prompt": "You have 20 seconds. Explain what causes a hash map lookup to degrade to O(n) and how to mitigate it.",
        "key_points": ["poor hash distribution", "hash collision DOS", "treeifying bins / good hash salts"],
        "time_limit_sec": 20,
    },
    {
        "topic": "Data Structures & Algorithms",
        "role": "retry",
        "prompt": "You have 20 seconds. Compare the trade-offs between an array-backed list and a linked list for insert-heavy workloads.",
        "key_points": ["array cache locality vs reallocation copy", "linked list pointer overhead and fragmented memory"],
        "time_limit_sec": 20,
    },
    {
        "topic": "Object-Oriented Design",
        "role": "baseline",
        "prompt": "Explain the Single Responsibility Principle and why coupling too many concerns to one class creates technical debt.",
        "key_points": ["one reason to change", "testability and isolation", "high cohesion", "low coupling"],
        "time_limit_sec": None,
    },
    {
        "topic": "Object-Oriented Design",
        "role": "pressure",
        "prompt": "You have 20 seconds. Explain why composition is preferred over class inheritance in modern software architecture.",
        "key_points": ["fragile base class problem", "loose coupling", "runtime dynamic swapping", "interface over implementation"],
        "time_limit_sec": 20,
    },
    {
        "topic": "Object-Oriented Design",
        "role": "retry",
        "prompt": "You have 20 seconds. Explain the Dependency Inversion Principle and how dependency injection implements it.",
        "key_points": ["high-level modules depend on abstractions", "inversion of control container", "decoupled construction"],
        "time_limit_sec": 20,
    },
]


def seed_question_bank(db: Session) -> None:
    existing = {
        (item.topic, item.role)
        for item in db.query(QuestionBankItem.topic, QuestionBankItem.role).all()
    }
    for item in BANK:
        if (item["topic"], item["role"]) not in existing:
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
