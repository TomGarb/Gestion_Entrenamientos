from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date
from datetime import datetime, timedelta

from app.database import get_db
from app.models.user import User
from app.models.workout import WorkoutLog, WorkoutSet
from app.models.routine import RoutineExercise
from app.models.exercise import Exercise
from app.api.deps import get_current_user

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

@router.get("/volume-by-muscle")
def get_volume_by_muscle(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Calcula el tonelaje total (reps * peso) agrupado por grupo muscular.
    """
    results = (
        db.query(
            Exercise.muscle_group,
            func.sum(WorkoutSet.reps_completed * WorkoutSet.weight_kg).label("total_volume")
        )
        .select_from(WorkoutSet)
        .join(WorkoutLog, WorkoutLog.id == WorkoutSet.workout_log_id)
        .join(Exercise, Exercise.id == WorkoutSet.exercise_id)
        .filter(
            WorkoutLog.user_id == current_user.id,
            WorkoutLog.status == 'completed'
        )
        .group_by(Exercise.muscle_group)
        .all()
    )
    
    return [{"name": r[0] if r[0] else "Otros", "value": float(r[1] or 0)} for r in results if r[1] and float(r[1]) > 0]

@router.get("/progression/{exercise_id}")
def get_exercise_progression(
    exercise_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Obtiene el peso mximo levantado para un ejercicio especfico, agrupado por fecha.
    """
    results = (
        db.query(
            cast(WorkoutLog.date, Date).label("workout_date"),
            func.max(WorkoutSet.weight_kg).label("max_weight")
        )
        .select_from(WorkoutSet)
        .join(WorkoutLog, WorkoutLog.id == WorkoutSet.workout_log_id)
        .filter(
            WorkoutLog.user_id == current_user.id,
            WorkoutLog.status == 'completed',
            WorkoutSet.exercise_id == exercise_id,
            WorkoutSet.weight_kg > 0
        )
        .group_by(cast(WorkoutLog.date, Date))
        .order_by(cast(WorkoutLog.date, Date))
        .all()
    )
    
    # Formatear para LineChart: { date: '2023-10-01', weight: 80 }
    return [{"date": str(r[0]), "weight": float(r[1])} for r in results]

@router.get("/activity-heatmap")
def get_activity_heatmap(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Devuelve las fechas en las que el usuario entren.
    """
    # Solo necesitamos los ltimos 4 meses aprox para que encaje en el mvil (120 das)
    date_limit = datetime.now() - timedelta(days=120)
    
    results = (
        db.query(
            cast(WorkoutLog.date, Date).label("workout_date"),
            func.count(WorkoutLog.id).label("count")
        )
        .filter(
            WorkoutLog.user_id == current_user.id,
            WorkoutLog.status == 'completed',
            WorkoutLog.date >= date_limit
        )
        .group_by(cast(WorkoutLog.date, Date))
        .all()
    )
    
    return [{"date": str(r[0]), "count": r[1]} for r in results]
