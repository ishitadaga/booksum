"""Hybrid search: SQLite first, Open Library fallback."""
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func, text

from backend.models.book import Book
from backend.services import openlibrary_client, embedding_service
from backend.schemas.book import BookOut, BookSearchResult


async def ensure_search_indexes(db: AsyncSession):
    await db.execute(text(
        "CREATE INDEX IF NOT EXISTS idx_books_title ON books(title COLLATE NOCASE)"
    ))
    await db.execute(text(
        "CREATE INDEX IF NOT EXISTS idx_books_author ON books(author COLLATE NOCASE)"
    ))
    await db.commit()


_indexes_created = False


async def search_books(
    query: str, db: AsyncSession, limit: int = 20
) -> BookSearchResult:
    global _indexes_created
    if not _indexes_created:
        await ensure_search_indexes(db)
        _indexes_created = True

    q = f"%{query}%"
    result = await db.execute(
        select(Book)
        .where(or_(
            Book.title.ilike(q),
            Book.author.ilike(q),
        ))
        .order_by(Book.num_ratings.desc().nullslast())
        .limit(limit)
    )
    local_books = result.scalars().all()

    if local_books:
        return BookSearchResult(
            books=[_to_book_out(b) for b in local_books],
            total=len(local_books),
            source="local",
        )

    # Only fall back to Open Library when we have zero local results
    ol_books = await openlibrary_client.search_books(query, limit=limit)

    new_books = []
    for ol in ol_books:
        existing = await db.execute(
            select(Book).where(Book.book_id == ol["book_id"])
        )
        if existing.scalar_one_or_none():
            continue

        book = Book(**ol)
        db.add(book)
        new_books.append(book)

        if ol.get("description") and len(ol["description"]) > 10:
            parts = [ol["description"]]
            if ol.get("subjects"):
                parts.append(f"Subjects: {ol['subjects']}")
            parts.append(f"Genre: {ol.get('genres', '')}")
            parts.append(f"{ol['title']} by {ol['author']}")
            text_input = " | ".join(parts)
            await asyncio.get_event_loop().run_in_executor(
                None, embedding_service.add_embedding, ol["book_id"], text_input
            )

    if new_books:
        await db.commit()

    all_books = [BookOut(**ol) for ol in ol_books]
    return BookSearchResult(
        books=all_books[:limit],
        total=len(all_books),
        source="openlibrary",
    )


async def get_book(book_id: str, db: AsyncSession) -> BookOut | None:
    result = await db.execute(select(Book).where(Book.book_id == book_id))
    book = result.scalar_one_or_none()
    if book:
        return _to_book_out(book)
    return None


def _to_book_out(book: Book) -> BookOut:
    return BookOut(
        book_id=book.book_id,
        title=book.title,
        author=book.author,
        description=book.description,
        genres=book.genres,
        publication_year=book.publication_year,
        isbn=book.isbn,
        cover_img=book.cover_img,
        rating=book.rating,
        num_ratings=book.num_ratings,
        source=book.source,
        has_embedding=book.has_embedding or False,
    )
