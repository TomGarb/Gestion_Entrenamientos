from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from app.schemas.exercise import ExerciseResponse

class RoutineExerciseCreate(BaseModel):
    exercise_id: int
    sets: int = 3
    reps: int = 10
    rest_seconds: int = 60

class RoutineExerciseResponse(BaseModel):
    id: int
    exercise_id: int
    sets: int
    reps: int
    rest_seconds: int
    order_index: int
    
    # Anidamos el ejercicio para que el frontend pueda mostrar el nombre sin consultas extra
    exercise: Optional[ExerciseResponse] = None
    
    model_config = ConfigDict(from_attributes=True)

class RoutineCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    is_public: bool = False
    exercises: List[RoutineExerciseCreate]

class RoutineResponse(BaseModel):
    id: int
    name: str
    description: str
    user_id: int
    is_public: bool
    routine_exercises: List[RoutineExerciseResponse] = []
    
    model_config = ConfigDict(from_attributes=True)
