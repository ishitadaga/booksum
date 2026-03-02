from sqlalchemy import Column, Integer, ForeignKey, DateTime, CheckConstraint, func
from backend.database import Base


class Follow(Base):
    __tablename__ = "follows"

    follower_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    followed_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    created_at = Column(DateTime, server_default=func.now())

    __table_args__ = (
        CheckConstraint('follower_id != followed_id'),
    )
