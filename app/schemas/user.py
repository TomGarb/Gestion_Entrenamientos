from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

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
    theme_preference: str
    is_admin: bool = False
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    target_weight_kg: Optional[float] = None
    share_calendar_with_friends: bool = True

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    is_admin: Optional[bool] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
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
