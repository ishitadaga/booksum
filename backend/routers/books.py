from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.schemas.book import BookOut, BookSearchResult
from backend.services import book_service

router = APIRouter(prefix="/api/books", tags=["books"])


@router.get("/search", response_model=BookSearchResult)
async def search_books(
    q: str = Query(..., min_length=1),
    limit: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    return await book_service.search_books(q, db, limit=limit)


@router.get("/{book_id}", response_model=BookOut)
async def get_book(book_id: str, db: AsyncSession = Depends(get_db)):
    book = await book_service.get_book(book_id, db)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    return book
