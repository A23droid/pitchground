from __future__ import annotations

import asyncio
import json
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any

from fastapi import WebSocket


class SessionHub:
    def __init__(self) -> None:
        self._rooms: dict[str, set[WebSocket]] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def connect(self, session_id: str, ws: WebSocket) -> None:
        await ws.accept()
        async with self._lock:
            self._rooms[session_id].add(ws)

    async def disconnect(self, session_id: str, ws: WebSocket) -> None:
        async with self._lock:
            self._rooms[session_id].discard(ws)

    async def broadcast(self, session_id: str, event_type: str, phase: str, payload: dict[str, Any]) -> None:
        message = {
            "type": event_type,
            "session_id": session_id,
            "phase": phase,
            "ts": datetime.now(timezone.utc).isoformat(),
            "payload": payload,
        }
        raw = json.dumps(message)
        async with self._lock:
            sockets = list(self._rooms.get(session_id, set()))
        dead: list[WebSocket] = []
        for ws in sockets:
            try:
                await ws.send_text(raw)
            except Exception:
                dead.append(ws)
        for ws in dead:
            await self.disconnect(session_id, ws)


hub = SessionHub()
