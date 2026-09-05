from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List
from datetime import datetime, timezone

from app.database import get_db
from app.models.workout import WorkoutLog, WorkoutSet
from app.models.routine import Routine, RoutineExercise
from app.schemas.workout import WorkoutLogCreate, WorkoutLogResponse, WorkoutSetCreate, WorkoutSetResponse
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/workouts", tags=["workouts"])

@router.get("/history", response_model=List[WorkoutLogResponse])
def get_workout_history(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    logs = (
        db.query(WorkoutLog)
        .options(joinedload(WorkoutLog.sets).joinedload(WorkoutSet.exercise), joinedload(WorkoutLog.routine))
        .filter(WorkoutLog.user_id == current_user.id, WorkoutLog.status == "completed")
        .order_by(WorkoutLog.created_at.desc())
        .all()
    )
    return logs

@router.post("/start", response_model=WorkoutLogResponse)
def start_workout(log_in: WorkoutLogCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    new_log = WorkoutLog(
        user_id=current_user.id,
        routine_id=log_in.routine_id,
        notes=log_in.notes,
        status="in_progress"
    )
    db.add(new_log)
    db.commit()
    db.refresh(new_log)
    
    # Cargamos eager loading para asegurar que response_model esté contento
    db_log = db.query(WorkoutLog).options(joinedload(WorkoutLog.sets)).filter(WorkoutLog.id == new_log.id).first()
    
    # Opcionalmente, la información de la rutina se manda en otro endpoint o se extrae en frontend 
    # (El frontend ya debería tener el Routine object al seleccionarlo, pero si la UX lo exige,
    # el log se retorna aquí y el frontend consulta sus details).
    return db_log

@router.post("/{log_id}/sets", response_model=WorkoutSetResponse)
def add_workout_set(log_id: int, set_in: WorkoutSetCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Verificar log
    log = db.query(WorkoutLog).filter(WorkoutLog.id == log_id, WorkoutLog.user_id == current_user.id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Workout Log no encontrado")
    if log.status != "in_progress":
        raise HTTPException(status_code=400, detail="Este entrenamiento ya fue finalizado")
        
    # Validar límite estricto de series si el entrenamiento se basa en una rutina
    if log.routine_id:
        routine_ex = db.query(RoutineExercise).filter(
            RoutineExercise.routine_id == log.routine_id,
            RoutineExercise.exercise_id == set_in.exercise_id
        ).first()
        if routine_ex and routine_ex.sets:
            current_count = db.query(WorkoutSet).filter(
                WorkoutSet.workout_log_id == log_id,
                WorkoutSet.exercise_id == set_in.exercise_id
            ).count()
            if current_count >= routine_ex.sets:
                raise HTTPException(
                    status_code=400,
                    detail=f"Límite alcanzado: Tu rutina permite un máximo de {routine_ex.sets} series para este ejercicio."
                )

    # Calcular set number automático
    max_set = db.query(func.max(WorkoutSet.set_number)).filter(WorkoutSet.workout_log_id == log_id, WorkoutSet.exercise_id == set_in.exercise_id).scalar()
    next_set = (max_set or 0) + 1

    new_set = WorkoutSet(
        workout_log_id=log_id,
        exercise_id=set_in.exercise_id,
        set_number=next_set,
        reps_completed=set_in.reps_completed,
        weight_kg=set_in.weight_kg,
        rpe=set_in.rpe,
        notes=set_in.notes
    )
    db.add(new_set)
    db.commit()
    db.refresh(new_set)
    
    # Reload con el exercise_id para el response
    db_set = db.query(WorkoutSet).options(joinedload(WorkoutSet.exercise)).filter(WorkoutSet.id == new_set.id).first()
    return db_set

@router.delete("/sets/{set_id}")
def remove_workout_set(set_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_set = db.query(WorkoutSet).join(WorkoutLog).filter(WorkoutSet.id == set_id, WorkoutLog.user_id == current_user.id).first()
    if not db_set:
        raise HTTPException(status_code=404, detail="Set no encontrado")
        
    # Validar que no se borre de un entrenamiento cerrado
    log = db.query(WorkoutLog).filter(WorkoutLog.id == db_set.workout_log_id).first()
    if log.status != "in_progress":
        raise HTTPException(status_code=400, detail="No se pueden editar sets de un entrenamiento finalizado")
        
    db.delete(db_set)
    db.commit()
    return {"detail": "Set eliminado"}

@router.put("/{log_id}/finish", response_model=WorkoutLogResponse)
def finish_workout(log_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    log = db.query(WorkoutLog).filter(WorkoutLog.id == log_id, WorkoutLog.user_id == current_user.id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Workout Log no encontrado")
        
    if log.status == "completed":
        return log
        
    # Calcular duración
    now = datetime.now(timezone.utc)
    # Si la base de datos devuelve un datetime sin timezone (ej. SQLite en pruebas), hacemos que 'now' también lo sea.
    if log.created_at.tzinfo is None:
        now = now.replace(tzinfo=None)
        
    delta = now - log.created_at
    duration_mins = int(delta.total_seconds() / 60)
    
    log.status = "completed"
    log.duration_minutes = duration_mins
    db.commit()
    db.refresh(log)
    
    return log
