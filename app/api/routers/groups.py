from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func
from typing import List, Optional

from app.database import get_db
from app.models.user import User
from app.models.group import WorkoutGroup, GroupMember
from app.models.friendship import Friendship
from app.models.workout import WorkoutLog, WorkoutSet
from app.models.routine import Routine
from app.api.deps import get_current_user
from app.services.notification_service import create_in_app_notification
from app.schemas.group import (
    GroupCreate,
    GroupUpdate,
    AddMemberRequest,
    UpdateMemberRoleRequest,
    GroupResponse,
    GroupDetailResponse,
    GroupMemberResponse,
    GroupMemberUser,
    GroupFeedResponse,
    FeedItemResponse,
    ExerciseSummary,
    WorkoutSetSummary,
)

router = APIRouter(prefix="/api/groups", tags=["groups"])


def _check_group_membership(group_id: int, user_id: int, db: Session) -> GroupMember:
    """Valida que el usuario pertenezca al grupo."""
    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == user_id
    ).first()
    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes acceso a este grupo o no eres miembro."
        )
    return member


def _check_group_admin(group_id: int, user_id: int, db: Session) -> GroupMember:
    """Valida que el usuario sea administrador del grupo."""
    member = _check_group_membership(group_id, user_id, db)
    if member.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permisos insuficientes: Debes ser administrador del grupo para realizar esta acción."
        )
    return member


@router.post("", response_model=GroupResponse, status_code=status.HTTP_201_CREATED)
def create_group(
    group_data: GroupCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Crea un nuevo grupo de entrenamiento y asigna al creador como Administrador."""
    group = WorkoutGroup(
        name=group_data.name.strip(),
        description=group_data.description.strip() if group_data.description else None,
        creator_id=current_user.id
    )
    db.add(group)
    db.commit()
    db.refresh(group)

    # Añadir al creador como miembro admin
    creator_membership = GroupMember(
        group_id=group.id,
        user_id=current_user.id,
        role="admin"
    )
    db.add(creator_membership)
    db.commit()

    return GroupResponse(
        id=group.id,
        name=group.name,
        description=group.description,
        creator_id=group.creator_id,
        creator_username=current_user.username,
        members_count=1,
        is_admin=True,
        user_role="admin",
        created_at=group.created_at
    )


@router.get("", response_model=List[GroupResponse])
def get_user_groups(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obtiene todos los grupos a los que pertenece el usuario autenticado."""
    memberships = db.query(GroupMember).filter(
        GroupMember.user_id == current_user.id
    ).all()

    results = []
    for m in memberships:
        g = m.group
        if not g:
            continue
        count = db.query(GroupMember).filter(GroupMember.group_id == g.id).count()
        creator = g.creator
        results.append(GroupResponse(
            id=g.id,
            name=g.name,
            description=g.description,
            creator_id=g.creator_id,
            creator_username=creator.username if creator else "Desconocido",
            members_count=count,
            is_admin=(m.role == "admin"),
            user_role=m.role,
            created_at=g.created_at
        ))

    return results


@router.get("/{group_id}", response_model=GroupDetailResponse)
def get_group_details(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obtiene el detalle del grupo y la lista de todos sus miembros."""
    current_member = _check_group_membership(group_id, current_user.id, db)
    group = db.query(WorkoutGroup).filter(WorkoutGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Grupo no encontrado.")

    members_raw = db.query(GroupMember).filter(
        GroupMember.group_id == group_id
    ).order_by(GroupMember.joined_at.asc()).all()

    members = []
    for m in members_raw:
        if m.user:
            members.append(GroupMemberResponse(
                id=m.id,
                user_id=m.user_id,
                role=m.role,
                joined_at=m.joined_at,
                user=GroupMemberUser(
                    id=m.user.id,
                    username=m.user.username,
                    email=m.user.email
                )
            ))

    creator = group.creator

    return GroupDetailResponse(
        id=group.id,
        name=group.name,
        description=group.description,
        creator_id=group.creator_id,
        creator_username=creator.username if creator else "Desconocido",
        is_admin=(current_member.role == "admin"),
        user_role=current_member.role,
        created_at=group.created_at,
        members=members
    )


@router.put("/{group_id}", response_model=GroupResponse)
def update_group(
    group_id: int,
    group_data: GroupUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Permite a un administrador del grupo editar su nombre o descripción."""
    current_member = _check_group_admin(group_id, current_user.id, db)
    group = db.query(WorkoutGroup).filter(WorkoutGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Grupo no encontrado.")

    if group_data.name is not None:
        group.name = group_data.name.strip()
    if group_data.description is not None:
        group.description = group_data.description.strip()

    db.commit()
    db.refresh(group)

    count = db.query(GroupMember).filter(GroupMember.group_id == group.id).count()
    return GroupResponse(
        id=group.id,
        name=group.name,
        description=group.description,
        creator_id=group.creator_id,
        creator_username=group.creator.username if group.creator else "Desconocido",
        members_count=count,
        is_admin=True,
        user_role=current_member.role,
        created_at=group.created_at
    )


@router.delete("/{group_id}")
def delete_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Permite a un administrador eliminar el grupo."""
    _check_group_admin(group_id, current_user.id, db)
    group = db.query(WorkoutGroup).filter(WorkoutGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Grupo no encontrado.")

    db.delete(group)
    db.commit()
    return {"status": "success", "detail": "Grupo eliminado correctamente."}


@router.post("/{group_id}/members")
def add_group_member(
    group_id: int,
    payload: AddMemberRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Añade un nuevo integrante al grupo.
    Condición: Quien añade debe ser ADMIN del grupo y el usuario a sumar debe ser AMIGO DIRECTO.
    """
    _check_group_admin(group_id, current_user.id, db)
    group = db.query(WorkoutGroup).filter(WorkoutGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Grupo no encontrado.")

    target_user = db.query(User).filter(User.id == payload.user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    # 1. Verificar si ya es miembro
    existing_member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == payload.user_id
    ).first()
    if existing_member:
        raise HTTPException(status_code=400, detail="El usuario ya es miembro de este grupo.")

    # 2. Verificar que sea amigo aceptado del admin que lo añade
    friendship = db.query(Friendship).filter(
        Friendship.status == "accepted",
        or_(
            and_(Friendship.user_id == current_user.id, Friendship.friend_id == payload.user_id),
            and_(Friendship.user_id == payload.user_id, Friendship.friend_id == current_user.id)
        )
    ).first()

    if not friendship:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Solo puedes añadir a usuarios que estén en tu lista de amigos."
        )

    # 3. Registrar membresía
    new_member = GroupMember(
        group_id=group_id,
        user_id=payload.user_id,
        role="member"
    )
    db.add(new_member)
    db.commit()

    # 4. Notificación In-App + WebSocket
    create_in_app_notification(
        db=db,
        user_id=target_user.id,
        title=f"Te añadieron a {group.name}",
        message=f"@{current_user.username} te ha sumado al grupo de entrenamiento '{group.name}'.",
        notif_type="group_invite",
        reference_id=group.id
    )

    return {"status": "success", "detail": f"@{target_user.username} ha sido añadido al grupo."}


@router.delete("/{group_id}/members/{user_id}")
def remove_group_member(
    group_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Expulsa a un miembro (si quien ejecuta es admin) o permite al usuario salir voluntariamente del grupo.
    """
    group = db.query(WorkoutGroup).filter(WorkoutGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Grupo no encontrado.")

    member_to_remove = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == user_id
    ).first()
    if not member_to_remove:
        raise HTTPException(status_code=404, detail="El usuario no pertenece a este grupo.")

    if current_user.id == user_id:
        # Salida voluntaria
        db.delete(member_to_remove)
        db.commit()

        # Si no quedan miembros, eliminar el grupo
        remaining_count = db.query(GroupMember).filter(GroupMember.group_id == group_id).count()
        if remaining_count == 0:
            db.delete(group)
            db.commit()
        else:
            # Si no quedan admins, promover al miembro más antiguo
            admins_count = db.query(GroupMember).filter(
                GroupMember.group_id == group_id,
                GroupMember.role == "admin"
            ).count()
            if admins_count == 0:
                oldest = db.query(GroupMember).filter(
                    GroupMember.group_id == group_id
                ).order_by(GroupMember.joined_at.asc()).first()
                if oldest:
                    oldest.role = "admin"
                    db.commit()

        return {"status": "success", "detail": "Has salido del grupo correctamente."}
    else:
        # Expulsión por un admin
        _check_group_admin(group_id, current_user.id, db)
        db.delete(member_to_remove)
        db.commit()
        return {"status": "success", "detail": "Miembro eliminado del grupo."}


@router.put("/{group_id}/members/{user_id}/role")
def update_member_role(
    group_id: int,
    user_id: int,
    payload: UpdateMemberRoleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Permite a un administrador promover a otro miembro a admin o cambiar su rol."""
    _check_group_admin(group_id, current_user.id, db)

    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == user_id
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="El usuario no es miembro del grupo.")

    member.role = payload.role
    db.commit()

    return {"status": "success", "detail": f"Rol actualizado a {payload.role}."}


@router.get("/{group_id}/feed", response_model=GroupFeedResponse)
def get_group_feed(
    group_id: int,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    latest_per_member: bool = Query(False, description="Si es True, devuelve solo el último entrenamiento de cada integrante del grupo"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Obtiene el Muro / Feed de entrenamientos completados de todos los integrantes del grupo,
    ordenados cronológicamente descendente. Si latest_per_member=True, obtiene solo la última sesión de cada integrante.
    """
    _check_group_membership(group_id, current_user.id, db)
    group = db.query(WorkoutGroup).filter(WorkoutGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Grupo no encontrado.")

    # IDs de todos los miembros
    member_ids = [m.user_id for m in db.query(GroupMember.user_id).filter(GroupMember.group_id == group_id).all()]

    if not member_ids:
        return GroupFeedResponse(group_id=group.id, group_name=group.name, feed=[], total_logs=0)

    if latest_per_member:
        # Obtener la última sesión completada de cada integrante
        member_latest_logs = []
        for m_id in member_ids:
            latest = db.query(WorkoutLog).filter(
                WorkoutLog.user_id == m_id,
                WorkoutLog.status == "completed"
            ).order_by(WorkoutLog.created_at.desc()).first()
            if latest:
                member_latest_logs.append(latest)

        # Ordenar de más reciente a más antiguo
        member_latest_logs.sort(key=lambda l: l.created_at, reverse=True)
        total_logs = len(member_latest_logs)
        logs = member_latest_logs[offset:offset + limit]
    else:
        # Consultar WorkoutLogs completados en modo historial completo
        query = db.query(WorkoutLog).filter(
            WorkoutLog.user_id.in_(member_ids),
            WorkoutLog.status == "completed"
        ).order_by(WorkoutLog.created_at.desc())

        total_logs = query.count()
        logs = query.offset(offset).limit(limit).all()

    feed_items = []
    for log in logs:
        # Calcular resumen de series y volumen
        sets_raw = log.sets
        total_vol = 0.0
        exercises_map = {}
        sets_summary = []

        for s in sets_raw:
            vol = s.weight_kg * s.reps_completed
            total_vol += vol
            ex_name = s.exercise.name if s.exercise else "Ejercicio"
            
            sets_summary.append(WorkoutSetSummary(
                exercise_name=ex_name,
                set_number=s.set_number,
                reps_completed=s.reps_completed,
                weight_kg=s.weight_kg,
                rpe=s.rpe
            ))

            if ex_name not in exercises_map:
                exercises_map[ex_name] = {
                    "exercise_name": ex_name,
                    "sets_count": 0,
                    "max_weight_kg": 0.0,
                    "total_reps": 0
                }
            exercises_map[ex_name]["sets_count"] += 1
            exercises_map[ex_name]["total_reps"] += s.reps_completed
            if s.weight_kg > exercises_map[ex_name]["max_weight_kg"]:
                exercises_map[ex_name]["max_weight_kg"] = s.weight_kg

        ex_list = [ExerciseSummary(**item) for item in exercises_map.values()]

        feed_items.append(FeedItemResponse(
            id=log.id,
            user_id=log.user_id,
            username=log.user.username if log.user else "Atleta",
            user_email=log.user.email if log.user else "",
            routine_id=log.routine_id,
            routine_name=log.routine.name if log.routine else None,
            date=log.date.strftime("%d/%m/%Y") if log.date else "",
            duration_minutes=log.duration_minutes,
            notes=log.notes,
            created_at=log.created_at,
            sets_count=len(sets_raw),
            total_volume_kg=round(total_vol, 1),
            exercises=ex_list,
            sets=sets_summary
        ))

    return GroupFeedResponse(
        group_id=group.id,
        group_name=group.name,
        feed=feed_items,
        total_logs=total_logs
    )
