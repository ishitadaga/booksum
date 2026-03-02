from pydantic import BaseModel
from datetime import datetime
from backend.schemas.book import BookOut


class PlaylistCreate(BaseModel):
    name: str
    genre: str | None = None
    description: str | None = None
    is_public: bool = True


class PlaylistUpdate(BaseModel):
    name: str | None = None
    genre: str | None = None
    description: str | None = None
    is_public: bool | None = None


class PlaylistOut(BaseModel):
    id: int
    user_id: int
    name: str
    genre: str | None = None
    description: str | None = None
    is_public: bool = True
    created_at: datetime | None = None
    updated_at: datetime | None = None
    username: str | None = None
    book_count: int = 0


class PlaylistDetailOut(PlaylistOut):
    books: list[BookOut] = []


class PlaylistBookAdd(BaseModel):
    book_id: str
