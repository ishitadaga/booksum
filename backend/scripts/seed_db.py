"""Populate SQLite books table from unified CSV."""
import sqlite3
import pandas as pd
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
UNIFIED_CSV = DATA_DIR / "unified_books.csv"
DB_PATH = DATA_DIR / "booksum.db"


def create_tables(conn: sqlite3.Connection):
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS books (
            book_id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            author TEXT,
            description TEXT,
            genres TEXT,
            publication_year INTEGER,
            isbn TEXT,
            cover_img TEXT,
            rating REAL,
            num_ratings INTEGER,
            source TEXT,
            open_library_key TEXT,
            has_embedding BOOLEAN DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            display_name TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS playlists (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES users(id),
            name TEXT NOT NULL,
            genre TEXT,
            description TEXT,
            is_public BOOLEAN DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS playlist_books (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            playlist_id INTEGER NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
            book_id TEXT NOT NULL REFERENCES books(book_id),
            position INTEGER DEFAULT 0,
            added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(playlist_id, book_id)
        );

        CREATE TABLE IF NOT EXISTS follows (
            follower_id INTEGER NOT NULL REFERENCES users(id),
            followed_id INTEGER NOT NULL REFERENCES users(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (follower_id, followed_id),
            CHECK (follower_id != followed_id)
        );

        CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);
        CREATE INDEX IF NOT EXISTS idx_books_author ON books(author);
        CREATE INDEX IF NOT EXISTS idx_playlists_user ON playlists(user_id);
        CREATE INDEX IF NOT EXISTS idx_playlist_books_playlist ON playlist_books(playlist_id);
        CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
        CREATE INDEX IF NOT EXISTS idx_follows_followed ON follows(followed_id);
    """)


def seed_books(conn: sqlite3.Connection):
    print(f"Loading {UNIFIED_CSV}...")
    df = pd.read_csv(UNIFIED_CSV)
    print(f"Total books to seed: {len(df)}")

    # Clean up NaN values
    df = df.fillna({
        'author': '', 'description': '', 'genres': 'Fiction',
        'isbn': '', 'cover_img': '', 'source': '',
    })
    df['publication_year'] = df['publication_year'].where(df['publication_year'].notna(), None)
    df['rating'] = df['rating'].where(df['rating'].notna(), None)
    df['num_ratings'] = df['num_ratings'].where(df['num_ratings'].notna(), None)

    cursor = conn.cursor()
    inserted = 0
    for _, row in df.iterrows():
        try:
            cursor.execute("""
                INSERT OR IGNORE INTO books
                (book_id, title, author, description, genres, publication_year,
                 isbn, cover_img, rating, num_ratings, source, has_embedding)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                row['book_id'], row['title'], row['author'], row['description'],
                row['genres'], row.get('publication_year'), row.get('isbn', ''),
                row.get('cover_img', ''), row.get('rating'), row.get('num_ratings'),
                row.get('source', ''), bool(row.get('has_embedding', False))
            ))
            inserted += 1
        except Exception as e:
            print(f"  Error inserting {row['title']}: {e}")

    conn.commit()
    print(f"Inserted {inserted} books")

    count = cursor.execute("SELECT COUNT(*) FROM books").fetchone()[0]
    print(f"Total books in DB: {count}")


def main():
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    # Remove old DB if exists for clean seed
    if DB_PATH.exists():
        DB_PATH.unlink()
        print(f"Removed old database: {DB_PATH}")

    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")

    print("Creating tables...")
    create_tables(conn)

    print("\nSeeding books...")
    seed_books(conn)

    conn.close()
    print(f"\nDatabase created: {DB_PATH} ({DB_PATH.stat().st_size / 1e6:.1f}MB)")


if __name__ == '__main__':
    main()
