"""
Esquemas Pydantic para el Calendario y Entrenamientos Planificados.
"""

from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime


class ScheduledWorkoutCreate(BaseModel):
    routine_id: Optional[int] = None
    title: Optional[str] = None
    scheduled_date: date
    notes: Optional[str] = None


class ScheduledWorkoutUpdate(BaseModel):
    routine_id: Optional[int] = None
    title: Optional[str] = None
    scheduled_date: Optional[date] = None
    notes: Optional[str] = None


class ScheduledWorkoutResponse(BaseModel):
    id: int
    user_id: int
    routine_id: Optional[int] = None
    routine_name: Optional[str] = None
    title: Optional[str] = None
    scheduled_date: date
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class CalendarDayEvent(BaseModel):
    type: str  # "completed" | "scheduled"
    id: int
    date: str  # YYYY-MM-DD
    title: str
    routine_id: Optional[int] = None
    routine_name: Optional[str] = None
    duration_minutes: Optional[int] = None
    sets_count: Optional[int] = None
    total_volume_kg: Optional[float] = None
    notes: Optional[str] = None
    exercises: Optional[List[str]] = []


class CalendarResponse(BaseModel):
    user_id: int
    username: str
    share_calendar_with_friends: bool
    events: List[CalendarDayEvent]
    total_completed: int
    total_scheduled: int
