"""Fetch subjects from Open Library for all books and store in DB.

Usage:
    PYTHONPATH=. backend_env/bin/python backend/scripts/fetch_subjects.py

Resumable — skips books that already have subjects. Safe to re-run.
"""
import asyncio
import sqlite3
import time
import re
from pathlib import Path

import httpx

DB_PATH = Path(__file__).resolve().parent.parent / "data" / "booksum.db"
OL_SEARCH = "https://openlibrary.org/search.json"

# Rate limiting: Open Library allows ~100 req/s but let's be respectful
MAX_CONCURRENT = 5  # conservative to avoid OL rate limiting
BATCH_SIZE = 200  # commit every N books
REQUEST_TIMEOUT = 15.0

# Noise patterns to filter out of subjects
NOISE_PATTERNS = [
    re.compile(r"^nyt:"),
    re.compile(r"^series:"),
    re.compile(r"^New York Times"),
    re.compile(r"^Accessible book"),
    re.compile(r"^Protected DAISY"),
    re.compile(r"^Large type"),
    re.compile(r"^In library"),
    re.compile(r"^Long Now"),
    re.compile(r"^Lending library"),
    re.compile(r"^Internet Archive"),
    re.compile(r"^OverDrive"),
    re.compile(r"^Open Library"),
    re.compile(r"^Reading"),
    re.compile(r"^\d{2}\.\d"),  # Dewey decimal like "77.32 intelligence"
]


def clean_subjects(raw_subjects: list[str]) -> list[str]:
    """Filter noise and deduplicate subjects."""
    cleaned = []
    seen = set()
    for s in raw_subjects:
        s = s.strip()
        if not s or len(s) < 2 or len(s) > 80:
            continue
        if any(p.match(s) for p in NOISE_PATTERNS):
            continue
        key = s.lower()
        if key not in seen:
            seen.add(key)
            cleaned.append(s)
    return cleaned[:20]  # cap at 20 subjects


async def fetch_subjects_by_isbn(
    client: httpx.AsyncClient, isbn: str
) -> list[str] | None:
    """Fetch subjects using ISBN search."""
    try:
        resp = await client.get(
            OL_SEARCH,
            params={"isbn": isbn, "limit": 1, "fields": "subject"},
            timeout=REQUEST_TIMEOUT,
        )
        if resp.status_code != 200:
            return None
        data = resp.json()
        if data.get("docs"):
            return data["docs"][0].get("subject", [])
    except Exception:
        return None
    return None


async def fetch_subjects_by_title(
    client: httpx.AsyncClient, title: str, author: str
) -> list[str] | None:
    """Fetch subjects using title + author search."""
    try:
        params = {"title": title, "limit": 1, "fields": "subject"}
        if author:
            params["author"] = author
        resp = await client.get(
            OL_SEARCH, params=params, timeout=REQUEST_TIMEOUT
        )
        if resp.status_code != 200:
            return None
        data = resp.json()
        if data.get("docs"):
            return data["docs"][0].get("subject", [])
    except Exception:
        return None
    return None


async def process_book(
    client: httpx.AsyncClient,
    semaphore: asyncio.Semaphore,
    book: tuple,
) -> tuple[str, str | None]:
    """Fetch subjects for a single book. Returns (book_id, subjects_str or None)."""
    book_id, title, author, isbn = book
    async with semaphore:
        subjects = None
        # Try ISBN first (more precise)
        if isbn and isbn != "9999999999999":
            subjects = await fetch_subjects_by_isbn(client, isbn)
        # Fallback to title+author
        if not subjects:
            subjects = await fetch_subjects_by_title(client, title, author or "")

        if subjects:
            cleaned = clean_subjects(subjects)
            if cleaned:
                return book_id, ", ".join(cleaned)
        return book_id, None


async def main():
    conn = sqlite3.connect(str(DB_PATH))

    # Add subjects column if it doesn't exist
    cols = [c[1] for c in conn.execute("PRAGMA table_info(books)").fetchall()]
    if "subjects" not in cols:
        conn.execute("ALTER TABLE books ADD COLUMN subjects TEXT")
        conn.commit()
        print("Added 'subjects' column to books table.")

    # Get books that need subjects (skip ones already fetched)
    books = conn.execute(
        "SELECT book_id, title, author, isbn FROM books "
        "WHERE has_embedding = 1 AND (subjects IS NULL OR subjects = '') "
        "ORDER BY num_ratings DESC NULLS LAST"
    ).fetchall()

    total = len(books)
    already_done = conn.execute(
        "SELECT COUNT(*) FROM books WHERE subjects IS NOT NULL AND subjects != ''"
    ).fetchone()[0]
    print(f"Books to fetch: {total} (already done: {already_done})")

    if total == 0:
        print("Nothing to do!")
        conn.close()
        return

    semaphore = asyncio.Semaphore(MAX_CONCURRENT)
    fetched = 0
    failed = 0
    start_time = time.time()

    async with httpx.AsyncClient() as client:
        # Process in batches for incremental DB saves
        for batch_start in range(0, total, BATCH_SIZE):
            batch = books[batch_start : batch_start + BATCH_SIZE]
            tasks = [process_book(client, semaphore, b) for b in batch]
            results = await asyncio.gather(*tasks)

            # Write batch to DB
            updates = [(subj, bid) for bid, subj in results if subj]
            if updates:
                conn.executemany(
                    "UPDATE books SET subjects = ? WHERE book_id = ?", updates
                )
                conn.commit()
                fetched += len(updates)

            failed += sum(1 for _, subj in results if subj is None)
            elapsed = time.time() - start_time
            done = batch_start + len(batch)
            rate = done / elapsed if elapsed > 0 else 0
            eta = (total - done) / rate if rate > 0 else 0
            print(
                f"  [{done:,}/{total:,}] "
                f"fetched={fetched:,} failed={failed:,} "
                f"rate={rate:.1f}/s ETA={eta/60:.1f}min"
            )

    elapsed = time.time() - start_time
    print(f"\nDone in {elapsed/60:.1f} minutes.")
    print(f"Fetched subjects for {fetched:,} books, {failed:,} had no subjects.")

    # Stats
    with_subjects = conn.execute(
        "SELECT COUNT(*) FROM books WHERE subjects IS NOT NULL AND subjects != ''"
    ).fetchone()[0]
    print(f"Total books with subjects: {with_subjects:,}")
    conn.close()


if __name__ == "__main__":
    asyncio.run(main())
