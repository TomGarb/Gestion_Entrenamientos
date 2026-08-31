"""
Modelos Routine y RoutineExercise — Plantillas de rutinas.

Routine: plantilla de entrenamiento creada por un usuario.
RoutineExercise: tabla asociativa N:M que define los ejercicios
que componen una rutina, con series, repeticiones, descanso y orden.
"""

from datetime import datetime, timezone

from app import db


class Routine(db.Model):
    """Plantilla de rutina de entrenamiento."""

    __tablename__ = "routines"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text, default="", nullable=False)
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=False
    )
    is_public = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # --- Relaciones -----------------------------------------------------------
    routine_exercises = db.relationship(
        "RoutineExercise",
        backref="routine",
        lazy="dynamic",
        cascade="all, delete-orphan",
        order_by="RoutineExercise.order_index",
    )
    workout_logs = db.relationship(
        "WorkoutLog",
        backref="routine",
        lazy="dynamic",
    )

    def __repr__(self) -> str:
        return f"<Routine {self.name}>"


class RoutineExercise(db.Model):
    """Ejercicio dentro de una rutina (tabla asociativa N:M)."""

    __tablename__ = "routine_exercises"

    id = db.Column(db.Integer, primary_key=True)
    routine_id = db.Column(
        db.Integer, db.ForeignKey("routines.id"), nullable=False
    )
    exercise_id = db.Column(
        db.Integer, db.ForeignKey("exercises.id"), nullable=False
    )
    sets = db.Column(db.Integer, nullable=False, default=3)
    reps = db.Column(db.Integer, nullable=False, default=10)
    rest_seconds = db.Column(db.Integer, nullable=False, default=60)
    order_index = db.Column(db.Integer, nullable=False, default=0)

    def __repr__(self) -> str:
        return (
            f"<RoutineExercise routine={self.routine_id} "
            f"exercise={self.exercise_id}>"
        )
