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
        # Avoid printing unicode emojis directly to Windows console
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
    
    send_telegram_message(current_user.telegram_chat_id, "🚀 *¡Conexión exitosa desde la App de Gimnasio!* Todo listo para entrenar.")
    return {"status": "success", "message": "Mensaje enviado a Telegram"}

@router.post("/send-routine/{routine_id}")
def send_routine_to_telegram(routine_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user.telegram_chat_id:
        raise HTTPException(status_code=400, detail="Cuenta de Telegram no vinculada.")
        
    routine = db.query(Routine).filter(Routine.id == routine_id, Routine.user_id == current_user.id).first()
    if not routine:
        raise HTTPException(status_code=404, detail="Rutina no encontrada.")
        
    msg = f"💪 *Rutina:* `{routine.name}`\n\n"
    if routine.description:
        msg += f"📝 *Descripción:* {routine.description}\n\n"
        
    if routine.routine_exercises:
        msg += "📋 *Ejercicios:*\n"
        for idx, re_ex in enumerate(routine.routine_exercises, 1):
            msg += f"  {idx}. {re_ex.exercise.name} - {re_ex.sets}x{re_ex.reps}\n"
    else:
        msg += "⚠️ *Esta rutina aún no tiene ejercicios.* Añádelos en la web.\n"
        
    msg += "\n⚡ *¡Para registrar tus progresos envía!* `<peso> <reps>`"
    
    send_telegram_message(current_user.telegram_chat_id, msg)
    return {"status": "success", "message": "Rutina enviada a Telegram exitosamente"}

@router.post("/start-routine/{routine_id}")
def start_routine_from_telegram(routine_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user.telegram_chat_id:
        raise HTTPException(status_code=400, detail="Cuenta no vinculada.")
        
    # Finalizar rutinas previas
    db.query(WorkoutLog).filter(WorkoutLog.user_id == current_user.id, WorkoutLog.status == "in_progress").update({"status": "completed"})
    
    routine = db.query(Routine).filter(Routine.id == routine_id, Routine.user_id == current_user.id).first()
    if not routine:
        raise HTTPException(status_code=404, detail="Rutina no encontrada.")
        
    new_log = WorkoutLog(user_id=current_user.id, routine_id=routine.id, status="in_progress")
    db.add(new_log)
    db.commit()
    
    send_telegram_message(current_user.telegram_chat_id, f"🔥 *¡Entrenamiento Iniciado!* ({routine.name})\nVe a la App para marcar tu primer ejercicio o anota `<peso> <reps>`.")
    return {"status": "success"}

def process_telegram_update(data: dict):
    if "message" not in data or "text" not in data["message"]:
        return
        
    chat_id = data["message"]["chat"]["id"]
    text = data["message"]["text"].strip()
    
    db = SessionLocal()
    try:
        if text.startswith("/test"):
            send_telegram_message(chat_id, "🤖 *¡El bot está conectado y listo!*")
            return
            
        match_code = re.search(r"\b(\d{6})\b", text)
        if match_code:
            code = match_code.group(1)
            user_by_token = db.query(User).filter(User.telegram_sync_token == code).first()
            if user_by_token:
                user_by_token.telegram_chat_id = str(chat_id)
                user_by_token.telegram_sync_token = None
                db.commit()
                send_telegram_message(chat_id, "🔗 *¡Cuenta vinculada exitosamente!* 🎉\nEscribe `/ayuda` para ver lo que puedo hacer por ti.")
                return
            else:
                send_telegram_message(chat_id, "❌ *Código inválido o expirado.* Genera uno nuevo en la web.")
                return
                
        user = db.query(User).filter(User.telegram_chat_id == str(chat_id)).first()
        if not user:
            send_telegram_message(chat_id, "🚫 *Cuenta no vinculada.*\nIngresa tu token (6 dígitos) generado en la App Web, o escribe `/vincular <codigo>`.")
            return
            
        if text.startswith("/ayuda") or text.startswith("/start"):
            msg = (
                "👋 *¡Hola! Soy tu asistente de GymTracker*\n\n"
                "🏋️‍♂️ `<peso> <reps>` - Guarda una serie rápidamente (ej: `60 10`)\n"
                "📋 `/rutinas` - Lista tus rutinas guardadas\n"
                "⏱️ `/estado` - Ve tu entrenamiento actual\n"
                "📅 `/historial` - Tus últimos 3 entrenamientos\n"
                "🔗 `/vincular <codigo>` - Vincula tu cuenta (generado en web)\n"
                "❌ `/desvincular` - Desconecta el bot de tu cuenta\n"
                "❓ `/ayuda` - Muestra este menú"
            )
            send_telegram_message(chat_id, msg)
            return
            
        if text.startswith("/desvincular"):
            user.telegram_chat_id = None
            db.commit()
            send_telegram_message(chat_id, "✅ *Desvinculado.*\nTu cuenta ha sido desconectada exitosamente del bot. ¡Vuelve pronto!")
            return

        if text.startswith("/rutinas"):
            routines = db.query(Routine).filter(Routine.user_id == user.id).all()
            if not routines:
                send_telegram_message(chat_id, "📭 *No tienes rutinas.*\n¡Crea tu primera rutina en la App Web!")
                return
            msg = "📋 *Tus Rutinas Guardadas:*\n\n"
            for r in routines:
                msg += f"🔹 `{r.name}`\n"
            msg += "\n💡 *Tip:* Ve a la App Web y usa el botón 'Enviar a Telegram ✈️' para ver los ejercicios aquí."
            send_telegram_message(chat_id, msg)
            return

        if text.startswith("/estado"):
            active_log = db.query(WorkoutLog).filter(WorkoutLog.user_id == user.id, WorkoutLog.status == "in_progress").first()
            if not active_log:
                send_telegram_message(chat_id, "💤 *Descansando.*\nNo hay ningún entrenamiento en curso. Inicia uno en la App Web o enviando una rutina.")
                return
            sets_count = db.query(WorkoutSet).filter(WorkoutSet.workout_log_id == active_log.id).count()
            msg = f"🔥 *Entrenamiento Activo*\n"
            if active_log.routine:
                msg += f"Rutina: `{active_log.routine.name}`\n"
            msg += f"Llevas *{sets_count} series* registradas en esta sesión."
            send_telegram_message(chat_id, msg)
            return

        if text.startswith("/historial"):
            logs = db.query(WorkoutLog).filter(WorkoutLog.user_id == user.id, WorkoutLog.status == "completed").order_by(WorkoutLog.created_at.desc()).limit(3).all()
            if not logs:
                send_telegram_message(chat_id, "📭 *Historial vacío.*\nAún no tienes entrenamientos completados.")
                return
            msg = "📅 *Tus Últimos Entrenamientos:*\n\n"
            for log in logs:
                date_str = log.created_at.strftime("%d/%m/%Y")
                sets = db.query(WorkoutSet).filter(WorkoutSet.workout_log_id == log.id).count()
                r_name = f"({log.routine.name})" if log.routine else ""
                msg += f"🏅 *{date_str}* {r_name}\n└ {sets} series registradas\n\n"
            send_telegram_message(chat_id, msg)
            return
            
        active_log = db.query(WorkoutLog).filter(WorkoutLog.user_id == user.id, WorkoutLog.status == "in_progress").first()
        if not active_log:
            send_telegram_message(chat_id, "💤 *No hay entrenamiento activo.*\nVe a la App Web o envíate una rutina para iniciar.")
            return
            
        match = re.match(r"^(\d+(?:\.\d+)?)\s+(\d+)$", text)
        if not match:
            send_telegram_message(chat_id, "❓ *Comando no reconocido.*\n\nPara registrar usa: `<peso> <reps>`\nEjemplo: `60 10`\nO escribe `/ayuda` para el menú.")
            return
            
        weight = float(match.group(1))
        reps = int(match.group(2))
        
        last_set = db.query(WorkoutSet).filter(WorkoutSet.workout_log_id == active_log.id).order_by(WorkoutSet.id.desc()).first()
        if not last_set:
            send_telegram_message(chat_id, "⚠️ *Falta el ejercicio.*\nPor favor, selecciona tu ejercicio y registra la *1ra serie en la App Web* para que yo sepa qué estás haciendo.")
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
        
        send_telegram_message(chat_id, f"✅ *Serie #{next_set} guardada:*\n`{weight}kg` x `{reps} reps`")
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
        except Exception:
            time.sleep(5)

@router.on_event("startup")
def start_telegram_polling():
    bot_thread = threading.Thread(target=telegram_polling_thread)
    bot_thread.daemon = True
    bot_thread.start()
    print("[Telegram] Bot Polling iniciado en segundo plano sin unicode logs.")
