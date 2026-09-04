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
    Devuelve las fechas en las que el usuario entrenó junto con número de series, tonelaje total y nivel de intensidad (1, 2 o 3).
    """
    # Últimos 120 días
    date_limit = datetime.now() - timedelta(days=120)
    
    results = (
        db.query(
            WorkoutLog.date.label("workout_date"),
            func.count(func.distinct(WorkoutLog.id)).label("count"),
            func.count(WorkoutSet.id).label("total_sets"),
            func.coalesce(func.sum(WorkoutSet.reps_completed * WorkoutSet.weight_kg), 0).label("total_volume")
        )
        .outerjoin(WorkoutSet, WorkoutSet.workout_log_id == WorkoutLog.id)
        .filter(
            WorkoutLog.user_id == current_user.id,
            WorkoutLog.status == 'completed',
            WorkoutLog.date >= date_limit
        )
        .group_by(WorkoutLog.date)
        .all()
    )
    
    heatmap = []
    for r in results:
        count = int(r.count or 0)
        total_sets = int(r.total_sets or 0)
        total_volume = float(r.total_volume or 0)
        
        # Determinar nivel de intensidad:
        # Nivel 3: Alto volumen (>16 series o >=8000kg o 2+ entrenamientos)
        # Nivel 2: Rutina estándar (9-16 series o 3000-8000kg)
        # Nivel 1: Sesión ligera (1-8 series o <3000kg)
        if total_sets > 16 or total_volume >= 8000 or count >= 2:
            level = 3
        elif total_sets >= 9 or total_volume >= 3000:
            level = 2
        else:
            level = 1

        heatmap.append({
            "date": str(r.workout_date),
            "count": count,
            "total_sets": total_sets,
            "total_volume": round(total_volume, 1),
            "level": level
        })

    return heatmap
