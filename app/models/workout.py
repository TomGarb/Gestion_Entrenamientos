"""
Modelos WorkoutLog y WorkoutSet — Registro de entrenamientos.

WorkoutLog: sesión de entrenamiento concreta realizada en una fecha.
WorkoutSet: serie individual dentro de una sesión (peso, reps, RPE).
"""

from datetime import date, datetime, timezone

from app import db


class WorkoutLog(db.Model):
    """Registro de una sesión de entrenamiento."""

    __tablename__ = "workout_logs"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=False
    )
    routine_id = db.Column(
        db.Integer, db.ForeignKey("routines.id"), nullable=True
    )
    date = db.Column(
        db.Date, nullable=False, default=lambda: date.today()
    )
    status = db.Column(db.String(20), default="in_progress", nullable=False)
    duration_minutes = db.Column(db.Integer, nullable=True)
    notes = db.Column(db.Text, default="", nullable=False)
    created_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # --- Relaciones -----------------------------------------------------------
    sets = db.relationship(
        "WorkoutSet",
        backref="workout_log",
        lazy="dynamic",
        cascade="all, delete-orphan",
        order_by="WorkoutSet.set_number",
    )

    def __repr__(self) -> str:
        return f"<WorkoutLog {self.date} user={self.user_id}>"


class WorkoutSet(db.Model):
    """Serie individual realizada dentro de un entrenamiento.

    Columna clave para métricas:
        volumen = reps_completed × weight_kg
        progreso = evolución temporal del peso/volumen por ejercicio
    """

    __tablename__ = "workout_sets"

    id = db.Column(db.Integer, primary_key=True)
    workout_log_id = db.Column(
        db.Integer, db.ForeignKey("workout_logs.id"), nullable=False
    )
    exercise_id = db.Column(
        db.Integer, db.ForeignKey("exercises.id"), nullable=False
    )
    set_number = db.Column(db.Integer, nullable=False)
    reps_completed = db.Column(db.Integer, nullable=False)
    weight_kg = db.Column(db.Float, nullable=False, default=0.0)
    rpe = db.Column(db.Integer, nullable=True)  # 1-10, opcional
    notes = db.Column(db.String(200), default="", nullable=False)

    def __repr__(self) -> str:
        return (
            f"<WorkoutSet log={self.workout_log_id} "
            f"ex={self.exercise_id} #{self.set_number}>"
        )
