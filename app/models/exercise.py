"""
Modelo Exercise — Catálogo de ejercicios (Pure SQLAlchemy).
"""

from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base

MUSCLE_GROUPS: list[str] = [
    "pecho",
    "espalda",
    "piernas",
    "hombros",
    "brazos",
    "core",
    "cardio",
    "otro",
]


class Exercise(Base):
    """Representa un ejercicio del catálogo (predefinido o personalizado)."""

    __tablename__ = "exercises"

    id = Column(Integer, primary_key=True)
    name = Column(String(120), nullable=False)
    muscle_group = Column(String(50), nullable=False)
    equipment = Column(String(100), default="", nullable=False)
    description = Column(Text, default="", nullable=False)
    is_custom = Column(Boolean, default=False, nullable=False)
    user_id = Column(
        Integer, ForeignKey("users.id"), nullable=True
    )
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # --- Relaciones -----------------------------------------------------------
    creator = relationship(
        "User",
        back_populates="custom_exercises",
    )
    routine_exercises = relationship(
        "RoutineExercise",
        back_populates="exercise",
        cascade="all, delete-orphan",
    )
    workout_sets = relationship(
        "WorkoutSet",
        back_populates="exercise",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Exercise {self.name}>"
