from __future__ import annotations

import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.ws_hub import hub

router = APIRouter(tags=["ws"])


@router.websocket("/v1/sessions/{session_id}/ws")
async def session_ws(websocket: WebSocket, session_id: str):
    await hub.connect(session_id, websocket)
    try:
        while True:
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue
            if msg.get("type") == "ping":
                await websocket.send_text(json.dumps({"type": "pong", "session_id": session_id}))
    except WebSocketDisconnect:
        await hub.disconnect(session_id, websocket)
