from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.database import get_db
from backend.models.user import User
from backend.models.social import Follow
from backend.models.playlist import Playlist
from backend.schemas.user import UserPublicOut
from backend.schemas.social import FollowOut, FeedItem
from backend.schemas.playlist import PlaylistOut
from backend.services.auth_service import get_current_user, get_optional_user

router = APIRouter(prefix="/api/social", tags=["social"])


@router.post("/follow/{user_id}")
async def follow_user(
    user_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user_id == user.id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")

    # Check target exists
    result = await db.execute(select(User).where(User.id == user_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="User not found")

    # Check not already following
    existing = await db.execute(
        select(Follow).where(Follow.follower_id == user.id, Follow.followed_id == user_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Already following")

    follow = Follow(follower_id=user.id, followed_id=user_id)
    db.add(follow)
    await db.commit()
    return {"ok": True}


@router.delete("/follow/{user_id}")
async def unfollow_user(
    user_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Follow).where(Follow.follower_id == user.id, Follow.followed_id == user_id)
    )
    follow = result.scalar_one_or_none()
    if not follow:
        raise HTTPException(status_code=404, detail="Not following this user")

    await db.delete(follow)
    await db.commit()
    return {"ok": True}


@router.get("/followers", response_model=list[UserPublicOut])
async def get_followers(
    user_id: int | None = Query(None),
    current_user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    target_id = user_id or (current_user.id if current_user else None)
    if not target_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    result = await db.execute(
        select(User)
        .join(Follow, Follow.follower_id == User.id)
        .where(Follow.followed_id == target_id)
    )
    users = result.scalars().all()
    return [
        UserPublicOut(id=u.id, username=u.username,
                      display_name=u.display_name, created_at=u.created_at)
        for u in users
    ]


@router.get("/following", response_model=list[UserPublicOut])
async def get_following(
    user_id: int | None = Query(None),
    current_user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    target_id = user_id or (current_user.id if current_user else None)
    if not target_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    result = await db.execute(
        select(User)
        .join(Follow, Follow.followed_id == User.id)
        .where(Follow.follower_id == target_id)
    )
    users = result.scalars().all()
    return [
        UserPublicOut(id=u.id, username=u.username,
                      display_name=u.display_name, created_at=u.created_at)
        for u in users
    ]


@router.get("/feed", response_model=list[FeedItem])
async def get_feed(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Get IDs of users we follow
    following_result = await db.execute(
        select(Follow.followed_id).where(Follow.follower_id == user.id)
    )
    followed_ids = [r[0] for r in following_result.all()]

    if not followed_ids:
        return []

    # Get recent public playlists from followed users
    result = await db.execute(
        select(Playlist, User)
        .join(User, User.id == Playlist.user_id)
        .where(Playlist.user_id.in_(followed_ids), Playlist.is_public == True)
        .order_by(Playlist.updated_at.desc())
        .limit(50)
    )

    feed = []
    for playlist, playlist_user in result.all():
        feed.append(FeedItem(
            playlist=PlaylistOut(
                id=playlist.id, user_id=playlist.user_id, name=playlist.name,
                genre=playlist.genre, description=playlist.description,
                is_public=playlist.is_public, created_at=playlist.created_at,
                updated_at=playlist.updated_at, username=playlist_user.username,
            ),
            user=UserPublicOut(
                id=playlist_user.id, username=playlist_user.username,
                display_name=playlist_user.display_name,
                created_at=playlist_user.created_at,
            ),
        ))
    return feed


@router.get("/users/search", response_model=list[UserPublicOut])
async def search_users(
    q: str = Query(..., min_length=1),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User)
        .where(User.username.ilike(f"%{q}%") | User.display_name.ilike(f"%{q}%"))
        .limit(20)
    )
    users = result.scalars().all()
    return [
        UserPublicOut(id=u.id, username=u.username,
                      display_name=u.display_name, created_at=u.created_at)
        for u in users
    ]


@router.get("/users/{user_id}", response_model=UserPublicOut)
async def get_user(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserPublicOut(
        id=user.id, username=user.username,
        display_name=user.display_name, created_at=user.created_at,
    )
