from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.user import User
from app.schemas.user import UserResponse, UserUpdate
from app.models.feedback import Feedback
from app.schemas.feedback import FeedbackResponse
from app.api.deps import get_current_admin_user

router = APIRouter(prefix="/api/admin", tags=["admin"])

@router.get("/stats")
def get_admin_stats(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    total_users = db.query(User).count()
    return {
        "status": "success",
        "total_users": total_users,
        "message": f"Bienvenido al panel de control, {current_admin.username}"
    }

@router.get("/users", response_model=List[UserResponse])
def get_all_users(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    return db.query(User).order_by(User.created_at.desc()).all()

@router.put("/users/{user_id}", response_model=UserResponse)
def update_user_by_admin(
    user_id: int,
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if user_update.username is not None and user_update.username.strip():
        new_username = user_update.username.strip().lower()
        existing = db.query(User).filter(
            func.lower(User.username) == new_username, 
            User.id != user_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="El nombre de usuario ya está en uso")
        target_user.username = new_username

    if user_update.email is not None and str(user_update.email).strip():
        new_email = str(user_update.email).strip().lower()
        existing_email = db.query(User).filter(
            func.lower(User.email) == new_email, 
            User.id != user_id
        ).first()
        if existing_email:
            raise HTTPException(status_code=400, detail="El email ya está en uso")
        target_user.email = new_email

    if user_update.is_admin is not None:
        target_user.is_admin = user_update.is_admin
    if user_update.height_cm is not None:
        target_user.height_cm = user_update.height_cm
    if user_update.weight_kg is not None:
        target_user.weight_kg = user_update.weight_kg
    if user_update.target_weight_kg is not None:
        target_user.target_weight_kg = user_update.target_weight_kg

    db.commit()
    db.refresh(target_user)
    return target_user

@router.delete("/users/{user_id}")
def delete_user_by_admin(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    if user_id == current_admin.id:
        raise HTTPException(status_code=400, detail="No puedes eliminar tu propia cuenta de administrador")

    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    db.delete(target_user)
    db.commit()
    return {"status": "success", "detail": "Usuario eliminado correctamente"}

@router.get("/feedback", response_model=List[FeedbackResponse])
def get_all_feedback(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    feedbacks = db.query(Feedback).order_by(Feedback.created_at.desc()).all()
    for fb in feedbacks:
        fb.username = fb.user.username if fb.user else "Desconocido"
        fb.email = fb.user.email if fb.user else ""
    return feedbacks