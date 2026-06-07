from pydantic import BaseModel
from backend.schemas.user import UserPublicOut
from backend.schemas.playlist import PlaylistOut


class FollowOut(BaseModel):
    user: UserPublicOut
    is_following: bool = True


class FeedItem(BaseModel):
    playlist: PlaylistOut
    user: UserPublicOut
