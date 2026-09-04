from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class GroupMemberUser(BaseModel):
    id: int
    username: str
    email: str

    class Config:
        from_attributes = True


class GroupMemberResponse(BaseModel):
    id: int
    user_id: int
    role: str  # 'admin' | 'member'
    joined_at: datetime
    user: GroupMemberUser

    class Config:
        from_attributes = True


class GroupCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="Nombre del grupo")
    description: Optional[str] = Field(None, max_length=255, description="Descripción opcional del grupo")


class GroupUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=255)


class AddMemberRequest(BaseModel):
    user_id: int


class UpdateMemberRoleRequest(BaseModel):
    role: str = Field(..., pattern="^(admin|member)$")


class GroupResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    creator_id: int
    creator_username: str
    members_count: int
    is_admin: bool
    user_role: str
    created_at: datetime

    class Config:
        from_attributes = True


class GroupDetailResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    creator_id: int
    creator_username: str
    is_admin: bool
    user_role: str
    created_at: datetime
    members: List[GroupMemberResponse]

    class Config:
        from_attributes = True


class WorkoutSetSummary(BaseModel):
    exercise_name: str
    set_number: int
    reps_completed: int
    weight_kg: float
    rpe: Optional[int] = None

    class Config:
        from_attributes = True


class ExerciseSummary(BaseModel):
    exercise_name: str
    sets_count: int
    max_weight_kg: float
    total_reps: int


class FeedItemResponse(BaseModel):
    id: int
    user_id: int
    username: str
    user_email: str
    routine_id: Optional[int] = None
    routine_name: Optional[str] = None
    date: str
    duration_minutes: Optional[int] = None
    notes: Optional[str] = None
    created_at: datetime
    sets_count: int
    total_volume_kg: float
    exercises: List[ExerciseSummary]
    sets: List[WorkoutSetSummary]

    class Config:
        from_attributes = True


class GroupFeedResponse(BaseModel):
    group_id: int
    group_name: str
    feed: List[FeedItemResponse]
    total_logs: int
