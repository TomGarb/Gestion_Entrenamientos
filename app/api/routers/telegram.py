import random
from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
import requests
import os
import re
import threading
import time
from datetime import date, datetime, timezone, timedelta

from app.database import get_db, SessionLocal
from app.models.user import User
from app.models.routine import Routine, RoutineExercise
from app.models.exercise import Exercise
from app.models.workout import WorkoutLog, WorkoutSet
from app.models.friendship import Friendship
from app.models.scheduled_workout import ScheduledWorkout
from app.api.deps import get_current_user
from app.services.notification_service import (
    notify_friend_accepted,
    notify_friend_rejected,
    notify_workout_accepted,
    notify_workout_rejected
)
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/api/telegram", tags=["telegram"])

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")

if not TELEGRAM_BOT_TOKEN:
    raise ValueError("Falta TELEGRAM_BOT_TOKEN en el entorno")

TELEGRAM_API_URL = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}"


# ==============================================================================
# Telegram API Helpers
# ==============================================================================

def send_telegram_message(chat_id, text: str, reply_markup: dict = None):
    """Envía un mensaje de Telegram con soporte para Markdown y teclados."""
    try:
        payload = {
            "chat_id": chat_id,
            "text": text,
            "parse_mode": "Markdown"
        }
        if reply_markup is not None:
            payload["reply_markup"] = reply_markup
        res = requests.post(f"{TELEGRAM_API_URL}/sendMessage", json=payload, timeout=5)
        return res.json() if res.status_code == 200 else None
    except Exception as e:
        print(f"[Telegram] Error enviando mensaje a {chat_id}: {e}")
        return None


def edit_telegram_message(chat_id, message_id: int, text: str, reply_markup: dict = None):
    """Edita el contenido de un mensaje existente para navegación fluida in-place."""
    try:
        payload = {
            "chat_id": chat_id,
            "message_id": message_id,
            "text": text,
            "parse_mode": "Markdown"
        }
        if reply_markup is not None:
            payload["reply_markup"] = reply_markup
        res = requests.post(f"{TELEGRAM_API_URL}/editMessageText", json=payload, timeout=5)
        if res.status_code != 200:
            # Si falla la edición (por ejemplo mensaje idéntico o expirado), enviamos uno nuevo
            send_telegram_message(chat_id, text, reply_markup)
    except Exception as e:
        print(f"[Telegram] Error editando mensaje {message_id}: {e}")
        send_telegram_message(chat_id, text, reply_markup)


def answer_telegram_callback(callback_query_id: str, text: str = None, show_alert: bool = False):
    """Responde a un callback_query para quitar el spinner de carga en Telegram."""
    try:
        payload = {"callback_query_id": callback_query_id}
        if text:
            payload["text"] = text
            payload["show_alert"] = show_alert
        requests.post(f"{TELEGRAM_API_URL}/answerCallbackQuery", json=payload, timeout=5)
    except Exception as e:
        print(f"[Telegram] Error respondiendo callback: {e}")


def get_main_menu_keyboard():
    """Teclado inferior persistente (ReplyKeyboardMarkup) ergonómico y moderno."""
    return {
        "keyboard": [
            [{"text": "🏋️ Mi Entrenamiento"}, {"text": "📋 Mis Rutinas"}],
            [{"text": "📊 Historial & Progreso"}, {"text": "📅 Calendario"}],
            [{"text": "👥 Comunidad & Avisos"}, {"text": "⚙️ Mi Cuenta / Menú"}]
        ],
        "resize_keyboard": True,
        "is_persistent": True
    }


def clean_markdown(text: str) -> str:
    """Evita roturas de formato en nombres de rutinas o ejercicios con caracteres especiales."""
    if not text:
        return ""
    return text.replace("*", "").replace("_", " ").replace("`", "")


# ==============================================================================
# UI Menu Builders (Generadores de vistas interactivas)
# ==============================================================================

def build_main_menu(user: User, db: Session):
    """Menú principal interactivo."""
    active_workout = db.query(WorkoutLog).filter(
        WorkoutLog.user_id == user.id,
        WorkoutLog.status == "in_progress"
    ).first()

    status_icon = "🔥 *Entrenamiento en curso*" if active_workout else "💤 *En descanso*"

    text = (
        f"👋 *¡Hola, {clean_markdown(user.username)}!* Bienvenido a *GymTracker*.\n\n"
        f"Estado actual: {status_icon}\n\n"
        f"Elige una opción a continuación o utiliza los botones de acceso rápido del teclado inferior:"
    )

    inline_keyboard = [
        [
            {"text": "🏋️ Mi Entrenamiento", "callback_data": "menu:workout"},
            {"text": "📋 Mis Rutinas", "callback_data": "menu:routines"}
        ],
        [
            {"text": "📊 Historial & Stats", "callback_data": "menu:history"},
            {"text": "📅 Calendario / Citas", "callback_data": "menu:calendar"}
        ],
        [
            {"text": "👥 Comunidad & Avisos", "callback_data": "menu:community"},
            {"text": "⚙️ Mi Perfil", "callback_data": "menu:settings"}
        ]
    ]

    return text, {"inline_keyboard": inline_keyboard}


def build_workout_menu(user: User, db: Session):
    """Menú del estado del entrenamiento activo o selector para iniciar uno."""
    active_workout = db.query(WorkoutLog).filter(
        WorkoutLog.user_id == user.id,
        WorkoutLog.status == "in_progress"
    ).first()

    if active_workout:
        routine_name = clean_markdown(active_workout.routine.name) if active_workout.routine else "Entrenamiento Libre"
        
        # Calcular tiempo transcurrido
        elapsed_min = 0
        if active_workout.created_at:
            now_utc = datetime.now(timezone.utc)
            created_at = active_workout.created_at
            if created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=timezone.utc)
            elapsed_min = max(0, int((now_utc - created_at).total_seconds() // 60))

        # Obtener series registradas
        sets = db.query(WorkoutSet).filter(
            WorkoutSet.workout_log_id == active_workout.id
        ).order_by(WorkoutSet.id.asc()).all()

        sets_count = len(sets)

        text = (
            f"🔥 *Entrenamiento en Curso*\n"
            f"━━━━━━━━━━━━━━━━━━━━\n"
            f"📋 *Rutina:* `{routine_name}`\n"
            f"⏱️ *Tiempo:* `{elapsed_min} min` | 🔢 *Series totales:* `{sets_count}`\n\n"
        )

        if sets:
            text += "📝 *Últimas series realizadas:*\n"
            for s in sets[-4:]:
                ex_name = clean_markdown(s.exercise.name) if s.exercise else "Ejercicio"
                text += f" • *{ex_name}*: `{s.weight_kg}kg` × `{s.reps_completed} reps`\n"
        else:
            text += "ℹ️ *Aún no has registrado series en esta sesión.*\n"

        text += (
            f"\n⚡ *Para registrar una serie:* Envía `<peso> <reps>`\n"
            f"_(Ejemplo: `80 10` o `75.5 8`)_"
        )

        inline_keyboard = [
            [
                {"text": "➕ Registrar Serie", "callback_data": "workout:prompt_set"},
                {"text": "🔄 Actualizar", "callback_data": "menu:workout"}
            ]
        ]

        if active_workout.routine_id:
            inline_keyboard.append([
                {"text": "📋 Ver Ejercicios de la Rutina", "callback_data": f"routine:view:{active_workout.routine_id}"}
            ])

        inline_keyboard.extend([
            [
                {"text": "🏁 Finalizar Sesión", "callback_data": "workout:finish_prompt"},
                {"text": "❌ Cancelar", "callback_data": "workout:cancel_prompt"}
            ],
            [
                {"text": "🔙 Volver al Menú", "callback_data": "menu:main"}
            ]
        ])

        return text, {"inline_keyboard": inline_keyboard}

    else:
        text = (
            "💤 *Sin entrenamiento activo*\n"
            "━━━━━━━━━━━━━━━━━━━━\n"
            "Actualmente no tienes ninguna sesión en curso.\n\n"
            "¿Cómo deseas entrenar hoy?"
        )

        inline_keyboard = [
            [
                {"text": "📋 Iniciar desde Mis Rutinas", "callback_data": "menu:routines"}
            ],
            [
                {"text": "⚡ Iniciar Sesión Libre", "callback_data": "workout:start_free"}
            ],
            [
                {"text": "📅 Ver Citas en Calendario", "callback_data": "menu:calendar"}
            ],
            [
                {"text": "🔙 Menú Principal", "callback_data": "menu:main"}
            ]
        ]

        return text, {"inline_keyboard": inline_keyboard}


def build_routines_menu(user: User, db: Session):
    """Lista interactiva de rutinas con botones."""
    routines = db.query(Routine).filter(Routine.user_id == user.id).all()

    if not routines:
        text = (
            "📋 *Mis Rutinas*\n"
            "━━━━━━━━━━━━━━━━━━━━\n"
            "📭 *Aún no tienes rutinas guardadas.*\n\n"
            "Crea tus rutinas personalizadas en la App Web o inicia un entrenamiento libre aquí."
        )
        inline_keyboard = [
            [{"text": "⚡ Iniciar Sesión Libre", "callback_data": "workout:start_free"}],
            [{"text": "🔙 Menú Principal", "callback_data": "menu:main"}]
        ]
        return text, {"inline_keyboard": inline_keyboard}

    text = (
        f"📋 *Mis Rutinas Guardadas* ({len(routines)})\n"
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"Toca cualquier rutina para ver sus ejercicios o iniciarla de inmediato:"
    )

    inline_keyboard = []
    for r in routines:
        r_name = clean_markdown(r.name)
        inline_keyboard.append([
            {"text": f"🏋️ {r_name}", "callback_data": f"routine:view:{r.id}"}
        ])

    inline_keyboard.append([
        {"text": "🔙 Menú Principal", "callback_data": "menu:main"}
    ])

    return text, {"inline_keyboard": inline_keyboard}


def build_routine_detail_menu(user: User, db: Session, routine_id: int):
    """Detalle de una rutina específica con botón para iniciar."""
    routine = db.query(Routine).filter(Routine.id == routine_id, Routine.user_id == user.id).first()
    if not routine:
        return "❌ *Rutina no encontrada.*", {"inline_keyboard": [[{"text": "🔙 Volver a Rutinas", "callback_data": "menu:routines"}]]}

    r_name = clean_markdown(routine.name)
    r_desc = clean_markdown(routine.description) if routine.description else "Sin descripción"

    text = (
        f"💪 *Rutina:* `{r_name}`\n"
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"📝 *Descripción:* {r_desc}\n\n"
        f"📋 *Ejercicios incluidos:*\n"
    )

    if routine.routine_exercises:
        for idx, re_ex in enumerate(routine.routine_exercises, 1):
            ex_name = clean_markdown(re_ex.exercise.name) if re_ex.exercise else "Ejercicio"
            rest_str = f" ({re_ex.rest_seconds}s descanso)" if re_ex.rest_seconds else ""
            text += f"  {idx}. *{ex_name}* — `{re_ex.sets}×{re_ex.reps}`{rest_str}\n"
    else:
        text += "  _Esta rutina no tiene ejercicios agregados todavía._\n"

    inline_keyboard = [
        [
            {"text": "▶️ Iniciar Este Entrenamiento", "callback_data": f"routine:start:{routine.id}"}
        ],
        [
            {"text": "🔙 Volver a Rutinas", "callback_data": "menu:routines"},
            {"text": "🏠 Menú Principal", "callback_data": "menu:main"}
        ]
    ]

    return text, {"inline_keyboard": inline_keyboard}


def build_history_menu(user: User, db: Session, limit: int = 5):
    """Historial y métricas de progreso."""
    total_completed = db.query(WorkoutLog).filter(
        WorkoutLog.user_id == user.id,
        WorkoutLog.status == "completed"
    ).count()

    # Contar entrenamientos de este mes
    first_day_month = date.today().replace(day=1)
    month_completed = db.query(WorkoutLog).filter(
        WorkoutLog.user_id == user.id,
        WorkoutLog.status == "completed",
        WorkoutLog.date >= first_day_month
    ).count()

    logs = db.query(WorkoutLog).filter(
        WorkoutLog.user_id == user.id,
        WorkoutLog.status == "completed"
    ).order_by(WorkoutLog.created_at.desc()).limit(limit).all()

    text = (
        f"📊 *Historial & Progreso*\n"
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"🏆 *Total completados:* `{total_completed}` sesiones\n"
        f"📅 *Entrenamientos este mes:* `{month_completed}`\n\n"
    )

    if logs:
        text += "🏅 *Últimas sesiones realizadas:*\n"
        for log in logs:
            date_str = log.date.strftime("%d/%m/%Y") if log.date else "Reciente"
            r_name = clean_markdown(log.routine.name) if log.routine else "Entrenamiento Libre"
            sets_count = db.query(WorkoutSet).filter(WorkoutSet.workout_log_id == log.id).count()
            dur_str = f" • {log.duration_minutes} min" if log.duration_minutes else ""
            text += f" • *{date_str}* — `{r_name}`\n   └ {sets_count} series registradas{dur_str}\n"
    else:
        text += "📭 *Aún no tienes entrenamientos completados registrados.*\n"

    inline_keyboard = [
        [
            {"text": "🔄 Actualizar", "callback_data": "menu:history"},
            {"text": "🔙 Menú Principal", "callback_data": "menu:main"}
        ]
    ]

    return text, {"inline_keyboard": inline_keyboard}


def build_calendar_menu(user: User, db: Session):
    """Calendario interactivo con citas de entrenamiento agendadas."""
    today = date.today()
    next_week = today + timedelta(days=7)

    scheduled = db.query(ScheduledWorkout).filter(
        ScheduledWorkout.user_id == user.id,
        ScheduledWorkout.scheduled_date >= today,
        ScheduledWorkout.scheduled_date <= next_week,
        ScheduledWorkout.status.in_(["scheduled", "accepted", "pending"])
    ).order_by(ScheduledWorkout.scheduled_date.asc()).all()

    text = (
        f"📅 *Calendario & Citas Próximas*\n"
        f"━━━━━━━━━━━━━━━━━━━━\n"
    )

    today_scheduled_routine_id = None

    if scheduled:
        text += f"Tienes *{len(scheduled)}* cita(s) programada(s) para los próximos 7 días:\n\n"
        for sw in scheduled:
            sw_date = sw.scheduled_date.strftime("%d/%m/%Y")
            is_today = (sw.scheduled_date == today)
            prefix = "🔥 *¡HOY!*" if is_today else f"📆 *{sw_date}*"
            r_name = clean_markdown(sw.routine.name) if sw.routine else "Sesión Programada"
            
            if is_today and sw.routine_id:
                today_scheduled_routine_id = sw.routine_id

            status_badge = "⏳ (Pendiente)" if sw.status == "pending" else "✅ (Confirmada)"
            text += f" {prefix} — `{r_name}` {status_badge}\n"
            if sw.invited_by:
                inv_name = clean_markdown(sw.invited_by.username)
                text += f"    └ Invitado por: *@{inv_name}*\n"
    else:
        text += "✨ *No tienes entrenamientos programados para esta semana.*\nPrograma tus sesiones en el calendario de la App Web."

    inline_keyboard = []

    if today_scheduled_routine_id:
        inline_keyboard.append([
            {"text": "▶️ Iniciar Entrenamiento de Hoy", "callback_data": f"routine:start:{today_scheduled_routine_id}"}
        ])

    inline_keyboard.append([
        {"text": "🔄 Actualizar", "callback_data": "menu:calendar"},
        {"text": "🔙 Menú Principal", "callback_data": "menu:main"}
    ])

    return text, {"inline_keyboard": inline_keyboard}


def build_community_menu(user: User, db: Session):
    """Centro de comunidad, solicitudes de amistad y notificaciones."""
    friend_requests = db.query(Friendship).filter(
        Friendship.friend_id == user.id,
        Friendship.status == "pending"
    ).all()

    workout_invites = db.query(ScheduledWorkout).filter(
        ScheduledWorkout.user_id == user.id,
        ScheduledWorkout.status == "pending"
    ).all()

    friends_count = db.query(Friendship).filter(
        (Friendship.user_id == user.id) | (Friendship.friend_id == user.id),
        Friendship.status == "accepted"
    ).count()

    text = (
        f"👥 *Comunidad & Notificaciones*\n"
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"🤝 *Amigos conectados:* `{friends_count}`\n\n"
    )

    inline_keyboard = []
    has_alerts = False

    if friend_requests:
        has_alerts = True
        text += f"📩 *Solicitudes de amistad pendientes ({len(friend_requests)}):*\n"
        for req in friend_requests:
            req_user = clean_markdown(req.requester.username) if req.requester else "Usuario"
            text += f" • *@{req_user}*\n"
            inline_keyboard.append([
                {"text": f"✓ Aceptar @{req_user}", "callback_data": f"accept_friend:{req.id}"},
                {"text": "✕ Rechazar", "callback_data": f"reject_friend:{req.id}"}
            ])
        text += "\n"

    if workout_invites:
        has_alerts = True
        text += f"🏋️ *Invitaciones a entrenar pendientes ({len(workout_invites)}):*\n"
        for wi in workout_invites:
            inviter = clean_markdown(wi.invited_by.username) if wi.invited_by else "Un amigo"
            r_name = clean_markdown(wi.routine.name) if wi.routine else "Rutina"
            w_date = wi.scheduled_date.strftime("%d/%m/%Y") if wi.scheduled_date else "Fecha"
            text += f" • *@{inviter}* te invitó a `{r_name}` el *{w_date}*\n"
            inline_keyboard.append([
                {"text": f"✓ Aceptar {r_name[:12]}", "callback_data": f"accept_workout:{wi.id}"},
                {"text": "✕ Rechazar", "callback_data": f"reject_workout:{wi.id}"}
            ])
        text += "\n"

    if not has_alerts:
        text += "✨ *¡Todo al día!* No tienes solicitudes ni alertas pendientes.\n"

    inline_keyboard.append([
        {"text": "🔄 Actualizar", "callback_data": "menu:community"},
        {"text": "🔙 Menú Principal", "callback_data": "menu:main"}
    ])

    return text, {"inline_keyboard": inline_keyboard}


def build_settings_menu(user: User, db: Session):
    """Panel de perfil, configuración y utilidades del bot."""
    weight_str = f"{user.weight_kg} kg" if user.weight_kg else "No registrado"
    target_str = f"{user.target_weight_kg} kg" if user.target_weight_kg else "No registrado"

    text = (
        f"⚙️ *Mi Perfil & Ajustes*\n"
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"👤 *Usuario:* `@{clean_markdown(user.username)}`\n"
        f"📧 *Email:* `{user.email}`\n"
        f"⚖️ *Peso actual:* `{weight_str}`\n"
        f"🎯 *Meta de peso:* `{target_str}`\n"
        f"🔗 *Estado Telegram:* `Conectado ✅`\n"
    )

    inline_keyboard = [
        [
            {"text": "📖 Guía de Uso Rápido", "callback_data": "settings:help"}
        ],
        [
            {"text": "🚀 Probar Conexión", "callback_data": "settings:test"},
            {"text": "⚠️ Desvincular Bot", "callback_data": "settings:unlink_prompt"}
        ],
        [
            {"text": "🔙 Menú Principal", "callback_data": "menu:main"}
        ]
    ]

    return text, {"inline_keyboard": inline_keyboard}


def build_help_menu(user: User):
    """Guía de ayuda y atajos interactivos."""
    text = (
        "📖 *Guía Rápida de GymTracker Bot*\n"
        "━━━━━━━━━━━━━━━━━━━━\n\n"
        "🚀 *¿Cómo registrar series durante tu entrenamiento?*\n"
        "Simplemente escribe el peso y las repeticiones separados por un espacio:\n"
        " 👉 `80 10`  _(80 kg, 10 reps)_\n"
        " 👉 `72.5 8` _(72.5 kg, 8 reps)_\n\n"
        "⚡ *Atajos del Bot:*\n"
        "• Usa el *teclado inferior permanente* para moverte entre secciones con 1 toque.\n"
        "• Puedes repetir una serie idéntica usando el botón interactivo `[ ➕ Repetir Serie ]`.\n"
        "• Inicia y finaliza tus entrenamientos directamente con los botones de confirmación.\n\n"
        "🌐 *App Web:* Todos tus progresos se sincronizan automáticamente en tiempo real."
    )

    inline_keyboard = [
        [{"text": "🏋️ Ir a Mi Entrenamiento", "callback_data": "menu:workout"}],
        [{"text": "🔙 Menú Principal", "callback_data": "menu:main"}]
    ]

    return text, {"inline_keyboard": inline_keyboard}


# ==============================================================================
# Endpoints FastAPI para la Web App
# ==============================================================================

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
    
    text, markup = build_main_menu(current_user, db)
    send_telegram_message(
        current_user.telegram_chat_id,
        "🚀 *¡Conexión exitosa desde la App de Gimnasio!* Todo listo para entrenar.",
        reply_markup=get_main_menu_keyboard()
    )
    send_telegram_message(current_user.telegram_chat_id, text, reply_markup=markup)
    return {"status": "success", "message": "Mensaje enviado a Telegram"}


@router.post("/send-routine/{routine_id}")
def send_routine_to_telegram(routine_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user.telegram_chat_id:
        raise HTTPException(status_code=400, detail="Cuenta de Telegram no vinculada.")
        
    text, markup = build_routine_detail_menu(current_user, db, routine_id)
    send_telegram_message(current_user.telegram_chat_id, text, reply_markup=markup)
    return {"status": "success", "message": "Rutina enviada a Telegram exitosamente"}


@router.post("/start-routine/{routine_id}")
def start_routine_from_telegram(routine_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user.telegram_chat_id:
        raise HTTPException(status_code=400, detail="Cuenta no vinculada.")
        
    # Finalizar rutinas previas en curso
    db.query(WorkoutLog).filter(
        WorkoutLog.user_id == current_user.id,
        WorkoutLog.status == "in_progress"
    ).update({"status": "completed"})
    
    routine = db.query(Routine).filter(Routine.id == routine_id, Routine.user_id == current_user.id).first()
    if not routine:
        raise HTTPException(status_code=404, detail="Rutina no encontrada.")
        
    new_log = WorkoutLog(user_id=current_user.id, routine_id=routine.id, status="in_progress")
    db.add(new_log)
    db.commit()
    
    text, markup = build_workout_menu(current_user, db)
    send_telegram_message(
        current_user.telegram_chat_id,
        f"🔥 *¡Entrenamiento Iniciado!* (`{clean_markdown(routine.name)}`)",
        reply_markup=get_main_menu_keyboard()
    )
    send_telegram_message(current_user.telegram_chat_id, text, reply_markup=markup)
    return {"status": "success"}


# ==============================================================================
# Telegram Updates Processing (Callbacks & Text Messages)
# ==============================================================================

def process_telegram_update(data: dict):
    db = SessionLocal()
    try:
        # ----------------------------------------------------------------------
        # 1. Manejo de clics en botones interactivos (Callback Query)
        # ----------------------------------------------------------------------
        if "callback_query" in data:
            cb = data["callback_query"]
            cb_id = cb["id"]
            message = cb.get("message", {})
            chat_id = message.get("chat", {}).get("id")
            message_id = message.get("message_id")
            cb_data = cb.get("data", "")

            user = db.query(User).filter(User.telegram_chat_id == str(chat_id)).first()
            if not user:
                answer_telegram_callback(cb_id, "Cuenta no vinculada. Envía tu código de 6 dígitos.")
                return

            # A. Navegación Principal de Menús
            if cb_data == "menu:main":
                text, markup = build_main_menu(user, db)
                edit_telegram_message(chat_id, message_id, text, markup)
                answer_telegram_callback(cb_id)
                return

            if cb_data == "menu:workout":
                text, markup = build_workout_menu(user, db)
                edit_telegram_message(chat_id, message_id, text, markup)
                answer_telegram_callback(cb_id)
                return

            if cb_data == "menu:routines":
                text, markup = build_routines_menu(user, db)
                edit_telegram_message(chat_id, message_id, text, markup)
                answer_telegram_callback(cb_id)
                return

            if cb_data.startswith("routine:view:"):
                routine_id = int(cb_data.split(":")[2])
                text, markup = build_routine_detail_menu(user, db, routine_id)
                edit_telegram_message(chat_id, message_id, text, markup)
                answer_telegram_callback(cb_id)
                return

            if cb_data == "menu:history":
                text, markup = build_history_menu(user, db)
                edit_telegram_message(chat_id, message_id, text, markup)
                answer_telegram_callback(cb_id)
                return

            if cb_data == "menu:calendar":
                text, markup = build_calendar_menu(user, db)
                edit_telegram_message(chat_id, message_id, text, markup)
                answer_telegram_callback(cb_id)
                return

            if cb_data == "menu:community":
                text, markup = build_community_menu(user, db)
                edit_telegram_message(chat_id, message_id, text, markup)
                answer_telegram_callback(cb_id)
                return

            if cb_data == "menu:settings":
                text, markup = build_settings_menu(user, db)
                edit_telegram_message(chat_id, message_id, text, markup)
                answer_telegram_callback(cb_id)
                return

            # B. Acciones de Entrenamiento
            if cb_data.startswith("routine:start:"):
                routine_id = int(cb_data.split(":")[2])
                routine = db.query(Routine).filter(Routine.id == routine_id, Routine.user_id == user.id).first()
                if not routine:
                    answer_telegram_callback(cb_id, "Rutina no encontrada.", show_alert=True)
                    return

                # Cerrar sesiones previas
                db.query(WorkoutLog).filter(
                    WorkoutLog.user_id == user.id,
                    WorkoutLog.status == "in_progress"
                ).update({"status": "completed"})

                new_log = WorkoutLog(user_id=user.id, routine_id=routine.id, status="in_progress")
                db.add(new_log)
                db.commit()

                answer_telegram_callback(cb_id, f"¡Entrenamiento iniciado: {routine.name}!")
                text, markup = build_workout_menu(user, db)
                send_telegram_message(
                    chat_id,
                    f"🔥 *¡Comenzó tu entrenamiento: {clean_markdown(routine.name)}!*\nRegistra tus series enviando `<peso> <reps>` (ej: `70 10`).",
                    reply_markup=get_main_menu_keyboard()
                )
                send_telegram_message(chat_id, text, reply_markup=markup)
                return

            if cb_data == "workout:start_free":
                # Cerrar sesiones previas
                db.query(WorkoutLog).filter(
                    WorkoutLog.user_id == user.id,
                    WorkoutLog.status == "in_progress"
                ).update({"status": "completed"})

                new_log = WorkoutLog(user_id=user.id, routine_id=None, status="in_progress")
                db.add(new_log)
                db.commit()

                answer_telegram_callback(cb_id, "¡Sesión Libre iniciada!")
                text, markup = build_workout_menu(user, db)
                send_telegram_message(
                    chat_id,
                    "⚡ *¡Sesión Libre Iniciada!*\nEnvía tus series en formato `<peso> <reps>` cuando termines cada una.",
                    reply_markup=get_main_menu_keyboard()
                )
                send_telegram_message(chat_id, text, reply_markup=markup)
                return

            if cb_data == "workout:prompt_set":
                answer_telegram_callback(cb_id)
                send_telegram_message(
                    chat_id,
                    "✍️ *Para registrar tu serie, simplemente escribe:*\n\n"
                    "`<peso> <repeticiones>`\n\n"
                    "_Ejemplo: `80 10`  (para 80kg y 10 reps)_"
                )
                return

            if cb_data.startswith("workout:select_ex:"):
                # Formato: workout:select_ex:<exercise_id>:<weight>:<reps>
                parts = cb_data.split(":")
                ex_id = int(parts[2])
                weight = float(parts[3])
                reps = int(parts[4])

                active_log = db.query(WorkoutLog).filter(
                    WorkoutLog.user_id == user.id,
                    WorkoutLog.status == "in_progress"
                ).first()

                if not active_log:
                    answer_telegram_callback(cb_id, "No hay entrenamiento activo.", show_alert=True)
                    return

                ex = db.query(Exercise).filter(Exercise.id == ex_id).first()
                ex_name = clean_markdown(ex.name) if ex else "Ejercicio"

                max_set = db.query(func.max(WorkoutSet.set_number)).filter(
                    WorkoutSet.workout_log_id == active_log.id,
                    WorkoutSet.exercise_id == ex_id
                ).scalar()
                next_set = (max_set or 0) + 1

                new_set = WorkoutSet(
                    workout_log_id=active_log.id,
                    exercise_id=ex_id,
                    set_number=next_set,
                    reps_completed=reps,
                    weight_kg=weight
                )
                db.add(new_set)
                db.commit()

                answer_telegram_callback(cb_id, f"Serie #{next_set} guardada")
                
                feedback_markup = {
                    "inline_keyboard": [
                        [
                            {"text": f"➕ Repetir Serie ({weight}kg x {reps})", "callback_data": f"workout:repeat_set:{active_log.id}:{ex_id}:{weight}:{reps}"}
                        ],
                        [
                            {"text": "🏋️ Ver Sesión", "callback_data": "menu:workout"},
                            {"text": "🏁 Finalizar", "callback_data": "workout:finish_prompt"}
                        ]
                    ]
                }
                send_telegram_message(
                    chat_id,
                    f"✅ *Serie #{next_set} registrada con éxito!*\n🏋️ *{ex_name}*: `{weight} kg` × `{reps} reps`",
                    reply_markup=feedback_markup
                )
                return

            if cb_data.startswith("workout:repeat_set:"):
                # Formato: workout:repeat_set:<log_id>:<exercise_id>:<weight>:<reps>
                parts = cb_data.split(":")
                log_id = int(parts[2])
                ex_id = int(parts[3])
                weight = float(parts[4])
                reps = int(parts[5])

                active_log = db.query(WorkoutLog).filter(
                    WorkoutLog.id == log_id,
                    WorkoutLog.user_id == user.id,
                    WorkoutLog.status == "in_progress"
                ).first()

                if not active_log:
                    answer_telegram_callback(cb_id, "Este entrenamiento ya fue finalizado.", show_alert=True)
                    return

                ex = db.query(Exercise).filter(Exercise.id == ex_id).first()
                ex_name = clean_markdown(ex.name) if ex else "Ejercicio"

                max_set = db.query(func.max(WorkoutSet.set_number)).filter(
                    WorkoutSet.workout_log_id == active_log.id,
                    WorkoutSet.exercise_id == ex_id
                ).scalar()
                next_set = (max_set or 0) + 1

                new_set = WorkoutSet(
                    workout_log_id=active_log.id,
                    exercise_id=ex_id,
                    set_number=next_set,
                    reps_completed=reps,
                    weight_kg=weight
                )
                db.add(new_set)
                db.commit()

                answer_telegram_callback(cb_id, f"¡Serie #{next_set} repetida!")

                feedback_markup = {
                    "inline_keyboard": [
                        [
                            {"text": f"➕ Repetir Serie ({weight}kg x {reps})", "callback_data": f"workout:repeat_set:{active_log.id}:{ex_id}:{weight}:{reps}"}
                        ],
                        [
                            {"text": "🏋️ Ver Sesión", "callback_data": "menu:workout"},
                            {"text": "🏁 Finalizar", "callback_data": "workout:finish_prompt"}
                        ]
                    ]
                }
                send_telegram_message(
                    chat_id,
                    f"✅ *Serie #{next_set} registrada:*\n🏋️ *{ex_name}*: `{weight} kg` × `{reps} reps`",
                    reply_markup=feedback_markup
                )
                return

            if cb_data == "workout:finish_prompt":
                text = (
                    "🏁 *¿Deseas finalizar tu entrenamiento actual?*\n\n"
                    "Se calculará la duración total y se guardará en tu historial de progreso."
                )
                markup = {
                    "inline_keyboard": [
                        [
                            {"text": "✅ Sí, Finalizar Sesión", "callback_data": "workout:finish"}
                        ],
                        [
                            {"text": "❌ Continuar Entrenando", "callback_data": "menu:workout"}
                        ]
                    ]
                }
                edit_telegram_message(chat_id, message_id, text, markup)
                answer_telegram_callback(cb_id)
                return

            if cb_data == "workout:finish":
                active_log = db.query(WorkoutLog).filter(
                    WorkoutLog.user_id == user.id,
                    WorkoutLog.status == "in_progress"
                ).first()

                if not active_log:
                    answer_telegram_callback(cb_id, "No hay ningún entrenamiento activo.", show_alert=True)
                    text, markup = build_workout_menu(user, db)
                    edit_telegram_message(chat_id, message_id, text, markup)
                    return

                # Calcular duración
                elapsed_min = 0
                if active_log.created_at:
                    now_utc = datetime.now(timezone.utc)
                    created_at = active_log.created_at
                    if created_at.tzinfo is None:
                        created_at = created_at.replace(tzinfo=timezone.utc)
                    elapsed_min = max(1, int((now_utc - created_at).total_seconds() // 60))

                active_log.status = "completed"
                active_log.duration_minutes = elapsed_min
                db.commit()

                sets_count = db.query(WorkoutSet).filter(WorkoutSet.workout_log_id == active_log.id).count()
                r_name = clean_markdown(active_log.routine.name) if active_log.routine else "Entrenamiento Libre"

                answer_telegram_callback(cb_id, "¡Entrenamiento finalizado con éxito!")

                text = (
                    f"🏆 *¡Entrenamiento Completado!* 🎉\n"
                    f"━━━━━━━━━━━━━━━━━━━━\n"
                    f"📋 *Rutina:* `{r_name}`\n"
                    f"⏱️ *Duración total:* `{elapsed_min} minutos`\n"
                    f"🔢 *Series realizadas:* `{sets_count}`\n\n"
                    f"💪 *¡Excelente trabajo! Sigue constante.*"
                )
                markup = {
                    "inline_keyboard": [
                        [{"text": "📊 Ver Historial & Progreso", "callback_data": "menu:history"}],
                        [{"text": "🏠 Menú Principal", "callback_data": "menu:main"}]
                    ]
                }
                edit_telegram_message(chat_id, message_id, text, markup)
                return

            if cb_data == "workout:cancel_prompt":
                text = (
                    "⚠️ *¿Seguro que deseas cancelar el entrenamiento?*\n\n"
                    "Esta acción cancelará la sesión actual."
                )
                markup = {
                    "inline_keyboard": [
                        [{"text": "🗑️ Sí, Cancelar Sesión", "callback_data": "workout:cancel"}],
                        [{"text": "🔙 No, Volver", "callback_data": "menu:workout"}]
                    ]
                }
                edit_telegram_message(chat_id, message_id, text, markup)
                answer_telegram_callback(cb_id)
                return

            if cb_data == "workout:cancel":
                db.query(WorkoutLog).filter(
                    WorkoutLog.user_id == user.id,
                    WorkoutLog.status == "in_progress"
                ).delete()
                db.commit()

                answer_telegram_callback(cb_id, "Sesión cancelada.")
                text, markup = build_workout_menu(user, db)
                edit_telegram_message(chat_id, message_id, text, markup)
                return

            # C. Manejo de Solicitudes de Amistad
            if cb_data.startswith("accept_friend:"):
                req_id = int(cb_data.split(":")[1])
                req = db.query(Friendship).filter(Friendship.id == req_id).first()

                if not req:
                    answer_telegram_callback(cb_id, "Solicitud no encontrada.")
                    text, markup = build_community_menu(user, db)
                    edit_telegram_message(chat_id, message_id, text, markup)
                    return

                if req.status == "accepted":
                    answer_telegram_callback(cb_id, "¡Ya son amigos!")
                    text, markup = build_community_menu(user, db)
                    edit_telegram_message(chat_id, message_id, text, markup)
                    return

                if req.status == "pending" and req.friend_id == user.id:
                    req.status = "accepted"
                    db.commit()
                    requester_username = clean_markdown(req.requester.username) if req.requester else "el usuario"
                    notify_friend_accepted(db, user.id, req.user_id)
                    answer_telegram_callback(cb_id, "¡Solicitud aceptada!")
                    send_telegram_message(chat_id, f"✅ *¡Solicitud aceptada!* Ahora eres amigo de *{requester_username}*.")
                    text, markup = build_community_menu(user, db)
                    edit_telegram_message(chat_id, message_id, text, markup)
                    return

            if cb_data.startswith("reject_friend:"):
                req_id = int(cb_data.split(":")[1])
                req = db.query(Friendship).filter(Friendship.id == req_id).first()

                if not req:
                    answer_telegram_callback(cb_id, "Solicitud no encontrada.")
                    text, markup = build_community_menu(user, db)
                    edit_telegram_message(chat_id, message_id, text, markup)
                    return

                if req.status == "pending" and req.friend_id == user.id:
                    requester_id = req.user_id
                    requester_username = clean_markdown(req.requester.username) if req.requester else "el usuario"
                    db.delete(req)
                    db.commit()
                    notify_friend_rejected(db, user.id, requester_id)
                    answer_telegram_callback(cb_id, "Solicitud rechazada.")
                    send_telegram_message(chat_id, f"❌ *Solicitud de {requester_username} rechazada.*")
                    text, markup = build_community_menu(user, db)
                    edit_telegram_message(chat_id, message_id, text, markup)
                    return

            # D. Manejo de Invitaciones a Entrenar (Citas de Calendario)
            if cb_data.startswith("accept_workout:"):
                sw_id = int(cb_data.split(":")[1])
                sw = db.query(ScheduledWorkout).filter(ScheduledWorkout.id == sw_id).first()

                if not sw or sw.user_id != user.id:
                    answer_telegram_callback(cb_id, "Invitación no encontrada.", show_alert=True)
                    return

                if sw.status in ["scheduled", "accepted"]:
                    answer_telegram_callback(cb_id, "¡Ya aceptaste esta cita!")
                    text, markup = build_community_menu(user, db)
                    edit_telegram_message(chat_id, message_id, text, markup)
                    return

                # Clonar rutina si es de otro usuario
                original_routine = db.query(Routine).filter(Routine.id == sw.routine_id).first() if sw.routine_id else None
                routine_name = original_routine.name if original_routine else "Entrenamiento"

                if original_routine and original_routine.user_id != user.id:
                    try:
                        cloned_routine = Routine(
                            name=f"{original_routine.name}",
                            description=original_routine.description or "",
                            is_public=False,
                            user_id=user.id
                        )
                        db.add(cloned_routine)
                        db.flush()

                        for orig_re in original_routine.routine_exercises:
                            new_re = RoutineExercise(
                                routine_id=cloned_routine.id,
                                exercise_id=orig_re.exercise_id,
                                sets=orig_re.sets,
                                reps=orig_re.reps,
                                rest_seconds=orig_re.rest_seconds,
                                order_index=orig_re.order_index
                            )
                            db.add(new_re)

                        db.flush()
                        sw.routine_id = cloned_routine.id
                    except Exception as e:
                        print(f"Error clonando rutina desde Telegram: {e}")

                sw.status = "scheduled"
                db.commit()

                if sw.invited_by_id:
                    notify_workout_accepted(db, user.id, sw.invited_by_id, sw.id, routine_name, sw.scheduled_date)

                answer_telegram_callback(cb_id, "¡Entrenamiento aceptado!")
                send_telegram_message(chat_id, f"✅ *¡Invitación Aceptada!* La rutina *{clean_markdown(routine_name)}* se ha añadido a tu calendario para el día *{sw.scheduled_date}*.")
                text, markup = build_community_menu(user, db)
                edit_telegram_message(chat_id, message_id, text, markup)
                return

            if cb_data.startswith("reject_workout:"):
                sw_id = int(cb_data.split(":")[1])
                sw = db.query(ScheduledWorkout).filter(ScheduledWorkout.id == sw_id).first()

                if not sw or sw.user_id != user.id:
                    answer_telegram_callback(cb_id, "Invitación no encontrada.", show_alert=True)
                    return

                inviter_id = sw.invited_by_id
                scheduled_date = sw.scheduled_date
                routine = db.query(Routine).filter(Routine.id == sw.routine_id).first() if sw.routine_id else None
                routine_name = routine.name if routine else "Entrenamiento"

                db.delete(sw)
                db.commit()

                if inviter_id:
                    notify_workout_rejected(db, user.id, inviter_id, routine_name, scheduled_date)

                answer_telegram_callback(cb_id, "Invitación rechazada.")
                send_telegram_message(chat_id, f"❌ *Invitación para {clean_markdown(routine_name)} rechazada.*")
                text, markup = build_community_menu(user, db)
                edit_telegram_message(chat_id, message_id, text, markup)
                return

            # E. Ajustes y Configuración
            if cb_data == "settings:help":
                text, markup = build_help_menu(user)
                edit_telegram_message(chat_id, message_id, text, markup)
                answer_telegram_callback(cb_id)
                return

            if cb_data == "settings:test":
                answer_telegram_callback(cb_id, "¡Conexión excelente! 🚀", show_alert=True)
                return

            if cb_data == "settings:unlink_prompt":
                text = (
                    "⚠️ *¿Deseas desvincular tu cuenta de Telegram?*\n\n"
                    "Dejarás de recibir alertas y notificaciones aquí hasta que vuelvas a vincular tu cuenta con un nuevo código."
                )
                markup = {
                    "inline_keyboard": [
                        [{"text": "🔴 Sí, Desvincular Cuenta", "callback_data": "settings:unlink"}],
                        [{"text": "🟢 No, Mantener Conectado", "callback_data": "menu:settings"}]
                    ]
                }
                edit_telegram_message(chat_id, message_id, text, markup)
                answer_telegram_callback(cb_id)
                return

            if cb_data == "settings:unlink":
                user.telegram_chat_id = None
                db.commit()
                answer_telegram_callback(cb_id, "Cuenta desvinculada.")
                send_telegram_message(
                    chat_id,
                    "👋 *Tu cuenta ha sido desvinculada exitosamente.*\nPara volver a conectar, genera un código en la App Web e ingrésalo aquí.",
                    reply_markup={"remove_keyboard": True}
                )
                return

            answer_telegram_callback(cb_id)
            return

        # ----------------------------------------------------------------------
        # 2. Manejo de mensajes de texto entrantes
        # ----------------------------------------------------------------------
        if "message" not in data or "text" not in data["message"]:
            return

        chat_id = data["message"]["chat"]["id"]
        text_raw = data["message"]["text"].strip()
        text_lower = text_raw.lower()

        # Vinculación por código de 6 dígitos
        match_code = re.search(r"\b(\d{6})\b", text_raw)
        if match_code:
            code = match_code.group(1)
            user_by_token = db.query(User).filter(User.telegram_sync_token == code).first()
            if user_by_token:
                user_by_token.telegram_chat_id = str(chat_id)
                user_by_token.telegram_sync_token = None
                db.commit()
                
                welcome_text, welcome_markup = build_main_menu(user_by_token, db)
                send_telegram_message(
                    chat_id,
                    "🎉 *¡Cuenta vinculada exitosamente!* Todo está listo para tus entrenamientos.",
                    reply_markup=get_main_menu_keyboard()
                )
                send_telegram_message(chat_id, welcome_text, reply_markup=welcome_markup)
                return
            else:
                send_telegram_message(chat_id, "❌ *Código inválido o expirado.* Genera uno nuevo en la web.")
                return

        # Verificar si el usuario está registrado en GymTracker
        user = db.query(User).filter(User.telegram_chat_id == str(chat_id)).first()
        if not user:
            send_telegram_message(
                chat_id,
                "🚫 *Cuenta no vinculada a GymTracker.*\n\n"
                "Para comenzar, abre la App Web, ve a *Ajustes > Telegram*, genera tu código de 6 dígitos y envíalo aquí.",
                reply_markup={"remove_keyboard": True}
            )
            return

        # Botones del Teclado Inferior Permanente & Comandos equivalentes
        if text_raw.startswith("🏋️") or text_lower in ["mi entrenamiento", "/estado", "/entrenamiento"]:
            msg, markup = build_workout_menu(user, db)
            send_telegram_message(chat_id, msg, reply_markup=markup)
            return

        if text_raw.startswith("📋") or text_lower in ["mis rutinas", "/rutinas", "rutinas"]:
            msg, markup = build_routines_menu(user, db)
            send_telegram_message(chat_id, msg, reply_markup=markup)
            return

        if text_raw.startswith("📊") or text_lower in ["historial & progreso", "historial", "/historial", "/stats", "progreso"]:
            msg, markup = build_history_menu(user, db)
            send_telegram_message(chat_id, msg, reply_markup=markup)
            return

        if text_raw.startswith("📅") or text_lower in ["calendario", "/calendario", "citas", "/citas"]:
            msg, markup = build_calendar_menu(user, db)
            send_telegram_message(chat_id, msg, reply_markup=markup)
            return

        if text_raw.startswith("👥") or text_lower in ["comunidad & avisos", "comunidad", "/notificaciones", "/solicitudes", "notificaciones"]:
            msg, markup = build_community_menu(user, db)
            send_telegram_message(chat_id, msg, reply_markup=markup)
            return

        if text_raw.startswith("⚙️") or text_lower in ["mi cuenta / menú", "ajustes", "/ajustes", "perfil", "/perfil"]:
            msg, markup = build_settings_menu(user, db)
            send_telegram_message(chat_id, msg, reply_markup=markup)
            return

        if text_lower in ["/start", "/menu", "menu", "/ayuda", "/help", "ayuda"]:
            msg, markup = build_main_menu(user, db)
            send_telegram_message(chat_id, msg, reply_markup=get_main_menu_keyboard())
            return

        if text_lower == "/test":
            send_telegram_message(chat_id, "🤖 *¡El bot está conectado y funcionando al 100%!*")
            return

        if text_lower == "/desvincular":
            user.telegram_chat_id = None
            db.commit()
            send_telegram_message(
                chat_id,
                "✅ *Desvinculado.*\nTu cuenta ha sido desconectada del bot.",
                reply_markup={"remove_keyboard": True}
            )
            return

        # ----------------------------------------------------------------------
        # 3. Detección Inteligente de Series: <peso> <reps> (ej: 80 10 o 75.5 8)
        # ----------------------------------------------------------------------
        match_series = re.match(r"^(\d+(?:\.\d+)?)\s*(?:kg)?\s*[\sxX,-]\s*(\d+)(?:\s*reps?)?$", text_raw, re.IGNORECASE)
        if match_series:
            weight = float(match_series.group(1))
            reps = int(match_series.group(2))

            active_log = db.query(WorkoutLog).filter(
                WorkoutLog.user_id == user.id,
                WorkoutLog.status == "in_progress"
            ).first()

            if not active_log:
                # Ofrecer iniciar una sesión libre o elegir rutina
                markup = {
                    "inline_keyboard": [
                        [{"text": "⚡ Iniciar Sesión Libre Ahora", "callback_data": "workout:start_free"}],
                        [{"text": "📋 Seleccionar una Rutina", "callback_data": "menu:routines"}]
                    ]
                }
                send_telegram_message(
                    chat_id,
                    f"💡 Detecté que quieres registrar `{weight}kg` × `{reps} reps`, pero no tienes un entrenamiento activo.",
                    reply_markup=markup
                )
                return

            # Determinar ejercicio
            last_set = db.query(WorkoutSet).filter(
                WorkoutSet.workout_log_id == active_log.id
            ).order_by(WorkoutSet.id.desc()).first()

            exercise_id = None
            if last_set:
                exercise_id = last_set.exercise_id
            elif active_log.routine and active_log.routine.routine_exercises:
                # Si la rutina tiene ejercicios pero aún no se registró ninguna serie, permitir elegir cuál
                routine_exercises = active_log.routine.routine_exercises
                buttons = []
                for re_ex in routine_exercises:
                    ex_name = clean_markdown(re_ex.exercise.name) if re_ex.exercise else "Ejercicio"
                    buttons.append([
                        {"text": f"🏋️ {ex_name}", "callback_data": f"workout:select_ex:{re_ex.exercise_id}:{weight}:{reps}"}
                    ])
                
                send_telegram_message(
                    chat_id,
                    f"🏋️ *¿Para qué ejercicio deseas registrar los {weight}kg x {reps} reps?*",
                    reply_markup={"inline_keyboard": buttons}
                )
                return
            else:
                # Si es un entrenamiento libre sin sets, buscar o asignar un ejercicio genérico
                first_exercise = db.query(Exercise).first()
                if first_exercise:
                    exercise_id = first_exercise.id

            if not exercise_id:
                send_telegram_message(
                    chat_id,
                    "⚠️ *No hay ejercicios disponibles en la base de datos.* Crea uno en la web.",
                    reply_markup=get_main_menu_keyboard()
                )
                return

            ex = db.query(Exercise).filter(Exercise.id == exercise_id).first()
            ex_name = clean_markdown(ex.name) if ex else "Ejercicio"

            max_set = db.query(func.max(WorkoutSet.set_number)).filter(
                WorkoutSet.workout_log_id == active_log.id,
                WorkoutSet.exercise_id == exercise_id
            ).scalar()
            next_set = (max_set or 0) + 1

            new_set = WorkoutSet(
                workout_log_id=active_log.id,
                exercise_id=exercise_id,
                set_number=next_set,
                reps_completed=reps,
                weight_kg=weight
            )
            db.add(new_set)
            db.commit()

            feedback_markup = {
                "inline_keyboard": [
                    [
                        {"text": f"➕ Repetir Serie ({weight}kg x {reps})", "callback_data": f"workout:repeat_set:{active_log.id}:{exercise_id}:{weight}:{reps}"}
                    ],
                    [
                        {"text": "🏋️ Ver Sesión", "callback_data": "menu:workout"},
                        {"text": "🏁 Finalizar", "callback_data": "workout:finish_prompt"}
                    ]
                ]
            }

            send_telegram_message(
                chat_id,
                f"✅ *Serie #{next_set} registrada:*\n🏋️ *{ex_name}*: `{weight} kg` × `{reps} reps`",
                reply_markup=feedback_markup
            )
            return

        # Respuesta por defecto ante texto libre no reconocido
        msg, markup = build_main_menu(user, db)
        send_telegram_message(
            chat_id,
            "❓ *No comprendí ese mensaje.*\n\n"
            "• Para registrar una serie envía: `<peso> <reps>` (ej: `80 10`)\n"
            "• O usa los botones interactivos a continuación:",
            reply_markup=get_main_menu_keyboard()
        )
        send_telegram_message(chat_id, msg, reply_markup=markup)

    except Exception as e:
        print(f"[Telegram] Error procesando update: {e}")
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
    print("[Telegram] Bot Polling iniciado con menús interactivos y teclado persistente.")

