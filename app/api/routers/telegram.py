import random
from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
import requests
import os
import re
import threading
import time

from app.database import get_db, SessionLocal
from app.models.user import User
from app.models.routine import Routine
from app.models.workout import WorkoutLog, WorkoutSet
from app.api.deps import get_current_user

router = APIRouter(prefix="/api/telegram", tags=["telegram"])

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "8756120850:AAEbw2yLnT0QVBeGiY53E0XQPKp3-XOh1kk")
TELEGRAM_API_URL = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}"

def send_telegram_message(chat_id, text: str):
    try:
        requests.post(f"{TELEGRAM_API_URL}/sendMessage", json={
            "chat_id": chat_id, 
            "text": text,
            "parse_mode": "Markdown"
        }, timeout=5)
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


def process_telegram_update(data: dict):
    if "message" not in data or "text" not in data["message"]:
        return
        
    chat_id = data["message"]["chat"]["id"]
    text = data["message"]["text"].strip()
    
    db = SessionLocal()
    try:
        # 1. Comando de prueba
        if text.startswith("/test"):
            send_telegram_message(chat_id, "✅ ¡El bot está conectado y listo!")
            return
            
        # 2. Código de vinculación (6 dígitos)
        match_code = re.search(r"\b(\d{6})\b", text)
        if match_code:
            code = match_code.group(1)
            user_by_token = db.query(User).filter(User.telegram_sync_token == code).first()
            if user_by_token:
                user_by_token.telegram_chat_id = str(chat_id)
                user_by_token.telegram_sync_token = None
                db.commit()
                send_telegram_message(chat_id, "🔗 *¡Cuenta vinculada exitosamente!* Escribe /ayuda para ver los comandos.")
                return
            else:
                send_telegram_message(chat_id, "❌ Código inválido o expirado.")
                return
                
        # 3. Validar vinculación del usuario
        user = db.query(User).filter(User.telegram_chat_id == str(chat_id)).first()
        if not user:
            send_telegram_message(chat_id, "❌ Cuenta no vinculada. Ingresa tu token desde la App Web.")
            return
            
        # --- COMANDOS DEL BOT ---
        if text.startswith("/ayuda") or text.startswith("/start"):
            msg = (
                "🤖 *GymTracker Bot - Comandos*\n\n"
                "🏋️‍♂️ `<peso> <reps>` - Guarda una serie (ej: `60 10`)\n"
                "📋 `/rutinas` - Lista tus rutinas guardadas\n"
                "📊 `/estado` - Ve tu entrenamiento actual\n"
                "📅 `/historial` - Tus últimos 3 entrenamientos\n"
                "❓ `/ayuda` - Muestra este menú"
            )
            send_telegram_message(chat_id, msg)
            return

        if text.startswith("/rutinas"):
            routines = db.query(Routine).filter(Routine.user_id == user.id).all()
            if not routines:
                send_telegram_message(chat_id, "No tienes rutinas. ¡Créalas en la App Web!")
                return
            msg = "📋 *Tus Rutinas:*\n\n"
            for r in routines:
                msg += f"🔹 {r.name}\n"
            send_telegram_message(chat_id, msg)
            return

        if text.startswith("/estado"):
            active_log = db.query(WorkoutLog).filter(WorkoutLog.user_id == user.id, WorkoutLog.status == "in_progress").first()
            if not active_log:
                send_telegram_message(chat_id, "💤 No hay ningún entrenamiento en curso. Inicia uno en la App Web.")
                return
            sets_count = db.query(WorkoutSet).filter(WorkoutSet.workout_log_id == active_log.id).count()
            send_telegram_message(chat_id, f"🔥 *Entrenamiento Activo*\nLlevas *{sets_count} series* registradas en esta sesión.")
            return

        if text.startswith("/historial"):
            logs = db.query(WorkoutLog).filter(WorkoutLog.user_id == user.id, WorkoutLog.status == "completed").order_by(WorkoutLog.created_at.desc()).limit(3).all()
            if not logs:
                send_telegram_message(chat_id, "Aún no tienes entrenamientos completados.")
                return
            msg = "📅 *Últimos Entrenamientos:*\n\n"
            for log in logs:
                date_str = log.created_at.strftime("%d/%m/%Y")
                sets = db.query(WorkoutSet).filter(WorkoutSet.workout_log_id == log.id).count()
                msg += f"✅ {date_str} - {sets} series\n"
            send_telegram_message(chat_id, msg)
            return
            
        # --- LÓGICA DE REGISTRO DE SERIES (<peso> <reps>) ---
        active_log = db.query(WorkoutLog).filter(WorkoutLog.user_id == user.id, WorkoutLog.status == "in_progress").first()
        if not active_log:
            send_telegram_message(chat_id, "⚠️ No tienes ningún entrenamiento en curso. Usa `/ayuda` para ver opciones.")
            return
            
        match = re.match(r"^(\d+(?:\.\d+)?)\s+(\d+)$", text)
        if not match:
            send_telegram_message(chat_id, "🤖 Comando no reconocido.\n\nPara registrar usa: `<peso> <reps>`\nEjemplo: `60 10`\nO escribe `/ayuda` para ver el menú.")
            return
            
        weight = float(match.group(1))
        reps = int(match.group(2))
        
        last_set = db.query(WorkoutSet).filter(WorkoutSet.workout_log_id == active_log.id).order_by(WorkoutSet.id.desc()).first()
        if not last_set:
            send_telegram_message(chat_id, "⚠️ Primero selecciona tu ejercicio y registra la 1° serie en la App Web para que el bot sepa qué estás haciendo.")
            return
            
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
        
        send_telegram_message(chat_id, f"✅ *Serie #{next_set}* guardada: `{weight}kg x {reps} reps`")
    finally:
        db.close()


def telegram_polling_thread():
    offset = 0
    while True:
        try:
            res = requests.get(f"{TELEGRAM_API_URL}/getUpdates?offset={offset}&timeout=10", timeout=15)
            if res.status_code == 200:
                data = res.json()
                if data.get("ok"):
                    for update in data["result"]:
                        offset = update["update_id"] + 1
                        process_telegram_update(update)
            time.sleep(1)
        except Exception as e:
            time.sleep(5)

@router.on_event("startup")
def start_telegram_polling():
    # Iniciar el hilo de polling cuando arranque FastAPI
    thread = threading.Thread(target=telegram_polling_thread, daemon=True)
    thread.start()
    print("🤖 Telegram Bot Polling iniciado en segundo plano.")
