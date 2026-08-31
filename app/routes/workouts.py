"""
Blueprint Workouts — Registro e historial de entrenamientos.
"""
from datetime import date
from flask import Blueprint, render_template, request, jsonify
from flask_login import login_required, current_user

from app import db
from app.models import WorkoutLog, WorkoutSet, Routine, Exercise

workouts_bp = Blueprint("workouts", __name__, url_prefix="/workouts")


@workouts_bp.route("/")
@login_required
def index():
    """Historial de entrenamientos."""
    # Obtener los logs ordenados por fecha descendente
    logs = WorkoutLog.query.filter_by(user_id=current_user.id, status='completed').order_by(WorkoutLog.date.desc()).all()
    
    # Pre-calcular el volumen y cantidad de series para la vista
    history = []
    for log in logs:
        total_volume = sum(s.reps_completed * s.weight_kg for s in log.sets)
        routine_name = log.routine.name if log.routine else "Entrenamiento Libre"
        history.append({
            "id": log.id,
            "date": log.date,
            "routine_name": routine_name,
            "duration": log.duration_minutes,
            "volume": total_volume,
            "sets_count": log.sets.count()
        })
        
    return render_template("workouts.html", history=history)


@workouts_bp.route("/new", methods=["GET", "POST"])
@login_required
def new_workout():
    """Vista para iniciar un entrenamiento (GET) y API para guardarlo (POST)."""
    if request.method == "POST":
        data = request.get_json()
        
        # Validar datos básicos
        if not data.get("sets") or len(data["sets"]) == 0:
            return jsonify({"success": False, "message": "El entrenamiento debe tener al menos una serie."}), 400
            
        try:
            # Parsear fecha
            workout_date = date.fromisoformat(data.get("date", date.today().isoformat()))
            
            # Crear el log
            log = WorkoutLog(
                user_id=current_user.id,
                routine_id=data.get("routine_id") or None,
                date=workout_date,
                status='completed',
                duration_minutes=data.get("duration_minutes") or None,
                notes=data.get("notes", "")
            )
            db.session.add(log)
            db.session.flush() # Para obtener el log.id
            
            # Crear las series
            for i, s_data in enumerate(data["sets"]):
                w_set = WorkoutSet(
                    workout_log_id=log.id,
                    exercise_id=s_data["exercise_id"],
                    set_number=i + 1,
                    reps_completed=s_data["reps_completed"],
                    weight_kg=s_data["weight_kg"],
                    rpe=s_data.get("rpe"),
                    notes=s_data.get("notes", "")
                )
                db.session.add(w_set)
                
            db.session.commit()
            return jsonify({"success": True, "message": "Entrenamiento guardado con éxito.", "log_id": log.id}), 201
            
        except Exception as e:
            db.session.rollback()
            return jsonify({"success": False, "message": str(e)}), 500

    # Si es GET, mostrar el formulario
    routines = Routine.query.filter_by(user_id=current_user.id).all()
    # Permitir ver ejercicios globales (sin user_id) o del usuario actual
    exercises = Exercise.query.filter((Exercise.user_id == current_user.id) | (Exercise.user_id == None)).all()
    
    # Serializar rutinas para inyectar en JS
    routines_data = {}
    for r in routines:
        routines_data[r.id] = {
            "name": r.name,
            "exercises": [{"id": re.exercise_id, "sets": re.sets} for re in r.routine_exercises.order_by(db.text("id")).all()]
        }
        
    return render_template(
        "workouts_new.html", 
        routines=routines, 
        exercises=exercises,
        routines_json=routines_data
    )
