"""
Paquete de modelos — Exporta todas las entidades del ORM.

Importar desde aquí permite acceder a cualquier modelo con:
    from app.models import User, Exercise, Routine, ...
"""

from app.models.user import User
from app.models.exercise import Exercise
from app.models.routine import Routine, RoutineExercise
from app.models.workout import WorkoutLog, WorkoutSet
from app.models.feedback import Feedback
from app.models.friendship import Friendship
from app.models.notification import Notification
from app.models.group import WorkoutGroup, GroupMember
from app.models.scheduled_workout import ScheduledWorkout

__all__ = [
    "User",
    "Exercise",
    "Routine",
    "RoutineExercise",
    "WorkoutLog",
    "WorkoutSet",
    "Feedback",
    "Friendship",
    "Notification",
    "WorkoutGroup",
    "GroupMember",
    "ScheduledWorkout",
]
