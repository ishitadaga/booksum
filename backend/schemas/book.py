from pydantic import BaseModel


class BookOut(BaseModel):
    book_id: str
    title: str
    author: str | None = None
    description: str | None = None
    genres: str | None = None
    publication_year: int | None = None
    isbn: str | None = None
    cover_img: str | None = None
    rating: float | None = None
    num_ratings: int | None = None
    source: str | None = None
    has_embedding: bool = False


class BookSearchResult(BaseModel):
    books: list[BookOut]
    total: int
    source: str  # "local", "openlibrary", or "mixed"
