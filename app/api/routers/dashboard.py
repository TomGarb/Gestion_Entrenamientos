from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from datetime import datetime, timedelta, timezone, date

from app.database import get_db
from app.models.workout import WorkoutLog, WorkoutSet
from app.models.routine import Routine
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

@router.get("/stats")
def get_dashboard_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    seven_days_ago = now - timedelta(days=7)
    first_of_month = date(now.year, now.month, 1)

    # 1. Entrenamientos últimos 7 días
    recent_workouts_count = db.query(WorkoutLog).filter(
        WorkoutLog.user_id == current_user.id,
        WorkoutLog.status == "completed",
        WorkoutLog.created_at >= seven_days_ago
    ).count()

    # 2. Volumen total levantado (mes actual)
    volume_query = db.query(func.sum(WorkoutSet.reps_completed * WorkoutSet.weight_kg))\
        .join(WorkoutLog)\
        .filter(
            WorkoutLog.user_id == current_user.id,
            WorkoutLog.status == "completed",
            WorkoutLog.date >= first_of_month
        ).scalar()
    total_volume = volume_query or 0.0

    # 3. Último entrenamiento
    last_workout = db.query(WorkoutLog)\
        .filter(WorkoutLog.user_id == current_user.id, WorkoutLog.status == "completed")\
        .order_by(desc(WorkoutLog.created_at))\
        .first()
        
    last_workout_data = None
    if last_workout:
        routine_name = "Entrenamiento Libre"
        if last_workout.routine_id:
            routine = db.query(Routine).filter(Routine.id == last_workout.routine_id).first()
            routine_name = routine.name if routine else "Rutina Eliminada"
        
        last_workout_data = {
            "date": last_workout.date.isoformat(),
            "routine_name": routine_name,
            "duration_minutes": last_workout.duration_minutes
        }

    return {
        "recent_workouts": recent_workouts_count,
        "monthly_volume_kg": total_volume,
        "last_workout": last_workout_data
    }
