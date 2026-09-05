"""Generate embeddings for all books with descriptions.
Saves as float16 .npy files (~49MB for 70k books with 384-dim model).

Now reads subjects from DB to enrich embedded text for better semantic matching.

Usage:
    PYTHONPATH=. backend_env/bin/python backend/scripts/compute_embeddings.py
"""
import sqlite3
import numpy as np
import pandas as pd
from pathlib import Path
from sentence_transformers import SentenceTransformer

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "booksum.db"
UNIFIED_CSV = DATA_DIR / "unified_books.csv"
EMBEDDINGS_PATH = DATA_DIR / "embeddings.npy"
BOOK_IDS_PATH = DATA_DIR / "book_ids.npy"

MODEL_NAME = "BAAI/bge-small-en-v1.5"
BATCH_SIZE = 64


def load_subjects() -> dict[str, str]:
    """Load subjects from DB (populated by fetch_subjects.py)."""
    if not DB_PATH.exists():
        return {}
    conn = sqlite3.connect(str(DB_PATH))
    # Check if subjects column exists
    cols = [c[1] for c in conn.execute("PRAGMA table_info(books)").fetchall()]
    if "subjects" not in cols:
        conn.close()
        return {}
    rows = conn.execute(
        "SELECT book_id, subjects FROM books WHERE subjects IS NOT NULL AND subjects != ''"
    ).fetchall()
    conn.close()
    return {bid: subj for bid, subj in rows}


def build_text(desc: str, genre: str, title: str, author: str, subjects: str) -> str:
    """Build the text to embed. Subjects are the key enrichment."""
    parts = [desc]
    if subjects:
        parts.append(f"Subjects: {subjects}")
    if genre:
        parts.append(f"Genre: {genre}")
    parts.append(f"{title} by {author}")
    return " | ".join(parts)


def main():
    print(f"Loading unified dataset from {UNIFIED_CSV}...")
    df = pd.read_csv(UNIFIED_CSV)
    print(f"Total books: {len(df)}")

    # Filter to books with descriptions worth embedding
    mask = df['has_embedding'] == True
    df_embed = df[mask].copy()
    print(f"Books to embed: {len(df_embed)}")

    # Load subjects from DB
    subjects_map = load_subjects()
    print(f"Books with subjects: {len(subjects_map)}")

    book_ids = df_embed['book_id'].values.astype(str)
    descriptions = df_embed['description'].fillna('').values.tolist()
    titles = df_embed['title'].fillna('').values.tolist()
    authors = df_embed['author'].fillna('').values.tolist()
    genres = df_embed['genres'].fillna('').values.tolist()

    # Build enriched texts
    texts = [
        build_text(d, g, t, a, subjects_map.get(bid, ""))
        for bid, d, g, t, a in zip(book_ids, descriptions, genres, titles, authors)
    ]

    # Show a sample
    sample_idx = next((i for i, bid in enumerate(book_ids) if subjects_map.get(bid)), 0)
    print(f"\nSample enriched text (book {book_ids[sample_idx]}):")
    print(f"  {texts[sample_idx][:300]}...")

    print(f"\nLoading model: {MODEL_NAME}...")
    device = "mps" if __import__("torch").backends.mps.is_available() else "cpu"
    print(f"Using device: {device}")
    model = SentenceTransformer(MODEL_NAME, device=device)

    print(f"Encoding {len(texts)} texts (batch_size={BATCH_SIZE})...")
    embeddings = model.encode(
        texts,
        batch_size=BATCH_SIZE,
        show_progress_bar=True,
        normalize_embeddings=True,  # L2-normalize so dot product = cosine similarity
    )

    print(f"Embedding shape: {embeddings.shape}")  # (N, 768)
    print(f"Embedding dtype: {embeddings.dtype}")

    # Save as float16 for 50% disk savings
    embeddings_f16 = embeddings.astype(np.float16)

    np.save(EMBEDDINGS_PATH, embeddings_f16)
    np.save(BOOK_IDS_PATH, book_ids)

    print(f"\nSaved embeddings: {EMBEDDINGS_PATH} ({EMBEDDINGS_PATH.stat().st_size / 1e6:.1f}MB)")
    print(f"Saved book IDs: {BOOK_IDS_PATH} ({BOOK_IDS_PATH.stat().st_size / 1e6:.1f}MB)")

    # Sanity check: Thinking Fast and Slow vs Black Swan
    tfas_idx = next((i for i, bid in enumerate(book_ids) if bid == "9b1dafbed67f"), None)
    bs_idx = next((i for i, bid in enumerate(book_ids) if bid == "51dc6c7cf330"), None)
    if tfas_idx is not None and bs_idx is not None:
        sim = np.dot(embeddings[tfas_idx], embeddings[bs_idx])
        print(f"\nSanity check: 'Thinking Fast and Slow' vs 'The Black Swan': {sim:.4f}")
    else:
        idx0, idx1 = 0, 1
        sim = np.dot(embeddings[idx0], embeddings[idx1])
        print(f"\nSanity check: similarity between '{titles[idx0]}' and '{titles[idx1]}': {sim:.4f}")


if __name__ == '__main__':
    main()
