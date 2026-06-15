from fastapi import WebSocket
from typing import Dict, List
import json
import asyncio

class ConnectionManager:
    def __init__(self):
        # Maps channel name (e.g., 'comms', 'leaderboard', 'dashboard') to a list of active WebSockets
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, ws: WebSocket, channel: str):
        await ws.accept()
        if channel not in self.active_connections:
            self.active_connections[channel] = []
        self.active_connections[channel].append(ws)

    def disconnect(self, ws: WebSocket, channel: str):
        if channel in self.active_connections:
            if ws in self.active_connections[channel]:
                self.active_connections[channel].remove(ws)
            # Cleanup empty channels
            if not self.active_connections[channel]:
                del self.active_connections[channel]

    async def broadcast_to_channel(self, channel: str, data: dict):
        if channel in self.active_connections:
            disconnected = []
            message = json.dumps(data)
            
            for connection in self.active_connections[channel]:
                try:
                    await connection.send_text(message)
                except Exception:
                    # Connection dropped silently or network error
                    disconnected.append(connection)
            
            # Clean up stale connections
            for conn in disconnected:
                self.disconnect(conn, channel)

# Singleton instance exported for use across routers
manager = ConnectionManager()