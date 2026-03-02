"""Open Library API wrapper for fallback book search."""
import httpx
import hashlib
from backend.config import OPENLIBRARY_SEARCH_URL, OPENLIBRARY_WORKS_URL

_client: httpx.AsyncClient | None = None


def get_client() -> httpx.AsyncClient:
    global _client
    if _client is None:
        _client = httpx.AsyncClient(timeout=10.0)
    return _client


def make_ol_book_id(title: str, author: str) -> str:
    norm = f"ol|{title.strip().lower()}|{author.strip().lower()}"
    return "ol_" + hashlib.md5(norm.encode()).hexdigest()[:10]


async def search_books(query: str, limit: int = 10) -> list[dict]:
    """Search Open Library and return normalized book dicts."""
    client = get_client()
    try:
        resp = await client.get(OPENLIBRARY_SEARCH_URL, params={
            "q": query,
            "fields": "key,title,author_name,subject,isbn,first_publish_year,cover_i",
            "limit": limit,
        })
        resp.raise_for_status()
        data = resp.json()
    except Exception:
        return []

    books = []
    for doc in data.get("docs", []):
        title = doc.get("title", "")
        authors = doc.get("author_name", [])
        author = authors[0] if authors else "Unknown"
        cover_i = doc.get("cover_i")
        cover_img = f"https://covers.openlibrary.org/b/id/{cover_i}-M.jpg" if cover_i else ""
        isbns = doc.get("isbn", [])

        # Fetch description from works endpoint
        work_key = doc.get("key", "")
        description = await _fetch_description(work_key) if work_key else ""

        books.append({
            "book_id": make_ol_book_id(title, author),
            "title": title,
            "author": author,
            "description": description,
            "genres": _map_subjects(doc.get("subject", [])),
            "publication_year": doc.get("first_publish_year"),
            "isbn": isbns[0] if isbns else "",
            "cover_img": cover_img,
            "rating": None,
            "num_ratings": None,
            "source": "openlibrary",
            "open_library_key": work_key,
            "has_embedding": bool(description and len(description) > 10),
        })

    return books


async def _fetch_description(work_key: str) -> str:
    """Fetch book description from /works/<key>.json."""
    client = get_client()
    try:
        url = f"{OPENLIBRARY_WORKS_URL}/{work_key.split('/')[-1]}.json"
        resp = await client.get(url)
        resp.raise_for_status()
        data = resp.json()
        desc = data.get("description", "")
        if isinstance(desc, dict):
            desc = desc.get("value", "")
        return desc[:2000] if desc else ""
    except Exception:
        return ""


def _map_subjects(subjects: list[str]) -> str:
    """Map Open Library subjects to a canonical genre."""
    genre_keywords = {
        "Fiction": ["fiction", "novel", "literature"],
        "Non-Fiction": ["nonfiction", "non-fiction", "essays", "philosophy"],
        "Mystery/Thriller": ["mystery", "thriller", "detective", "crime", "suspense"],
        "Science Fiction": ["science fiction", "sci-fi", "dystopia"],
        "Fantasy": ["fantasy", "magic", "supernatural"],
        "Romance": ["romance", "love"],
        "Biography": ["biography", "memoir", "autobiography"],
        "History": ["history", "historical", "war"],
        "Science": ["science", "mathematics", "physics", "biology", "psychology"],
        "Self-Help": ["self-help", "self help", "personal development"],
    }
    subject_text = " ".join(s.lower() for s in subjects[:20])
    for genre, keywords in genre_keywords.items():
        if any(kw in subject_text for kw in keywords):
            return genre
    return "Fiction"
