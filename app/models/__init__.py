"""
Paquete de modelos — Exporta todas las entidades del ORM.

Importar desde aquí permite acceder a cualquier modelo con:
    from app.models import User, Exercise, Routine, ...
"""

from app.models.user import User
from app.models.exercise import Exercise
from app.models.routine import Routine, RoutineExercise
from app.models.workout import WorkoutLog, WorkoutSet

__all__ = [
    "User",
    "Exercise",
    "Routine",
    "RoutineExercise",
    "WorkoutLog",
    "WorkoutSet",
]
