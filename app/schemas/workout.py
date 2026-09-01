from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import date, datetime
from app.schemas.exercise import ExerciseResponse
# Importamos localmente dentro de WorkoutLogResponse si hay problemas circulares

class WorkoutSetBase(BaseModel):
    exercise_id: int
    reps_completed: int
    weight_kg: float = 0.0
    rpe: Optional[int] = None
    notes: Optional[str] = ""

class WorkoutSetCreate(WorkoutSetBase):
    pass

class WorkoutSetResponse(WorkoutSetBase):
    id: int
    workout_log_id: int
    set_number: int
    exercise: Optional[ExerciseResponse] = None
    
    model_config = ConfigDict(from_attributes=True)

class WorkoutLogCreate(BaseModel):
    routine_id: Optional[int] = None
    notes: Optional[str] = ""

class RoutineSimpleResponse(BaseModel):
    id: int
    name: str
    
    model_config = ConfigDict(from_attributes=True)

class WorkoutLogResponse(BaseModel):
    id: int
    user_id: int
    routine_id: Optional[int]
    date: date
    status: str
    duration_minutes: Optional[int]
    notes: str
    created_at: datetime
    sets: List[WorkoutSetResponse] = []
    routine: Optional[RoutineSimpleResponse] = None
    
    model_config = ConfigDict(from_attributes=True)
