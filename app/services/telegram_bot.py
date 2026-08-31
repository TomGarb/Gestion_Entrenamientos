"""
Lógica del Bot de Telegram con estado en base de datos y patrón Live Message.
"""
import telebot
from telebot.types import InlineKeyboardMarkup, InlineKeyboardButton, ReplyKeyboardMarkup, KeyboardButton, ForceReply
import os
from threading import Thread

from app import db
from app.models import User, Routine, RoutineExercise, WorkoutLog, WorkoutSet, Exercise

TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11")
bot = telebot.TeleBot(TELEGRAM_BOT_TOKEN)

def get_user_by_chat_id(chat_id):
    """Obtiene el usuario vinculado a este chat_id, o None."""
    return User.query.filter_by(telegram_chat_id=str(chat_id)).first()

def get_exercise_live_data(active_log, exercise_id):
    """
    Genera el texto (Live Message) y el teclado (InlineKeyboardMarkup) 
    para el panel de control de un ejercicio específico.
    """
    re = RoutineExercise.query.filter_by(routine_id=active_log.routine_id, exercise_id=exercise_id).first()
    ex_name = re.exercise.name if re else "Ejercicio"
    t_sets = re.sets if re else "-"
    t_reps = re.reps if re else "-"
    
    sets = WorkoutSet.query.filter_by(workout_log_id=active_log.id, exercise_id=exercise_id).order_by(WorkoutSet.set_number).all()
    
    # Construir el texto del Live Message
    text = f"🏋️‍♂️ *{ex_name}* ({t_sets}x{t_reps})\n\n"
    for i, s in enumerate(sets, 1):
        text += f" - Serie {i}: {s.weight_kg}kg x {s.reps_completed} reps ✅\n"
    if not sets:
        text += " - Esperando datos...\n"
        
    markup = InlineKeyboardMarkup()
    
    # Calcular el peso y reps por defecto para el botón de acceso rápido
    # Si hay series previas, repetimos el último peso/reps (UX fluida)
    if sets:
        last_s = sets[-1]
        default_w = last_s.weight_kg
        default_r = last_s.reps_completed
    else:
        default_w = 10.0
        default_r = t_reps if isinstance(t_reps, int) else 10
        
    markup.add(InlineKeyboardButton(f"➕ Añadir Serie ({default_w}kg x {default_r})", callback_data=f"add_set_{exercise_id}_{default_w}_{default_r}"))
    
    # Botones adicionales de edición
    row = []
    if sets:
        row.append(InlineKeyboardButton("↩️ Deshacer Última", callback_data=f"undo_set_{exercise_id}"))
        row.append(InlineKeyboardButton("✏️ Editar Serie", callback_data=f"edit_menu_{exercise_id}"))
    if row:
        markup.row(*row)
        
    return text, markup


def register_handlers(app):
    @bot.message_handler(commands=['start'])
    def send_welcome(message):
        with app.app_context():
            user = get_user_by_chat_id(message.chat.id)
            if user:
                active_log = WorkoutLog.query.filter_by(user_id=user.id, status='in_progress').first()
                if active_log:
                    bot.reply_to(message, f"¡Hola de nuevo {user.username}!\nTienes un entrenamiento en curso del {active_log.date}.", reply_markup=main_menu())
                else:
                    bot.reply_to(message, f"¡Hola de nuevo {user.username}! ¿Qué entrenamos hoy?", reply_markup=main_menu())
            else:
                bot.reply_to(message, "¡Hola! Para conectar tu cuenta de GymTracker, envíame tu Token de Vinculación generado en la web.")

    @bot.message_handler(func=lambda msg: len(msg.text) == 6 and msg.text.isalnum())
    def link_account(message):
        with app.app_context():
            token = message.text.upper()
            user = User.query.filter_by(telegram_sync_token=token).first()
            if user:
                user.telegram_chat_id = str(message.chat.id)
                user.telegram_sync_token = None
                db.session.commit()
                bot.reply_to(message, f"¡Cuenta vinculada con éxito, {user.username}!", reply_markup=main_menu())
            else:
                bot.reply_to(message, "Token inválido o expirado. Genera uno nuevo en la web.")

    @bot.message_handler(func=lambda msg: msg.text == "💪 Iniciar Entrenamiento")
    def list_routines_for_workout(message):
        with app.app_context():
            user = get_user_by_chat_id(message.chat.id)
            if not user:
                return bot.reply_to(message, "Cuenta no vinculada.")
            
            active_log = WorkoutLog.query.filter_by(user_id=user.id, status='in_progress').first()
            if active_log:
                bot.reply_to(message, f"Tienes un entrenamiento en curso ({active_log.date}).")
                markup_end = InlineKeyboardMarkup()
                markup_end.add(InlineKeyboardButton("✅ Terminar Entrenamiento (En Curso)", callback_data="finish_workout"))
                bot.send_message(message.chat.id, "Usa los mensajes del chat para registrar series o presiona terminar:", reply_markup=markup_end)
                return
            
            routines = Routine.query.filter_by(user_id=user.id).all()
            if not routines:
                return bot.reply_to(message, "No tienes rutinas creadas. Créalas en la web primero.")
            
            markup = InlineKeyboardMarkup()
            for r in routines:
                markup.add(InlineKeyboardButton(r.name, callback_data=f"start_routine_{r.id}"))
            
            bot.send_message(message.chat.id, "Selecciona la rutina:", reply_markup=markup)

    @bot.callback_query_handler(func=lambda call: call.data.startswith("start_routine_"))
    def start_routine_callback(call):
        with app.app_context():
            user = get_user_by_chat_id(call.message.chat.id)
            if not user: return
            
            active_log = WorkoutLog.query.filter_by(user_id=user.id, status='in_progress').first()
            if active_log:
                return bot.answer_callback_query(call.id, "Ya tienes un entrenamiento en curso.", show_alert=True)
            
            routine_id = int(call.data.split("_")[2])
            routine = db.session.get(Routine, routine_id)
            
            from datetime import date
            log = WorkoutLog(
                user_id=user.id,
                routine_id=routine.id,
                date=date.today(),
                status='in_progress',
                notes="Iniciado vía Telegram"
            )
            db.session.add(log)
            db.session.commit()
            
            bot.answer_callback_query(call.id, f"Iniciando: {routine.name}")
            bot.send_message(call.message.chat.id, f"🔥 ¡Entrenamiento '{routine.name}' iniciado!\nUsa los paneles debajo para registrar el avance.")
            
            for re in routine.routine_exercises.order_by(db.text("order_index")).all():
                text, markup = get_exercise_live_data(log, re.exercise.id)
                bot.send_message(call.message.chat.id, text, reply_markup=markup, parse_mode='Markdown')
            
            markup_end = InlineKeyboardMarkup()
            markup_end.add(InlineKeyboardButton("✅ Terminar Entrenamiento", callback_data="finish_workout"))
            bot.send_message(call.message.chat.id, "Cuando termines todo el entrenamiento, presiona aquí:", reply_markup=markup_end)

    @bot.callback_query_handler(func=lambda call: call.data.startswith("add_set_"))
    def add_set_callback(call):
        parts = call.data.split("_")
        ex_id = int(parts[2])
        weight = float(parts[3])
        reps = int(parts[4])
        
        with app.app_context():
            user = get_user_by_chat_id(call.message.chat.id)
            if not user: return
            
            active_log = WorkoutLog.query.filter_by(user_id=user.id, status='in_progress').first()
            if not active_log:
                return bot.answer_callback_query(call.id, "No hay un entrenamiento activo.", show_alert=True)
            
            current_sets = WorkoutSet.query.filter_by(workout_log_id=active_log.id, exercise_id=ex_id).count()
            
            w_set = WorkoutSet(
                workout_log_id=active_log.id,
                exercise_id=ex_id,
                set_number=current_sets + 1,
                reps_completed=reps,
                weight_kg=weight
            )
            db.session.add(w_set)
            db.session.commit()
            
            bot.answer_callback_query(call.id, f"Serie registrada: {weight}kg x {reps} reps")
            
            # Live Update
            text, markup = get_exercise_live_data(active_log, ex_id)
            bot.edit_message_text(text, chat_id=call.message.chat.id, message_id=call.message.message_id, reply_markup=markup, parse_mode='Markdown')

    @bot.callback_query_handler(func=lambda call: call.data.startswith("undo_set_"))
    def undo_set_callback(call):
        ex_id = int(call.data.split("_")[2])
        with app.app_context():
            user = get_user_by_chat_id(call.message.chat.id)
            if not user: return
            
            active_log = WorkoutLog.query.filter_by(user_id=user.id, status='in_progress').first()
            if not active_log:
                return bot.answer_callback_query(call.id, "No hay entrenamiento activo.", show_alert=True)
                
            last_set = WorkoutSet.query.filter_by(workout_log_id=active_log.id, exercise_id=ex_id).order_by(WorkoutSet.set_number.desc()).first()
            if not last_set:
                return bot.answer_callback_query(call.id, "No hay series para deshacer.", show_alert=True)
                
            db.session.delete(last_set)
            db.session.commit()
            
            bot.answer_callback_query(call.id, "Última serie eliminada.")
            
            # Live Update
            text, markup = get_exercise_live_data(active_log, ex_id)
            bot.edit_message_text(text, chat_id=call.message.chat.id, message_id=call.message.message_id, reply_markup=markup, parse_mode='Markdown')

    @bot.callback_query_handler(func=lambda call: call.data.startswith("refresh_ex_"))
    def refresh_ex_callback(call):
        ex_id = int(call.data.split("_")[2])
        with app.app_context():
            user = get_user_by_chat_id(call.message.chat.id)
            if not user: return
            active_log = WorkoutLog.query.filter_by(user_id=user.id, status='in_progress').first()
            if not active_log: return bot.answer_callback_query(call.id, "Sin entrenamiento activo.")
            
            text, markup = get_exercise_live_data(active_log, ex_id)
            bot.edit_message_text(text, chat_id=call.message.chat.id, message_id=call.message.message_id, reply_markup=markup, parse_mode='Markdown')

    @bot.callback_query_handler(func=lambda call: call.data.startswith("edit_menu_"))
    def edit_menu_callback(call):
        ex_id = int(call.data.split("_")[2])
        with app.app_context():
            user = get_user_by_chat_id(call.message.chat.id)
            if not user: return
            active_log = WorkoutLog.query.filter_by(user_id=user.id, status='in_progress').first()
            if not active_log:
                return bot.answer_callback_query(call.id, "No hay entrenamiento activo.", show_alert=True)
                
            sets = WorkoutSet.query.filter_by(workout_log_id=active_log.id, exercise_id=ex_id).order_by(WorkoutSet.set_number).all()
            if not sets:
                return bot.answer_callback_query(call.id, "No hay series para editar.", show_alert=True)
                
            markup = InlineKeyboardMarkup()
            # Crear botones en pares
            buttons = [InlineKeyboardButton(f"Serie {i+1} ({s.weight_kg}x{s.reps_completed})", callback_data=f"edit_set_{s.id}_{ex_id}") for i, s in enumerate(sets)]
            for i in range(0, len(buttons), 2):
                markup.row(*buttons[i:i+2])
            
            markup.add(InlineKeyboardButton("🔙 Volver", callback_data=f"refresh_ex_{ex_id}"))
            
            bot.edit_message_reply_markup(chat_id=call.message.chat.id, message_id=call.message.message_id, reply_markup=markup)

    @bot.callback_query_handler(func=lambda call: call.data.startswith("edit_set_"))
    def edit_set_callback(call):
        parts = call.data.split("_")
        set_id = int(parts[2])
        ex_id = int(parts[3])
        
        # Enviamos un prompt al usuario obligándolo a responder a este mensaje
        msg = bot.send_message(call.message.chat.id, "✏️ Envía el nuevo peso y reps separados por un espacio (Ejemplo: `60 10`) o responde `cancelar`:", reply_markup=ForceReply(selective=False), parse_mode='Markdown')
        # Registramos el handler del próximo paso, pasando los IDs para poder restaurar el Live Message
        bot.register_next_step_handler(msg, process_edit_set, set_id, ex_id, call.message.message_id, msg.message_id)
        
    def process_edit_set(message, set_id, ex_id, live_msg_id, prompt_msg_id):
        # Limpieza visual silenciosa
        try:
            bot.delete_message(message.chat.id, message.message_id) # Borra la respuesta del usuario
            bot.delete_message(message.chat.id, prompt_msg_id)      # Borra el prompt del bot
        except:
            pass

        if message.text.strip().lower() == 'cancelar':
            return # Se canceló silenciosamente, la vista se queda en modo edición
            
        with app.app_context():
            try:
                parts = message.text.strip().split()
                if len(parts) != 2: raise ValueError
                weight = float(parts[0])
                reps = int(parts[1])
                
                w_set = db.session.get(WorkoutSet, set_id)
                if w_set:
                    w_set.weight_kg = weight
                    w_set.reps_completed = reps
                    db.session.commit()
                    
                    # Volver a renderizar la vista principal del ejercicio (Live Message)
                    active_log = w_set.workout_log
                    text, markup = get_exercise_live_data(active_log, ex_id)
                    bot.edit_message_text(text, chat_id=message.chat.id, message_id=live_msg_id, reply_markup=markup, parse_mode='Markdown')
            except ValueError:
                bot.send_message(message.chat.id, "❌ Formato incorrecto. Edición cancelada. Inténtalo de nuevo usando el botón de edición.")


    @bot.callback_query_handler(func=lambda call: call.data == "finish_workout")
    def finish_workout_callback(call):
        with app.app_context():
            user = get_user_by_chat_id(call.message.chat.id)
            if not user: return
            
            active_log = WorkoutLog.query.filter_by(user_id=user.id, status='in_progress').first()
            if not active_log:
                return bot.answer_callback_query(call.id, "No hay un entrenamiento activo.", show_alert=True)
            
            if active_log.sets.count() == 0:
                db.session.delete(active_log)
                db.session.commit()
                bot.edit_message_text("Entrenamiento cancelado (0 series registradas).", chat_id=call.message.chat.id, message_id=call.message.message_id)
                return bot.answer_callback_query(call.id, "Cancelado")
                
            active_log.status = 'completed'
            vol = sum(s.reps_completed * s.weight_kg for s in active_log.sets)
            db.session.commit()
            
            bot.answer_callback_query(call.id, "¡Guardado!")
            bot.edit_message_text(f"🎉 **Entrenamiento guardado exitosamente.**\nVolumen total: {vol} kg", chat_id=call.message.chat.id, message_id=call.message.message_id, parse_mode='Markdown')
            bot.send_message(call.message.chat.id, "Usa el menú para continuar:", reply_markup=main_menu())


    @bot.message_handler(func=lambda msg: msg.text == "📋 Mis Rutinas")
    def list_my_routines(message):
        with app.app_context():
            user = get_user_by_chat_id(message.chat.id)
            if not user: return
            
            routines = Routine.query.filter_by(user_id=user.id).all()
            if not routines:
                return bot.reply_to(message, "No tienes rutinas.")
                
            res = "Tus Rutinas:\n\n"
            for r in routines:
                res += f"- {r.name} ({r.routine_exercises.count()} ej.)\n"
            bot.reply_to(message, res)


def main_menu():
    markup = ReplyKeyboardMarkup(resize_keyboard=True)
    markup.row(KeyboardButton("💪 Iniciar Entrenamiento"))
    markup.row(KeyboardButton("📋 Mis Rutinas"), KeyboardButton("➕ Nuevo Ejercicio"))
    return markup


def start_bot_polling(app):
    """Inicia el bot en un hilo separado (solo para desarrollo local)."""
    register_handlers(app)
    
    def run_polling():
        print(" * Iniciando Bot de Telegram en modo Polling...")
        try:
            bot.infinity_polling()
        except Exception as e:
            print(f" * Error al iniciar el bot de Telegram (¿Token inválido?): {e}")
        
    thread = Thread(target=run_polling, daemon=True)
    thread.start()
