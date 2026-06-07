"""Generate embeddings for all books with descriptions.
Saves as float16 .npy files (~49MB for 70k books with 384-dim model).
"""
import numpy as np
import pandas as pd
from pathlib import Path
from sentence_transformers import SentenceTransformer

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
UNIFIED_CSV = DATA_DIR / "unified_books.csv"
EMBEDDINGS_PATH = DATA_DIR / "embeddings.npy"
BOOK_IDS_PATH = DATA_DIR / "book_ids.npy"

MODEL_NAME = "all-MiniLM-L6-v2"
BATCH_SIZE = 256


def main():
    print(f"Loading unified dataset from {UNIFIED_CSV}...")
    df = pd.read_csv(UNIFIED_CSV)
    print(f"Total books: {len(df)}")

    # Filter to books with descriptions worth embedding
    mask = df['has_embedding'] == True
    df_embed = df[mask].copy()
    print(f"Books to embed: {len(df_embed)}")

    book_ids = df_embed['book_id'].values.astype(str)
    descriptions = df_embed['description'].fillna('').values.tolist()
    titles = df_embed['title'].fillna('').values.tolist()
    authors = df_embed['author'].fillna('').values.tolist()
    genres = df_embed['genres'].fillna('').values.tolist()

    # Description-first format with genre tag for better semantic matching
    texts = [
        f"{d} | Genre: {g} | {t} by {a}"
        for d, g, t, a in zip(descriptions, genres, titles, authors)
    ]

    print(f"\nLoading model: {MODEL_NAME}...")
    model = SentenceTransformer(MODEL_NAME)

    print(f"Encoding {len(texts)} texts (batch_size={BATCH_SIZE})...")
    embeddings = model.encode(
        texts,
        batch_size=BATCH_SIZE,
        show_progress_bar=True,
        normalize_embeddings=True,  # L2-normalize so dot product = cosine similarity
    )

    print(f"Embedding shape: {embeddings.shape}")  # (N, 384)
    print(f"Embedding dtype: {embeddings.dtype}")

    # Save as float16 for 50% disk savings
    embeddings_f16 = embeddings.astype(np.float16)

    np.save(EMBEDDINGS_PATH, embeddings_f16)
    np.save(BOOK_IDS_PATH, book_ids)

    print(f"\nSaved embeddings: {EMBEDDINGS_PATH} ({EMBEDDINGS_PATH.stat().st_size / 1e6:.1f}MB)")
    print(f"Saved book IDs: {BOOK_IDS_PATH} ({BOOK_IDS_PATH.stat().st_size / 1e6:.1f}MB)")

    # Quick sanity check: similar books should have high similarity
    idx0, idx1 = 0, 1
    sim = np.dot(embeddings[idx0], embeddings[idx1])
    print(f"\nSanity check: similarity between '{titles[idx0]}' and '{titles[idx1]}': {sim:.4f}")


if __name__ == '__main__':
    main()
