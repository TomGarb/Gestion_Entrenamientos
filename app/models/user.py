"""
Modelo User - Gestión de cuentas de usuario puro SQLAlchemy.
"""

import bcrypt
from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, DateTime, Float
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(80), unique=True, nullable=False, index=True)
    email = Column(String(120), unique=True, nullable=False, index=True)
    password_hash = Column(String(256), nullable=False)
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

    def __repr__(self) -> str:
        return f"<User {self.username}>"

    def set_password(self, password: str):
        self.password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    def check_password(self, password: str) -> bool:
        try:
            return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))
        except ValueError:
            return False
