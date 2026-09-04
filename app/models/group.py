"""
Modelos WorkoutGroup y GroupMember — Grupos de entrenamiento y membresías.
"""

from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship

from app.database import Base


class WorkoutGroup(Base):
    """Grupo de entrenamiento para compartir y competir sanamente."""
    __tablename__ = "workout_groups"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(String(255), nullable=True)
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # --- Relaciones -----------------------------------------------------------
    creator = relationship("User", foreign_keys=[creator_id])
    members = relationship(
        "GroupMember",
        back_populates="group",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<WorkoutGroup id={self.id} name='{self.name}'>"


class GroupMember(Base):
    """Membresía y rol de un usuario en un grupo de entrenamiento."""
    __tablename__ = "group_members"

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(
        Integer, ForeignKey("workout_groups.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role = Column(String(20), default="member", nullable=False)  # "admin" | "member"
    joined_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint("group_id", "user_id", name="uq_group_member"),
    )

    # --- Relaciones -----------------------------------------------------------
    group = relationship("WorkoutGroup", back_populates="members")
    user = relationship("User", back_populates="group_memberships")

    def __repr__(self) -> str:
        return f"<GroupMember group={self.group_id} user={self.user_id} role='{self.role}'>"
