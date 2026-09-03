from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.user import User
from app.schemas.user import UserResponse
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

@router.get("/feedback", response_model=List[FeedbackResponse])
def get_all_feedback(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    feedbacks = db.query(Feedback).order_by(Feedback.created_at.desc()).all()
    # Pydantic will read from_attributes, but let's populate username/email explicitly for the response
    for fb in feedbacks:
        fb.username = fb.user.username if fb.user else "Desconocido"
        fb.email = fb.user.email if fb.user else ""
    return feedbacks