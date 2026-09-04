"""
Modelo User - Gestión de cuentas de usuario puro SQLAlchemy.
"""

import bcrypt
from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, DateTime, Float, Boolean, Text, JSON
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(80), unique=True, nullable=False, index=True)
    email = Column(String(120), unique=True, nullable=False, index=True)
    avatar_url = Column(Text, nullable=True)
    extra_data = Column(JSON, nullable=True, default=dict)
    password_hash = Column(String(256), nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False)
    theme_preference = Column(String(10), default="dark", nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    telegram_chat_id = Column(String(64), unique=True, nullable=True)
    telegram_sync_token = Column(String(6), unique=True, nullable=True)

    # Physical Attributes
    height_cm = Column(Float, nullable=True)
    weight_kg = Column(Float, nullable=True)
    target_weight_kg = Column(Float, nullable=True)

    # Privacy Settings
    share_calendar_with_friends = Column(Boolean, default=True, nullable=False)

    # --- Relaciones -----------------------------------------------------------
    routines = relationship(
        "Routine",
        back_populates="author",
        cascade="all, delete-orphan",
    )
    custom_exercises = relationship(
        "Exercise",
        back_populates="creator",
        cascade="all, delete-orphan",
    )
    workout_logs = relationship(
        "WorkoutLog",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    feedbacks = relationship(
        "Feedback",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    notifications = relationship(
        "Notification",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    group_memberships = relationship(
        "GroupMember",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    scheduled_workouts = relationship(
        "ScheduledWorkout",
        back_populates="user",
        cascade="all, delete-orphan",
        foreign_keys="[ScheduledWorkout.user_id]",
    )

    def __repr__(self) -> str:
        return f"<User {self.username}>"

    def set_password(self, password: str):
        self.password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    def check_password(self, password: str) -> bool:
        try:
            return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))
        except ValueError:
            return False
