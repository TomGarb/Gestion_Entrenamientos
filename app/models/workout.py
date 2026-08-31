"""
Modelos WorkoutLog y WorkoutSet — Registro de entrenamientos (Pure SQLAlchemy).
"""

from datetime import date, datetime, timezone

from sqlalchemy import Column, Integer, String, Text, Float, Date, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class WorkoutLog(Base):
    """Registro de una sesión de entrenamiento."""

    __tablename__ = "workout_logs"

    id = Column(Integer, primary_key=True)
    user_id = Column(
        Integer, ForeignKey("users.id"), nullable=False
    )
    routine_id = Column(
        Integer, ForeignKey("routines.id"), nullable=True
    )
    date = Column(
        Date, nullable=False, default=lambda: date.today()
    )
    status = Column(String(20), default="in_progress", nullable=False)
    duration_minutes = Column(Integer, nullable=True)
    notes = Column(Text, default="", nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # --- Relaciones -----------------------------------------------------------
    user = relationship("User", back_populates="workout_logs")
    routine = relationship("Routine", back_populates="workout_logs")
    
    sets = relationship(
        "WorkoutSet",
        back_populates="workout_log",
        cascade="all, delete-orphan",
        order_by="WorkoutSet.set_number",
    )

    def __repr__(self) -> str:
        return f"<WorkoutLog {self.date} user={self.user_id}>"


class WorkoutSet(Base):
    """Serie individual realizada dentro de un entrenamiento."""

    __tablename__ = "workout_sets"

    id = Column(Integer, primary_key=True)
    workout_log_id = Column(
        Integer, ForeignKey("workout_logs.id"), nullable=False
    )
    exercise_id = Column(
        Integer, ForeignKey("exercises.id"), nullable=False
    )
    set_number = Column(Integer, nullable=False)
    reps_completed = Column(Integer, nullable=False)
    weight_kg = Column(Float, nullable=False, default=0.0)
    rpe = Column(Integer, nullable=True)
    notes = Column(String(200), default="", nullable=False)

    # --- Relaciones -----------------------------------------------------------
    workout_log = relationship("WorkoutLog", back_populates="sets")
    exercise = relationship("Exercise", back_populates="workout_sets")

    def __repr__(self) -> str:
        return (
            f"<WorkoutSet log={self.workout_log_id} "
            f"ex={self.exercise_id} #{self.set_number}>"
        )
