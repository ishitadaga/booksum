from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from backend.database import get_db
from backend.models.user import User
from backend.models.book import Book
from backend.models.playlist import Playlist, PlaylistBook
from backend.schemas.playlist import (
    PlaylistCreate, PlaylistUpdate, PlaylistOut, PlaylistDetailOut, PlaylistBookAdd,
)
from backend.schemas.book import BookOut
from backend.services.auth_service import get_current_user, get_optional_user

router = APIRouter(prefix="/api/playlists", tags=["playlists"])


@router.post("", response_model=PlaylistOut)
async def create_playlist(
    data: PlaylistCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    playlist = Playlist(
        user_id=user.id,
        name=data.name,
        genre=data.genre,
        description=data.description,
        is_public=data.is_public,
    )
    db.add(playlist)
    await db.commit()
    await db.refresh(playlist)
    return PlaylistOut(
        id=playlist.id, user_id=playlist.user_id, name=playlist.name,
        genre=playlist.genre, description=playlist.description,
        is_public=playlist.is_public, created_at=playlist.created_at,
        updated_at=playlist.updated_at, username=user.username, book_count=0,
    )


@router.get("", response_model=list[PlaylistOut])
async def list_playlists(
    user_id: int | None = Query(None),
    genre: str | None = Query(None),
    current_user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Playlist, User.username).join(User, User.id == Playlist.user_id)

    if user_id:
        query = query.where(Playlist.user_id == user_id)
        # Show private playlists only to the owner
        if not current_user or current_user.id != user_id:
            query = query.where(Playlist.is_public == True)
    else:
        query = query.where(Playlist.is_public == True)

    if genre:
        query = query.where(Playlist.genre == genre)

    query = query.order_by(Playlist.updated_at.desc())
    result = await db.execute(query)
    rows = result.all()

    playlists = []
    for playlist, username in rows:
        # Get book count
        count_result = await db.execute(
            select(func.count()).where(PlaylistBook.playlist_id == playlist.id)
        )
        book_count = count_result.scalar() or 0
        playlists.append(PlaylistOut(
            id=playlist.id, user_id=playlist.user_id, name=playlist.name,
            genre=playlist.genre, description=playlist.description,
            is_public=playlist.is_public, created_at=playlist.created_at,
            updated_at=playlist.updated_at, username=username, book_count=book_count,
        ))
    return playlists


@router.get("/{playlist_id}", response_model=PlaylistDetailOut)
async def get_playlist(
    playlist_id: int,
    current_user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Playlist, User.username)
        .join(User, User.id == Playlist.user_id)
        .where(Playlist.id == playlist_id)
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Playlist not found")

    playlist, username = row
    if not playlist.is_public:
        if not current_user or current_user.id != playlist.user_id:
            raise HTTPException(status_code=403, detail="Private playlist")

    # Get books in order
    books_result = await db.execute(
        select(Book)
        .join(PlaylistBook, PlaylistBook.book_id == Book.book_id)
        .where(PlaylistBook.playlist_id == playlist_id)
        .order_by(PlaylistBook.position)
    )
    books = [
        BookOut(
            book_id=b.book_id, title=b.title, author=b.author,
            description=b.description, genres=b.genres,
            publication_year=b.publication_year, isbn=b.isbn,
            cover_img=b.cover_img, rating=b.rating,
            num_ratings=b.num_ratings, source=b.source,
            has_embedding=b.has_embedding or False,
        )
        for b in books_result.scalars().all()
    ]

    return PlaylistDetailOut(
        id=playlist.id, user_id=playlist.user_id, name=playlist.name,
        genre=playlist.genre, description=playlist.description,
        is_public=playlist.is_public, created_at=playlist.created_at,
        updated_at=playlist.updated_at, username=username,
        book_count=len(books), books=books,
    )


@router.put("/{playlist_id}", response_model=PlaylistOut)
async def update_playlist(
    playlist_id: int,
    data: PlaylistUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Playlist).where(Playlist.id == playlist_id))
    playlist = result.scalar_one_or_none()
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    if playlist.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not your playlist")

    if data.name is not None:
        playlist.name = data.name
    if data.genre is not None:
        playlist.genre = data.genre
    if data.description is not None:
        playlist.description = data.description
    if data.is_public is not None:
        playlist.is_public = data.is_public

    await db.commit()
    await db.refresh(playlist)

    count_result = await db.execute(
        select(func.count()).where(PlaylistBook.playlist_id == playlist.id)
    )
    book_count = count_result.scalar() or 0

    return PlaylistOut(
        id=playlist.id, user_id=playlist.user_id, name=playlist.name,
        genre=playlist.genre, description=playlist.description,
        is_public=playlist.is_public, created_at=playlist.created_at,
        updated_at=playlist.updated_at, username=user.username,
        book_count=book_count,
    )


@router.delete("/{playlist_id}")
async def delete_playlist(
    playlist_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Playlist).where(Playlist.id == playlist_id))
    playlist = result.scalar_one_or_none()
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    if playlist.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not your playlist")

    await db.delete(playlist)
    await db.commit()
    return {"ok": True}


@router.post("/{playlist_id}/books")
async def add_book_to_playlist(
    playlist_id: int,
    data: PlaylistBookAdd,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Playlist).where(Playlist.id == playlist_id))
    playlist = result.scalar_one_or_none()
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    if playlist.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not your playlist")

    # Get next position
    pos_result = await db.execute(
        select(func.max(PlaylistBook.position))
        .where(PlaylistBook.playlist_id == playlist_id)
    )
    max_pos = pos_result.scalar() or 0

    pb = PlaylistBook(
        playlist_id=playlist_id,
        book_id=data.book_id,
        position=max_pos + 1,
    )
    db.add(pb)
    try:
        await db.commit()
    except Exception:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Book already in playlist")
    return {"ok": True}


@router.delete("/{playlist_id}/books/{book_id}")
async def remove_book_from_playlist(
    playlist_id: int,
    book_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Playlist).where(Playlist.id == playlist_id))
    playlist = result.scalar_one_or_none()
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    if playlist.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not your playlist")

    pb_result = await db.execute(
        select(PlaylistBook).where(
            PlaylistBook.playlist_id == playlist_id,
            PlaylistBook.book_id == book_id,
        )
    )
    pb = pb_result.scalar_one_or_none()
    if not pb:
        raise HTTPException(status_code=404, detail="Book not in playlist")

    await db.delete(pb)
    await db.commit()
    return {"ok": True}
