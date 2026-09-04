from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from typing import List
import jwt

from app.database import get_db
from app.core.security import SECRET_KEY, ALGORITHM
from app.core.websocket_manager import manager
from app.models.user import User
from app.models.notification import Notification
from app.api.deps import get_current_user
from app.schemas.notification import NotificationResponse, NotificationSummaryResponse

router = APIRouter(prefix='/api/notifications', tags=['notifications'])
ws_router = APIRouter(tags=['websocket'])

async def authenticate_ws(websocket: WebSocket, token: str) -> int:
    """Valida el token JWT del usuario para la conexión WebSocket."""
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("id")
        return user_id
    except Exception:
        return None

@ws_router.websocket("/api/ws/notifications")
@ws_router.websocket("/ws/notifications")
async def websocket_notifications(websocket: WebSocket, token: str = None):
    user_id = await authenticate_ws(websocket, token)
    if not user_id:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await manager.connect(websocket, user_id)
    try:
        await websocket.send_json({"type": "connection_ack", "user_id": user_id, "status": "connected"})
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
    except Exception:
        manager.disconnect(websocket, user_id)


@router.get('', response_model=NotificationSummaryResponse)
def get_user_notifications(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    notifications = db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(Notification.created_at.desc()).limit(50).all()

    unread_count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).count()

    return NotificationSummaryResponse(
        notifications=notifications,
        unread_count=unread_count
    )

@router.put('/{notification_id}/read')
def mark_notification_as_read(notification_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()

    if not notif:
        raise HTTPException(status_code=404, detail='Notificación no encontrada.')

    notif.is_read = True
    db.commit()
    return {'status': 'success'}

@router.put('/read-all')
def mark_all_notifications_as_read(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).update({'is_read': True})
    db.commit()
    return {'status': 'success'}

@router.delete('/{notification_id}')
def delete_notification(notification_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()

    if not notif:
        raise HTTPException(status_code=404, detail='Notificación no encontrada.')

    db.delete(notif)
    db.commit()
    return {'status': 'success'}
