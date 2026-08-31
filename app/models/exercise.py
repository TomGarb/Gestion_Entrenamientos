"""
Modelo Exercise — Catálogo de ejercicios.

Incluye ejercicios predefinidos del sistema (is_custom=False, user_id=NULL)
y ejercicios personalizados creados por cada usuario (is_custom=True).
"""

from datetime import datetime, timezone

from app import db

# Valores permitidos para el grupo muscular.
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


class Exercise(db.Model):
    """Representa un ejercicio del catálogo (predefinido o personalizado)."""

    __tablename__ = "exercises"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    muscle_group = db.Column(db.String(50), nullable=False)
    equipment = db.Column(db.String(100), default="", nullable=False)
    description = db.Column(db.Text, default="", nullable=False)
    is_custom = db.Column(db.Boolean, default=False, nullable=False)
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=True
    )
    created_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # --- Relaciones -----------------------------------------------------------
    routine_exercises = db.relationship(
        "RoutineExercise",
        backref="exercise",
        lazy="dynamic",
        cascade="all, delete-orphan",
    )
    workout_sets = db.relationship(
        "WorkoutSet",
        backref="exercise",
        lazy="dynamic",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Exercise {self.name}>"
