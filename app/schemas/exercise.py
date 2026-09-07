from pydantic import BaseModel, ConfigDict, model_validator
from typing import Optional, Any


class ExerciseBase(BaseModel):
    name: str
    muscle_group: str
    description: Optional[str] = ""
    equipment: Optional[str] = ""
    is_bodyweight: bool = False


class ExerciseCreate(ExerciseBase):
    @model_validator(mode="before")
    @classmethod
    def handle_spanish_aliases(cls, values: Any) -> Any:
        if isinstance(values, dict):
            if "name" not in values and "nombre" in values:
                values["name"] = values.get("nombre")
            if "muscle_group" not in values and "grupo_muscular" in values:
                values["muscle_group"] = values.get("grupo_muscular")
            if "description" not in values and "descripcion" in values:
                values["description"] = values.get("descripcion")
            if "equipment" not in values and "equipamiento" in values:
                values["equipment"] = values.get("equipamiento")
        return values


class ExerciseResponse(ExerciseBase):
    id: int
    is_custom: bool
    is_bodyweight: bool = False
    user_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)
