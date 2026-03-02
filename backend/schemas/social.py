from pydantic import BaseModel
from backend.schemas.user import UserOut
from backend.schemas.playlist import PlaylistOut


class FollowOut(BaseModel):
    user: UserOut
    is_following: bool = True


class FeedItem(BaseModel):
    playlist: PlaylistOut
    user: UserOut
