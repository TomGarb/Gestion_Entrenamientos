from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_
from typing import List, Optional
from datetime import date, datetime, timezone

from app.database import get_db
from app.models.scheduled_workout import ScheduledWorkout
from app.models.routine import Routine, RoutineExercise
from app.models.user import User
from app.models.friendship import Friendship
from app.models.notification import Notification
from app.schemas.scheduled_workout import (
    ScheduledWorkoutCreate,
    ScheduledWorkoutUpdate,
    WorkoutInviteRequest,
    ScheduledWorkoutResponse
)
from app.api.deps import get_current_user
from app.services.notification_service import (
    notify_workout_invitation,
    notify_workout_accepted,
    notify_workout_rejected
)

router = APIRouter(prefix="/api/scheduled-workouts", tags=["scheduled-workouts"])


@router.get("", response_model=List[ScheduledWorkoutResponse])
@router.get("/", response_model=List[ScheduledWorkoutResponse])
def get_scheduled_workouts(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obtiene los entrenamientos agendados del usuario actual con filtros opcionales."""
    query = db.query(ScheduledWorkout).filter(
        ScheduledWorkout.user_id == current_user.id
    ).options(
        joinedload(ScheduledWorkout.routine)
        .joinedload(Routine.routine_exercises)
        .joinedload(RoutineExercise.exercise),
        joinedload(ScheduledWorkout.invited_by),
        joinedload(ScheduledWorkout.user)
    )

    if start_date:
        query = query.filter(ScheduledWorkout.scheduled_date >= start_date)
    if end_date:
        query = query.filter(ScheduledWorkout.scheduled_date <= end_date)
    if status_filter:
        query = query.filter(ScheduledWorkout.status == status_filter)

    workouts = query.order_by(ScheduledWorkout.scheduled_date.asc(), ScheduledWorkout.created_at.desc()).all()
    return workouts


@router.post("", response_model=ScheduledWorkoutResponse)
@router.post("/", response_model=ScheduledWorkoutResponse)
def create_scheduled_workout(
    payload: ScheduledWorkoutCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Crea una sesión de entrenamiento agendada en el calendario."""
    if payload.routine_id:
        routine = db.query(Routine).filter(Routine.id == payload.routine_id).first()
        if not routine:
            raise HTTPException(status_code=404, detail="Rutina no encontrada.")

    new_schedule = ScheduledWorkout(
        user_id=current_user.id,
        routine_id=payload.routine_id,
        scheduled_date=payload.scheduled_date,
        status="scheduled",
        notes=payload.notes or "",
        invited_by_id=None
    )
    db.add(new_schedule)
    db.commit()
    db.refresh(new_schedule)

    # Si se especificó un amigo a invitar
    if payload.invite_friend_id and payload.invite_friend_id != current_user.id:
        friend = db.query(User).filter(User.id == payload.invite_friend_id).first()
        if friend and payload.routine_id:
            friend_schedule = ScheduledWorkout(
                user_id=friend.id,
                routine_id=payload.routine_id,
                scheduled_date=payload.scheduled_date,
                status="pending",
                notes=payload.notes or "",
                invited_by_id=current_user.id
            )
            db.add(friend_schedule)
            db.commit()
            db.refresh(friend_schedule)

            routine_name = routine.name if payload.routine_id and routine else "Entrenamiento"
            notify_workout_invitation(
                db=db,
                inviter_id=current_user.id,
                invitee_id=friend.id,
                scheduled_workout_id=friend_schedule.id,
                routine_name=routine_name,
                scheduled_date=payload.scheduled_date
            )

    # Recargar con relaciones
    loaded = db.query(ScheduledWorkout).options(
        joinedload(ScheduledWorkout.routine)
        .joinedload(Routine.routine_exercises)
        .joinedload(RoutineExercise.exercise),
        joinedload(ScheduledWorkout.invited_by),
        joinedload(ScheduledWorkout.user)
    ).filter(ScheduledWorkout.id == new_schedule.id).first()

    return loaded


@router.post("/invite", response_model=ScheduledWorkoutResponse)
def invite_friend_to_workout(
    payload: WorkoutInviteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Invita a un amigo a entrenar una rutina específica en una fecha determinada."""
    if payload.friend_id == current_user.id:
        raise HTTPException(status_code=400, detail="No puedes auto-invitarte.")

    friend = db.query(User).filter(User.id == payload.friend_id).first()
    if not friend:
        raise HTTPException(status_code=404, detail="Amigo no encontrado.")

    routine = db.query(Routine).filter(Routine.id == payload.routine_id).first()
    if not routine:
        raise HTTPException(status_code=404, detail="Rutina no encontrada.")

    # 1. Agendar en el calendario del anfitrión si se requiere
    if payload.schedule_for_me:
        existing_host = db.query(ScheduledWorkout).filter(
            ScheduledWorkout.user_id == current_user.id,
            ScheduledWorkout.scheduled_date == payload.scheduled_date,
            ScheduledWorkout.routine_id == payload.routine_id
        ).first()

        if not existing_host:
            host_workout = ScheduledWorkout(
                user_id=current_user.id,
                routine_id=payload.routine_id,
                scheduled_date=payload.scheduled_date,
                status="scheduled",
                notes=payload.notes or "",
                invited_by_id=None
            )
            db.add(host_workout)
            db.commit()

    # 2. Crear la invitación pendiente para el amigo
    friend_schedule = ScheduledWorkout(
        user_id=friend.id,
        routine_id=payload.routine_id,
        scheduled_date=payload.scheduled_date,
        status="pending",
        notes=payload.notes or "",
        invited_by_id=current_user.id
    )
    db.add(friend_schedule)
    db.commit()
    db.refresh(friend_schedule)

    # 3. Disparar notificaciones WebSocket y Telegram
    notify_workout_invitation(
        db=db,
        inviter_id=current_user.id,
        invitee_id=friend.id,
        scheduled_workout_id=friend_schedule.id,
        routine_name=routine.name,
        scheduled_date=payload.scheduled_date
    )

    loaded = db.query(ScheduledWorkout).options(
        joinedload(ScheduledWorkout.routine)
        .joinedload(Routine.routine_exercises)
        .joinedload(RoutineExercise.exercise),
        joinedload(ScheduledWorkout.invited_by),
        joinedload(ScheduledWorkout.user)
    ).filter(ScheduledWorkout.id == friend_schedule.id).first()

    return loaded


@router.post("/{workout_id}/accept", response_model=ScheduledWorkoutResponse)
def accept_workout_invitation(
    workout_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Acepta una invitación a entrenar:
    1. Clona la rutina en la cuenta del usuario receptor para que quede guardada en sus rutinas.
    2. Vincula el ScheduledWorkout a la rutina clonada y actualiza su estado a 'scheduled'.
    3. Emite notificación de confirmación instantánea por WebSocket al usuario anfitrión.
    """
    scheduled_item = db.query(ScheduledWorkout).filter(
        ScheduledWorkout.id == workout_id,
        ScheduledWorkout.user_id == current_user.id
    ).first()

    if not scheduled_item:
        raise HTTPException(status_code=404, detail="Invitación de entrenamiento no encontrada.")

    if scheduled_item.status != "pending":
        # Si ya estaba aceptada, simplemente retornar
        if scheduled_item.status in ["scheduled", "accepted"]:
            loaded = db.query(ScheduledWorkout).options(
                joinedload(ScheduledWorkout.routine)
                .joinedload(Routine.routine_exercises)
                .joinedload(RoutineExercise.exercise),
                joinedload(ScheduledWorkout.invited_by),
                joinedload(ScheduledWorkout.user)
            ).filter(ScheduledWorkout.id == scheduled_item.id).first()
            return loaded
        raise HTTPException(status_code=400, detail="Esta invitación ya no está pendiente.")

    original_routine = None
    routine_name = "Entrenamiento"

    if scheduled_item.routine_id:
        original_routine = db.query(Routine).options(
            joinedload(Routine.routine_exercises)
        ).filter(Routine.id == scheduled_item.routine_id).first()

        if original_routine:
            routine_name = original_routine.name

    # Clonar la rutina si pertenecía a otro usuario
    if original_routine and original_routine.user_id != current_user.id:
        try:
            cloned_routine = Routine(
                name=f"{original_routine.name}",
                description=original_routine.description or "",
                is_public=False,
                user_id=current_user.id
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
            scheduled_item.routine_id = cloned_routine.id
        except Exception as e:
            db.rollback()
            print(f"Error clonando rutina al aceptar invitación: {e}")
            raise HTTPException(status_code=500, detail="Error al incorporar la rutina al calendario.")

    scheduled_item.status = "scheduled"
    scheduled_item.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(scheduled_item)

    # Marcar notificación in-app relacionada como leída
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.type == "workout_invitation",
        Notification.reference_id == scheduled_item.id
    ).update({"is_read": True})
    db.commit()

    # Notificar al anfitrión
    if scheduled_item.invited_by_id:
        notify_workout_accepted(
            db=db,
            accepter_id=current_user.id,
            inviter_id=scheduled_item.invited_by_id,
            scheduled_workout_id=scheduled_item.id,
            routine_name=routine_name,
            scheduled_date=scheduled_item.scheduled_date
        )

    loaded = db.query(ScheduledWorkout).options(
        joinedload(ScheduledWorkout.routine)
        .joinedload(Routine.routine_exercises)
        .joinedload(RoutineExercise.exercise),
        joinedload(ScheduledWorkout.invited_by),
        joinedload(ScheduledWorkout.user)
    ).filter(ScheduledWorkout.id == scheduled_item.id).first()

    return loaded


@router.post("/{workout_id}/reject")
def reject_workout_invitation(
    workout_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Rechaza una invitación a entrenar y notifica al usuario que la envió."""
    scheduled_item = db.query(ScheduledWorkout).filter(
        ScheduledWorkout.id == workout_id,
        ScheduledWorkout.user_id == current_user.id
    ).first()

    if not scheduled_item:
        raise HTTPException(status_code=404, detail="Invitación de entrenamiento no encontrada.")

    inviter_id = scheduled_item.invited_by_id
    scheduled_date = scheduled_item.scheduled_date
    routine_name = "Entrenamiento"

    if scheduled_item.routine_id:
        routine = db.query(Routine).filter(Routine.id == scheduled_item.routine_id).first()
        if routine:
            routine_name = routine.name

    # Eliminar o cambiar estado a rejected
    db.delete(scheduled_item)
    db.commit()

    # Marcar notificación in-app relacionada como leída
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.type == "workout_invitation",
        Notification.reference_id == workout_id
    ).update({"is_read": True})
    db.commit()

    if inviter_id:
        notify_workout_rejected(
            db=db,
            rejecter_id=current_user.id,
            inviter_id=inviter_id,
            routine_name=routine_name,
            scheduled_date=scheduled_date
        )

    return {"detail": "Invitación rechazada exitosamente."}


@router.put("/{workout_id}", response_model=ScheduledWorkoutResponse)
def update_scheduled_workout(
    workout_id: int,
    payload: ScheduledWorkoutUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Actualiza la fecha, notas o rutina de una sesión agendada."""
    scheduled_item = db.query(ScheduledWorkout).filter(
        ScheduledWorkout.id == workout_id,
        ScheduledWorkout.user_id == current_user.id
    ).first()

    if not scheduled_item:
        raise HTTPException(status_code=404, detail="Entrenamiento agendado no encontrado.")

    if payload.routine_id is not None:
        scheduled_item.routine_id = payload.routine_id
    if payload.scheduled_date is not None:
        scheduled_item.scheduled_date = payload.scheduled_date
    if payload.notes is not None:
        scheduled_item.notes = payload.notes
    if payload.status is not None:
        scheduled_item.status = payload.status

    scheduled_item.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(scheduled_item)

    loaded = db.query(ScheduledWorkout).options(
        joinedload(ScheduledWorkout.routine)
        .joinedload(Routine.routine_exercises)
        .joinedload(RoutineExercise.exercise),
        joinedload(ScheduledWorkout.invited_by),
        joinedload(ScheduledWorkout.user)
    ).filter(ScheduledWorkout.id == scheduled_item.id).first()

    return loaded


@router.delete("/{workout_id}")
def delete_scheduled_workout(
    workout_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Elimina o cancela una sesión agendada del calendario."""
    scheduled_item = db.query(ScheduledWorkout).filter(
        ScheduledWorkout.id == workout_id,
        ScheduledWorkout.user_id == current_user.id
    ).first()

    if not scheduled_item:
        raise HTTPException(status_code=404, detail="Entrenamiento agendado no encontrado.")

    db.delete(scheduled_item)
    db.commit()
    return {"detail": "Entrenamiento agendado eliminado exitosamente."}
