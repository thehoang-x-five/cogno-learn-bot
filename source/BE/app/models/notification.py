"""
Notification model — stores in-app notifications for users.
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database.db import Base


class Notification(Base):
    """In-app notification for a user."""
    __tablename__ = "notifications"

    id           = Column(Integer, primary_key=True, index=True)
    user_id      = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    type         = Column(String(30), nullable=False)   # "enrollment" | "document" | "quiz"
    title        = Column(String(200), nullable=False)
    message      = Column(String(500), nullable=False)
    is_read      = Column(Boolean, nullable=False, default=False)
    related_type = Column(String(30), nullable=True)    # "course" | "document" | "quiz"
    related_id   = Column(Integer, nullable=True)       # FK-like ref, no hard constraint
    created_at   = Column(DateTime, server_default=func.now(), index=True)

    user = relationship("User")

    def __repr__(self):
        return f"<Notification(id={self.id}, user_id={self.user_id}, type={self.type}, read={self.is_read})>"
