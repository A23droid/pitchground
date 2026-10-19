from __future__ import annotations

import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from app.auth import decode_user
from app.db import SessionLocal
from app.models import Learner, Session as SessionModel

from app.services.ws_hub import hub

router = APIRouter(tags=["ws"])


@router.websocket("/v1/sessions/{session_id}/ws")
async def session_ws(websocket: WebSocket, session_id: str):
    token = websocket.query_params.get("token")
    authorization = websocket.headers.get("authorization", "")
    if authorization.lower().startswith("bearer "): token = authorization.split(" ",1)[1]
    if not token:
        await websocket.close(code=4401)
        return
    try:
        identity = decode_user(token)
    except HTTPException:
        await websocket.close(code=4401)
        return
    with SessionLocal() as db:
        learner = db.query(Learner).filter(Learner.email == identity["email"]).first()
        session = db.get(SessionModel, session_id)
        if not learner or not session or session.learner_id != learner.id:
            await websocket.close(code=4403)
            return
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
