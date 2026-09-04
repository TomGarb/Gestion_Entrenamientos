"""
Modelo ScheduledWorkout — Programación y citas colaborativas de entrenamientos.
"""

from datetime import date, datetime, timezone
from sqlalchemy import Column, Integer, String, Text, Date, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class ScheduledWorkout(Base):
    """Registro de entrenamiento programado o invitación a entrenar en el calendario."""

    __tablename__ = "scheduled_workouts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer, ForeignKey("users.id"), nullable=False, index=True
    )
    routine_id = Column(
        Integer, ForeignKey("routines.id"), nullable=True, index=True
    )
    title = Column(String(120), nullable=True)
    scheduled_date = Column(
        Date, nullable=False, default=lambda: date.today(), index=True
    )
    # Estados: "scheduled" (confirmado/propio), "pending" (invitación recibida), "accepted", "rejected", "completed", "cancelled"
    status = Column(String(20), default="scheduled", nullable=False)
    invited_by_id = Column(
        Integer, ForeignKey("users.id"), nullable=True, index=True
    )
    notes = Column(Text, default="", nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # --- Relaciones -----------------------------------------------------------
    user = relationship("User", back_populates="scheduled_workouts", foreign_keys=[user_id])
    invited_by = relationship(
        "User", foreign_keys=[invited_by_id]
    )
    routine = relationship("Routine", foreign_keys=[routine_id])

    def __repr__(self) -> str:
        return (
            f"<ScheduledWorkout id={self.id} user={self.user_id} "
            f"date={self.scheduled_date} status={self.status}>"
        )
