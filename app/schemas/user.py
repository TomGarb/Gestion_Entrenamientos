from pydantic import BaseModel, EmailStr
from typing import Optional

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    peso: Optional[float] = None
    altura: Optional[float] = None
    weight_kg: Optional[float] = None
    height_cm: Optional[float] = None
    foto_perfil: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    theme_preference: str
    is_admin: bool = False
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    peso: Optional[float] = None
    altura: Optional[float] = None
    target_weight_kg: Optional[float] = None
    foto_perfil: Optional[str] = None
    share_calendar_with_friends: bool = True

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    is_admin: Optional[bool] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    peso: Optional[float] = None
    altura: Optional[float] = None
    target_weight_kg: Optional[float] = None
    foto_perfil: Optional[str] = None
    share_calendar_with_friends: Optional[bool] = None

class UserPasswordUpdate(BaseModel):
    current_password: str
    new_password: str

class Token(BaseModel):
    access_token: str
    token_type: str
