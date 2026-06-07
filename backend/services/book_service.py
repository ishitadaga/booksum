"""Hybrid search: SQLite first, Open Library fallback."""
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func

from backend.models.book import Book
from backend.services import openlibrary_client, embedding_service
from backend.schemas.book import BookOut, BookSearchResult


async def search_books(
    query: str, db: AsyncSession, limit: int = 20
) -> BookSearchResult:
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

    if len(local_books) >= limit:
        return BookSearchResult(
            books=[_to_book_out(b) for b in local_books],
            total=len(local_books),
            source="local",
        )

    # Fallback to Open Library for remaining
    remaining = limit - len(local_books)
    ol_books = await openlibrary_client.search_books(query, limit=remaining)

    # Insert OL books into database and compute embeddings
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

        # Compute embedding on-the-fly if description exists (in thread to avoid blocking event loop)
        if ol.get("description") and len(ol["description"]) > 10:
            text = f"{ol['title']} by {ol['author']}. {ol['description']}"
            await asyncio.get_event_loop().run_in_executor(
                None, embedding_service.add_embedding, ol["book_id"], text
            )

    if new_books:
        await db.commit()

    all_books = [_to_book_out(b) for b in local_books] + [
        BookOut(**ol) for ol in ol_books
    ]
    source = "local" if not ol_books else ("mixed" if local_books else "openlibrary")

    return BookSearchResult(
        books=all_books[:limit],
        total=len(all_books),
        source=source,
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
