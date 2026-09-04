from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database import Base

class Notification(Base):
    __tablename__ = 'notifications'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    title = Column(String(150), nullable=False)
    message = Column(String(500), nullable=False)
    type = Column(String(50), default='general', nullable=False)  # friend_request, friend_accepted, general
    reference_id = Column(Integer, nullable=True)
    is_read = Column(Boolean, default=False, nullable=False)

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    user = relationship('User', back_populates='notifications')

    def __repr__(self) -> str:
        return f'<Notification {self.id} for User {self.user_id}: {self.title}>'
