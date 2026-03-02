from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, UniqueConstraint, func
from backend.database import Base


class Playlist(Base):
    __tablename__ = "playlists"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    genre = Column(String)
    description = Column(Text)
    is_public = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class PlaylistBook(Base):
    __tablename__ = "playlist_books"

    id = Column(Integer, primary_key=True, autoincrement=True)
    playlist_id = Column(Integer, ForeignKey("playlists.id", ondelete="CASCADE"), nullable=False)
    book_id = Column(String, ForeignKey("books.book_id"), nullable=False)
    position = Column(Integer, default=0)
    added_at = Column(DateTime, server_default=func.now())

    __table_args__ = (
        UniqueConstraint('playlist_id', 'book_id'),
    )
