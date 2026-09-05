from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, Dict, Any

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    peso: Optional[float] = None
    altura: Optional[float] = None
    weight_kg: Optional[float] = None
    height_cm: Optional[float] = None
    foto_perfil: Optional[str] = None
    avatar_url: Optional[str] = None

    @field_validator('username', mode='before')
    @classmethod
    def clean_username(cls, v: str) -> str:
        if isinstance(v, str):
            return v.strip().lower()
        return v

    @field_validator('email', mode='before')
    @classmethod
    def clean_email(cls, v: str) -> str:
        if isinstance(v, str):
            return v.strip().lower()
        return v

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    avatar_url: Optional[str] = None
    foto_perfil: Optional[str] = None
    extra_data: Optional[Dict[str, Any]] = None
    theme_preference: str
    is_admin: bool = False
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    peso: Optional[float] = None
    altura: Optional[float] = None
    target_weight_kg: Optional[float] = None
    share_calendar_with_friends: bool = True

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    avatar_url: Optional[str] = None
    foto_perfil: Optional[str] = None
    extra_data: Optional[Dict[str, Any]] = None
    is_admin: Optional[bool] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    peso: Optional[float] = None
    altura: Optional[float] = None
    target_weight_kg: Optional[float] = None
    share_calendar_with_friends: Optional[bool] = None

    @field_validator('username', mode='before')
    @classmethod
    def clean_username(cls, v: Optional[str]) -> Optional[str]:
        if isinstance(v, str):
            val = v.strip().lower()
            return val if val else None
        return v

    @field_validator('email', mode='before')
    @classmethod
    def clean_email(cls, v: Optional[str]) -> Optional[str]:
        if isinstance(v, str):
            val = v.strip().lower()
            return val if val else None
        return v

class UserPasswordUpdate(BaseModel):
    current_password: str
    new_password: str

class Token(BaseModel):
    access_token: str
    token_type: str
