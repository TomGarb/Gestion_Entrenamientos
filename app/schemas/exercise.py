from pydantic import BaseModel, ConfigDict
from typing import Optional

class ExerciseBase(BaseModel):
    name: str
    muscle_group: str
    description: Optional[str] = ""
    equipment: Optional[str] = ""

class ExerciseCreate(ExerciseBase):
    pass

class ExerciseResponse(ExerciseBase):
    id: int
    is_custom: bool
    user_id: Optional[int] = None
    
    model_config = ConfigDict(from_attributes=True)
