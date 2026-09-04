import asyncio
from typing import Dict, List
from fastapi import WebSocket

_main_loop = None

def set_main_loop(loop):
    global _main_loop
    _main_loop = loop

class ConnectionManager:
    """
    Administrador en memoria de conexiones WebSocket activas por user_id.
    Soporta múltiples pestañas / dispositivos conectados por un mismo usuario.
    """
    def __init__(self):
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    def disconnect(self, websocket: WebSocket, user_id: int):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def send_personal_message(self, user_id: int, message: dict):
        if user_id not in self.active_connections:
            return

        dead_connections = []
        for connection in list(self.active_connections[user_id]):
            try:
                await connection.send_json(message)
            except Exception:
                dead_connections.append(connection)

        for dead in dead_connections:
            self.disconnect(dead, user_id)

    def broadcast_to_user_sync(self, user_id: int, message: dict):
        """
        Envía un mensaje a un usuario de manera thread-safe desde contextos síncronos o asíncronos.
        """
        global _main_loop
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(self.send_personal_message(user_id, message))
            return
        except RuntimeError:
            pass

        if _main_loop and _main_loop.is_running():
            try:
                asyncio.run_coroutine_threadsafe(self.send_personal_message(user_id, message), _main_loop)
            except Exception as e:
                print(f"[WebSocketManager] Error dispatching threadsafe: {e}")

manager = ConnectionManager()
