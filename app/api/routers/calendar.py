"""
Router para Calendario y Entrenamientos Planificados.
Cruza datos de WorkoutLog (historial) y ScheduledWorkout (futuros),
con control de privacidad por usuario y acceso de amigos.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, extract
from typing import Optional
from datetime import date

from app.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.workout import WorkoutLog
from app.models.routine import Routine
from app.models.friendship import Friendship
from app.models.scheduled_workout import ScheduledWorkout
from app.schemas.calendar import (
    ScheduledWorkoutCreate,
    ScheduledWorkoutUpdate,
    ScheduledWorkoutResponse,
    CalendarResponse,
    CalendarDayEvent
)

router = APIRouter(prefix="/api/calendar", tags=["calendar"])


def _build_calendar_events(user: User, db: Session, year: Optional[int] = None, month: Optional[int] = None):
    # 1. Consultar WorkoutLogs completados
    log_query = db.query(WorkoutLog).filter(
        WorkoutLog.user_id == user.id,
        WorkoutLog.status == "completed"
    )
    if year:
        log_query = log_query.filter(extract("year", WorkoutLog.date) == year)
    if month:
        log_query = log_query.filter(extract("month", WorkoutLog.date) == month)

    logs = log_query.order_by(WorkoutLog.date.asc()).all()

    # 2. Consultar ScheduledWorkouts
    sched_query = db.query(ScheduledWorkout).filter(
        ScheduledWorkout.user_id == user.id
    )
    if year:
        sched_query = sched_query.filter(extract("year", ScheduledWorkout.scheduled_date) == year)
    if month:
        sched_query = sched_query.filter(extract("month", ScheduledWorkout.scheduled_date) == month)

    scheduled = sched_query.order_by(ScheduledWorkout.scheduled_date.asc()).all()

    events = []

    # Mapear WorkoutLogs (tipo "completed")
    for log in logs:
        routine_name = log.routine.name if log.routine else (log.notes or "Entrenamiento")
        sets_count = len(log.sets) if log.sets else 0
        total_vol = sum(s.weight_kg * s.reps_completed for s in log.sets) if log.sets else 0.0
        
        # Ejercicios únicos
        ex_names = []
        if log.sets:
            for s in log.sets:
                if s.exercise and s.exercise.name not in ex_names:
                    ex_names.append(s.exercise.name)

        events.append(CalendarDayEvent(
            type="completed",
            id=log.id,
            date=log.date.strftime("%Y-%m-%d") if log.date else "",
            title=routine_name,
            routine_id=log.routine_id,
            routine_name=routine_name,
            duration_minutes=log.duration_minutes,
            sets_count=sets_count,
            total_volume_kg=round(total_vol, 1),
            notes=log.notes,
            exercises=ex_names
        ))

    # Mapear ScheduledWorkouts (tipo "scheduled")
    for s in scheduled:
        title = s.title or (s.routine.name if s.routine else "Entrenamiento Planificado")
        events.append(CalendarDayEvent(
            type="scheduled",
            id=s.id,
            date=s.scheduled_date.strftime("%Y-%m-%d") if s.scheduled_date else "",
            title=title,
            routine_id=s.routine_id,
            routine_name=s.routine.name if s.routine else None,
            notes=s.notes
        ))

    return CalendarResponse(
        user_id=user.id,
        username=user.username,
        share_calendar_with_friends=user.share_calendar_with_friends,
        events=events,
        total_completed=len(logs),
        total_scheduled=len(scheduled)
    )


@router.get("/me", response_model=CalendarResponse)
def get_my_calendar(
    year: Optional[int] = Query(None, ge=2020, le=2100),
    month: Optional[int] = Query(None, ge=1, le=12),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retorna los eventos del calendario (historial completado + planificaciones) del usuario autenticado."""
    return _build_calendar_events(current_user, db, year, month)


@router.get("/friends/{friend_id}", response_model=CalendarResponse)
def get_friend_calendar(
    friend_id: int,
    year: Optional[int] = Query(None, ge=2020, le=2100),
    month: Optional[int] = Query(None, ge=1, le=12),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retorna el calendario de un amigo.
    Reglas:
    1. Debe existir una amistad con status='accepted'.
    2. El amigo debe tener 'share_calendar_with_friends' habilitado (True).
    """
    if friend_id == current_user.id:
        return _build_calendar_events(current_user, db, year, month)

    target_user = db.query(User).filter(User.id == friend_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    # 1. Verificar amistad aceptada
    friendship = db.query(Friendship).filter(
        Friendship.status == "accepted",
        or_(
            and_(Friendship.user_id == current_user.id, Friendship.friend_id == friend_id),
            and_(Friendship.user_id == friend_id, Friendship.friend_id == current_user.id)
        )
    ).first()

    if not friendship:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo puedes ver el calendario de usuarios que están en tu lista de amigos."
        )

    # 2. Verificar flag de privacidad
    if not target_user.share_calendar_with_friends:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"@{target_user.username} tiene su calendario configurado como privado."
        )

    return _build_calendar_events(target_user, db, year, month)


@router.post("/schedule", response_model=ScheduledWorkoutResponse, status_code=status.HTTP_201_CREATED)
def create_scheduled_workout(
    payload: ScheduledWorkoutCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Planifica un nuevo entrenamiento para una fecha."""
    if payload.routine_id:
        routine = db.query(Routine).filter(Routine.id == payload.routine_id).first()
        if not routine:
            raise HTTPException(status_code=404, detail="Rutina no encontrada.")

    new_schedule = ScheduledWorkout(
        user_id=current_user.id,
        routine_id=payload.routine_id,
        title=payload.title.strip() if payload.title else None,
        scheduled_date=payload.scheduled_date,
        notes=payload.notes.strip() if payload.notes else ""
    )
    db.add(new_schedule)
    db.commit()
    db.refresh(new_schedule)

    return ScheduledWorkoutResponse(
        id=new_schedule.id,
        user_id=new_schedule.user_id,
        routine_id=new_schedule.routine_id,
        routine_name=new_schedule.routine.name if new_schedule.routine else None,
        title=new_schedule.title,
        scheduled_date=new_schedule.scheduled_date,
        notes=new_schedule.notes,
        created_at=new_schedule.created_at
    )


@router.put("/schedule/{schedule_id}", response_model=ScheduledWorkoutResponse)
def update_scheduled_workout(
    schedule_id: int,
    payload: ScheduledWorkoutUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Edita un entrenamiento planificado existente."""
    schedule = db.query(ScheduledWorkout).filter(
        ScheduledWorkout.id == schedule_id,
        ScheduledWorkout.user_id == current_user.id
    ).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Entrenamiento planificado no encontrado.")

    if payload.routine_id is not None:
        if payload.routine_id == 0:
            schedule.routine_id = None
        else:
            routine = db.query(Routine).filter(Routine.id == payload.routine_id).first()
            if not routine:
                raise HTTPException(status_code=404, detail="Rutina no encontrada.")
            schedule.routine_id = payload.routine_id

    if payload.title is not None:
        schedule.title = payload.title.strip() if payload.title else None
    if payload.scheduled_date is not None:
        schedule.scheduled_date = payload.scheduled_date
    if payload.notes is not None:
        schedule.notes = payload.notes.strip()

    db.commit()
    db.refresh(schedule)

    return ScheduledWorkoutResponse(
        id=schedule.id,
        user_id=schedule.user_id,
        routine_id=schedule.routine_id,
        routine_name=schedule.routine.name if schedule.routine else None,
        title=schedule.title,
        scheduled_date=schedule.scheduled_date,
        notes=schedule.notes,
        created_at=schedule.created_at
    )


@router.delete("/schedule/{schedule_id}")
def delete_scheduled_workout(
    schedule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Elimina un entrenamiento planificado."""
    schedule = db.query(ScheduledWorkout).filter(
        ScheduledWorkout.id == schedule_id,
        ScheduledWorkout.user_id == current_user.id
    ).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Entrenamiento planificado no encontrado.")

    db.delete(schedule)
    db.commit()
    return {"status": "success", "detail": "Entrenamiento planificado eliminado."}
