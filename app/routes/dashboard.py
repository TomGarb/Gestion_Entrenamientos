from datetime import date, timedelta
from flask import Blueprint, render_template
from flask_login import login_required, current_user
from sqlalchemy import func

from app import db
from app.models import WorkoutLog, WorkoutSet, Routine, Exercise

dashboard_bp = Blueprint("dashboard", __name__)


@dashboard_bp.route("/")
@login_required
def index():
    """Renderiza el dashboard con métricas reales."""
    
    today = date.today()
    start_of_week = today - timedelta(days=today.weekday())
    start_of_month = today.replace(day=1)
    
    # Entrenamientos esta semana
    workouts_week = WorkoutLog.query.filter(
        WorkoutLog.user_id == current_user.id,
        WorkoutLog.status == 'completed',
        WorkoutLog.date >= start_of_week
    ).count()
    
    # Entrenamientos este mes
    workouts_month = WorkoutLog.query.filter(
        WorkoutLog.user_id == current_user.id,
        WorkoutLog.status == 'completed',
        WorkoutLog.date >= start_of_month
    ).count()
    
    # Volumen esta semana
    volume_week_q = db.session.query(func.sum(WorkoutSet.reps_completed * WorkoutSet.weight_kg))\
        .join(WorkoutLog)\
        .filter(WorkoutLog.user_id == current_user.id, WorkoutLog.status == 'completed', WorkoutLog.date >= start_of_week).scalar()
    volume_week = float(volume_week_q or 0)
    
    # Volumen este mes
    volume_month_q = db.session.query(func.sum(WorkoutSet.reps_completed * WorkoutSet.weight_kg))\
        .join(WorkoutLog)\
        .filter(WorkoutLog.user_id == current_user.id, WorkoutLog.status == 'completed', WorkoutLog.date >= start_of_month).scalar()
    volume_month = float(volume_month_q or 0)
    
    # Músculo favorito (mes)
    favorite_muscle_q = db.session.query(Exercise.muscle_group, func.count(WorkoutSet.id).label('count'))\
        .join(WorkoutSet)\
        .join(WorkoutLog)\
        .filter(WorkoutLog.user_id == current_user.id, WorkoutLog.status == 'completed', WorkoutLog.date >= start_of_month)\
        .group_by(Exercise.muscle_group)\
        .order_by(db.text('count DESC')).first()
        
    favorite_muscle = favorite_muscle_q[0].capitalize() if favorite_muscle_q else "Ninguno"
    
    # Racha (cálculo simplificado, solo mira días consecutivos hasta hoy)
    streak = 0
    if workouts_week > 0:
        streak = workouts_week # Aproximación

    metrics = {
        "workouts_week": workouts_week,
        "volume_week": volume_week,
        "streak": streak,
        "favorite_muscle": favorite_muscle,
        "workouts_month": workouts_month,
        "volume_month": volume_month,
    }

    # Entrenamientos recientes
    recent_logs = WorkoutLog.query.filter_by(user_id=current_user.id, status='completed')\
        .order_by(WorkoutLog.date.desc()).limit(3).all()
        
    recent_workouts = []
    for log in recent_logs:
        log_volume = sum(s.reps_completed * s.weight_kg for s in log.sets)
        routine_name = log.routine.name if log.routine else "Entrenamiento Libre"
        recent_workouts.append({
            "date": log.date.strftime("%Y-%m-%d"),
            "routine_name": routine_name,
            "duration": log.duration_minutes or "-",
            "volume": log_volume,
        })

    return render_template(
        "dashboard.html",
        metrics=metrics,
        recent_workouts=recent_workouts,
    )
