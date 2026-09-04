import os
import requests
from sqlalchemy.orm import Session
from dotenv import load_dotenv

from app.models.user import User
from app.models.notification import Notification
from app.core.websocket_manager import manager

load_dotenv()

TELEGRAM_BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')
TELEGRAM_API_URL = f'https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}' if TELEGRAM_BOT_TOKEN else None

def send_telegram_notification(chat_id: str, text: str, reply_markup: dict = None) -> bool:
    if not TELEGRAM_API_URL or not chat_id:
        return False

    try:
        payload = {
            'chat_id': chat_id,
            'text': text,
            'parse_mode': 'Markdown'
        }
        if reply_markup:
            payload['reply_markup'] = reply_markup

        res = requests.post(f'{TELEGRAM_API_URL}/sendMessage', json=payload, timeout=5)
        return res.status_code == 200
    except Exception as e:
        print(f'[Notification] Error enviando Telegram a chat_id {chat_id}: {e}')
        return False

def create_in_app_notification(db: Session, user_id: int, title: str, message: str, notif_type: str = 'general', reference_id: int = None) -> Notification:
    notif = Notification(
        user_id=user_id,
        title=title,
        message=message,
        type=notif_type,
        reference_id=reference_id,
        is_read=False
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)

    # 🚀 Emisión instantánea por WebSocket al usuario si está online
    payload = {
        "type": "notification",
        "notification": {
            "id": notif.id,
            "user_id": notif.user_id,
            "title": notif.title,
            "message": notif.message,
            "type": notif.type,
            "reference_id": notif.reference_id,
            "is_read": notif.is_read,
            "created_at": notif.created_at.isoformat() if notif.created_at else None
        }
    }
    manager.broadcast_to_user_sync(user_id, payload)

    return notif

def notify_friend_request(db: Session, sender_id: int, recipient_id: int, request_id: int):
    sender = db.query(User).filter(User.id == sender_id).first()
    recipient = db.query(User).filter(User.id == recipient_id).first()
    if not sender or not recipient:
        return

    # 1. In-App Notification
    create_in_app_notification(
        db=db,
        user_id=recipient.id,
        title='Nueva solicitud de amistad',
        message=f'@{sender.username} te ha enviado una solicitud de amistad.',
        notif_type='friend_request',
        reference_id=request_id
    )

    # 2. Telegram Notification (si está vinculado)
    if recipient.telegram_chat_id:
        tg_text = (
            f"👋 *¡Nueva solicitud de amistad en GymTracker!*\n\n"
            f"El atleta *{sender.username}* quiere conectar contigo."
        )
        buttons = {
            'inline_keyboard': [
                [
                    {'text': '✓ Aceptar', 'callback_data': f'accept_friend:{request_id}'},
                    {'text': '✕ Rechazar', 'callback_data': f'reject_friend:{request_id}'}
                ]
            ]
        }
        send_telegram_notification(recipient.telegram_chat_id, tg_text, reply_markup=buttons)

def notify_friend_accepted(db: Session, accepter_id: int, requester_id: int):
    accepter = db.query(User).filter(User.id == accepter_id).first()
    requester = db.query(User).filter(User.id == requester_id).first()
    if not accepter or not requester:
        return

    # 1. In-App Notification
    create_in_app_notification(
        db=db,
        user_id=requester.id,
        title='Solicitud de amistad aceptada',
        message=f'@{accepter.username} ha aceptado tu solicitud de amistad.',
        notif_type='friend_accepted',
        reference_id=None
    )

    # 2. Telegram Notification (si está vinculado)
    if requester.telegram_chat_id:
        tg_text = (
            f"🎉 *¡Solicitud de amistad aceptada!*\n\n"
            f"*{accepter.username}* y tú ahora son amigos en GymTracker. ¡A entrenar!"
        )
        send_telegram_notification(requester.telegram_chat_id, tg_text)

def notify_friend_rejected(db: Session, rejecter_id: int, requester_id: int):
    rejecter = db.query(User).filter(User.id == rejecter_id).first()
    requester = db.query(User).filter(User.id == requester_id).first()
    if not rejecter or not requester:
        return

    # 1. In-App Notification
    create_in_app_notification(
        db=db,
        user_id=requester.id,
        title='Solicitud de amistad no aceptada',
        message=f'@{rejecter.username} ha rechazado tu solicitud de amistad.',
        notif_type='friend_rejected',
        reference_id=None
    )

    # 2. Telegram Notification (si está vinculado)
    if requester.telegram_chat_id:
        tg_text = (
            f"ℹ️ *Solicitud de amistad*\n\n"
            f"*{rejecter.username}* ha rechazado tu solicitud de amistad."
        )
        send_telegram_notification(requester.telegram_chat_id, tg_text)

def notify_workout_invitation(db: Session, inviter_id: int, invitee_id: int, scheduled_workout_id: int, routine_name: str, scheduled_date):
    inviter = db.query(User).filter(User.id == inviter_id).first()
    invitee = db.query(User).filter(User.id == invitee_id).first()
    if not inviter or not invitee:
        return

    date_str = scheduled_date.strftime("%d/%m/%Y") if hasattr(scheduled_date, "strftime") else str(scheduled_date)
    msg = f"@{inviter.username} te invitó a entrenar {routine_name} el {date_str}."

    # 1. In-App Notification (WebSocket instant broadcast)
    create_in_app_notification(
        db=db,
        user_id=invitee.id,
        title="Invitación a entrenar",
        message=msg,
        notif_type="workout_invitation",
        reference_id=scheduled_workout_id
    )

    # 2. Telegram Notification (si está vinculado)
    if invitee.telegram_chat_id:
        tg_text = (
            f"🏋️ *¡Invitación a Entrenar en GymTracker!*\n\n"
            f"*{inviter.username}* te invitó a entrenar la rutina *{routine_name}* el día *{date_str}*."
        )
        buttons = {
            'inline_keyboard': [
                [
                    {'text': '✓ Aceptar e incorporar', 'callback_data': f'accept_workout:{scheduled_workout_id}'},
                    {'text': '✕ Rechazar', 'callback_data': f'reject_workout:{scheduled_workout_id}'}
                ]
            ]
        }
        send_telegram_notification(invitee.telegram_chat_id, tg_text, reply_markup=buttons)

def notify_workout_accepted(db: Session, accepter_id: int, inviter_id: int, scheduled_workout_id: int, routine_name: str, scheduled_date):
    accepter = db.query(User).filter(User.id == accepter_id).first()
    inviter = db.query(User).filter(User.id == inviter_id).first()
    if not accepter or not inviter:
        return

    date_str = scheduled_date.strftime("%d/%m/%Y") if hasattr(scheduled_date, "strftime") else str(scheduled_date)
    msg = f"@{accepter.username} aceptó tu invitación para entrenar {routine_name} el {date_str}."

    # 1. In-App Notification
    create_in_app_notification(
        db=db,
        user_id=inviter.id,
        title="¡Invitación aceptada!",
        message=msg,
        notif_type="workout_invitation_accepted",
        reference_id=scheduled_workout_id
    )

    # 2. Telegram Notification
    if inviter.telegram_chat_id:
        tg_text = (
            f"🎉 *¡Invitación Aceptada!*\n\n"
            f"*{accepter.username}* aceptó tu cita para entrenar *{routine_name}* el *{date_str}*."
        )
        send_telegram_notification(inviter.telegram_chat_id, tg_text)

def notify_workout_rejected(db: Session, rejecter_id: int, inviter_id: int, routine_name: str, scheduled_date):
    rejecter = db.query(User).filter(User.id == rejecter_id).first()
    inviter = db.query(User).filter(User.id == inviter_id).first()
    if not rejecter or not inviter:
        return

    date_str = scheduled_date.strftime("%d/%m/%Y") if hasattr(scheduled_date, "strftime") else str(scheduled_date)
    msg = f"@{rejecter.username} no puede asistir al entrenamiento de {routine_name} el {date_str}."

    # 1. In-App Notification
    create_in_app_notification(
        db=db,
        user_id=inviter.id,
        title="Invitación no aceptada",
        message=msg,
        notif_type="workout_invitation_rejected",
        reference_id=None
    )

    # 2. Telegram Notification
    if inviter.telegram_chat_id:
        tg_text = (
            f"ℹ️ *Invitación rechazada*\n\n"
            f"*{rejecter.username}* no aceptó la invitación para entrenar *{routine_name}* el *{date_str}*."
        )
        send_telegram_notification(inviter.telegram_chat_id, tg_text)


