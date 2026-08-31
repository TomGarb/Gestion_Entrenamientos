import random
from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
import requests
import os
import re

from app.database import get_db
from app.models.user import User
from app.models.workout import WorkoutLog, WorkoutSet
from app.api.deps import get_current_user

router = APIRouter(prefix="/api/telegram", tags=["telegram"])

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "PON_TU_TOKEN_AQUI")
TELEGRAM_API_URL = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"

def send_telegram_message(chat_id, text: str):
    try:
        requests.post(TELEGRAM_API_URL, json={"chat_id": chat_id, "text": text}, timeout=5)
    except Exception as e:
        print(f"Error enviando mensaje Telegram: {e}")

@router.get("/link-code")
def generate_link_code(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    code = str(random.randint(100000, 999999))
    current_user.telegram_sync_token = code
    db.commit()
    return {"code": code}

@router.post("/test-connection")
def test_connection(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user.telegram_chat_id:
        raise HTTPException(status_code=400, detail="Cuenta de Telegram no vinculada.")
    
    send_telegram_message(current_user.telegram_chat_id, "✅ ¡Conexión exitosa desde la App de Gimnasio!")
    return {"status": "success", "message": "Mensaje enviado a Telegram"}

@router.post("/webhook")
async def telegram_webhook(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    if "message" not in data or "text" not in data["message"]:
        return {"status": "ignored"}
        
    chat_id = data["message"]["chat"]["id"]
    text = data["message"]["text"].strip()
    
    # 1. Comando de prueba
    if text.startswith("/test"):
        send_telegram_message(chat_id, "✅ ¡El bot está conectado y listo!")
        return {"status": "success"}
        
    # 2. Código de vinculación (6 dígitos)
    if re.match(r"^\d{6}$", text):
        user_by_token = db.query(User).filter(User.telegram_sync_token == text).first()
        if user_by_token:
            user_by_token.telegram_chat_id = str(chat_id)
            user_by_token.telegram_sync_token = None
            db.commit()
            send_telegram_message(chat_id, "🔗 ¡Cuenta vinculada exitosamente! Ya puedes registrar tus entrenamientos.")
            return {"status": "linked"}
        else:
            send_telegram_message(chat_id, "❌ Código inválido o expirado.")
            return {"status": "invalid_code"}
            
    # 3. Validar vinculación del usuario para registrar entrenamiento
    user = db.query(User).filter(User.telegram_chat_id == str(chat_id)).first()
    if not user:
        send_telegram_message(chat_id, "❌ Cuenta no vinculada. Ingresa tu token desde la App Web.")
        return {"status": "unauthorized"}
        
    # 4. Obtener entrenamiento activo
    active_log = db.query(WorkoutLog).filter(WorkoutLog.user_id == user.id, WorkoutLog.status == "in_progress").first()
    if not active_log:
        send_telegram_message(chat_id, "⚠️ No tienes ningún entrenamiento en curso. Inícialo desde la web.")
        return {"status": "no_active_log"}
        
    # 5. Parsear el input de peso y reps (ej: "60 10")
    match = re.match(r"^(\d+(?:\.\d+)?)\s+(\d+)$", text)
    if not match:
        send_telegram_message(chat_id, "🤖 Formato incorrecto.\n\nEscribe: <peso> <reps>\nEjemplo: 60.5 10")
        return {"status": "bad_format"}
        
    weight = float(match.group(1))
    reps = int(match.group(2))
    
    # 6. Insertar el Set
    last_set = db.query(WorkoutSet).filter(WorkoutSet.workout_log_id == active_log.id).order_by(WorkoutSet.id.desc()).first()
    if not last_set:
        send_telegram_message(chat_id, "⚠️ Primero registra al menos una serie en la Web para que el bot sepa qué ejercicio haces.")
        return {"status": "no_exercise_context"}
        
    exercise_id = last_set.exercise_id
    max_set = db.query(func.max(WorkoutSet.set_number)).filter(
        WorkoutSet.workout_log_id == active_log.id, 
        WorkoutSet.exercise_id == exercise_id
    ).scalar()
    
    next_set = (max_set or 0) + 1
    new_set = WorkoutSet(
        workout_log_id=active_log.id, exercise_id=exercise_id, set_number=next_set, reps_completed=reps, weight_kg=weight
    )
    db.add(new_set)
    db.commit()
    
    send_telegram_message(chat_id, f"✅ Serie #{next_set} guardada: {weight}kg x {reps} reps.")
    return {"status": "success"}
