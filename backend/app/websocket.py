from fastapi import WebSocket
from typing import Dict, List
import json


class WebSocketManager:
    """
    Manages WebSocket connections grouped by school_id.
    When an event happens (attendance marked, fee paid),
    broadcast to all connected clients of that school.
    """

    def __init__(self):
        # school_id -> list of active WebSocket connections
        self.active: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, school_id: int):
        await websocket.accept()
        if school_id not in self.active:
            self.active[school_id] = []
        self.active[school_id].append(websocket)

    def disconnect(self, websocket: WebSocket, school_id: int):
        if school_id in self.active:
            self.active[school_id] = [
                ws for ws in self.active[school_id] if ws != websocket
            ]

    async def broadcast_to_school(self, school_id: int, data: dict):
        """Push a message to all admin connections for this school."""
        if school_id not in self.active:
            return
        dead = []
        for ws in self.active[school_id]:
            try:
                await ws.send_text(json.dumps(data))
            except Exception:
                dead.append(ws)
        # Clean up closed connections
        for ws in dead:
            self.disconnect(ws, school_id)


ws_manager = WebSocketManager()
