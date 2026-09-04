from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import date, datetime
from app.schemas.routine import RoutineResponse

class UserBasicResponse(BaseModel):
    id: int
    username: str

    model_config = ConfigDict(from_attributes=True)

class ScheduledWorkoutBase(BaseModel):
    routine_id: Optional[int] = None
    scheduled_date: date
    notes: Optional[str] = ""

class ScheduledWorkoutCreate(ScheduledWorkoutBase):
    invite_friend_id: Optional[int] = None

class ScheduledWorkoutUpdate(BaseModel):
    routine_id: Optional[int] = None
    scheduled_date: Optional[date] = None
    notes: Optional[str] = None
    status: Optional[str] = None

class WorkoutInviteRequest(BaseModel):
    friend_id: int
    routine_id: int
    scheduled_date: date
    notes: Optional[str] = ""
    schedule_for_me: bool = True

class ScheduledWorkoutResponse(BaseModel):
    id: int
    user_id: int
    routine_id: Optional[int] = None
    scheduled_date: date
    status: str
    invited_by_id: Optional[int] = None
    notes: str
    created_at: datetime
    updated_at: datetime
    
    routine: Optional[RoutineResponse] = None
    invited_by: Optional[UserBasicResponse] = None
    user: Optional[UserBasicResponse] = None

    model_config = ConfigDict(from_attributes=True)
