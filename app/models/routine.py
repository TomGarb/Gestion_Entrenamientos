"""
Modelos Routine y RoutineExercise — Plantillas de rutinas (Pure SQLAlchemy).
"""

from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class Routine(Base):
    """Plantilla de rutina de entrenamiento."""

    __tablename__ = "routines"

    id = Column(Integer, primary_key=True)
    name = Column(String(120), nullable=False)
    description = Column(Text, default="", nullable=False)
    user_id = Column(
        Integer, ForeignKey("users.id"), nullable=False
    )
    is_public = Column(Boolean, default=False, nullable=False)
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
    author = relationship(
        "User",
        back_populates="routines",
    )
    routine_exercises = relationship(
        "RoutineExercise",
        back_populates="routine",
        cascade="all, delete-orphan",
        order_by="RoutineExercise.order_index",
    )
    workout_logs = relationship(
        "WorkoutLog",
        back_populates="routine",
    )

    def __repr__(self) -> str:
        return f"<Routine {self.name}>"


class RoutineExercise(Base):
    """Ejercicio dentro de una rutina (tabla asociativa N:M)."""

    __tablename__ = "routine_exercises"

    id = Column(Integer, primary_key=True)
    routine_id = Column(
        Integer, ForeignKey("routines.id"), nullable=False
    )
    exercise_id = Column(
        Integer, ForeignKey("exercises.id"), nullable=False
    )
    sets = Column(Integer, nullable=False, default=3)
    reps = Column(Integer, nullable=False, default=10)
    rest_seconds = Column(Integer, nullable=False, default=60)
    order_index = Column(Integer, nullable=False, default=0)

    # --- Relaciones -----------------------------------------------------------
    routine = relationship("Routine", back_populates="routine_exercises")
    exercise = relationship("Exercise", back_populates="routine_exercises")

    def __repr__(self) -> str:
        return (
            f"<RoutineExercise routine={self.routine_id} "
            f"exercise={self.exercise_id}>"
        )
