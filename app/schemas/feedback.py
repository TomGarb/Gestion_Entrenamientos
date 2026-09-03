from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class FeedbackCreate(BaseModel):
    message: str

class FeedbackResponse(BaseModel):
    id: int
    user_id: int
    message: str
    status: str
    created_at: datetime
    
    # Datos extra para el admin
    username: Optional[str] = None
    email: Optional[str] = None

    class Config:
        from_attributes = True
