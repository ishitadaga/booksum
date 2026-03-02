"""Load and compute embeddings with all-MiniLM-L6-v2.
Manages in-memory float32 matrix, periodic flush to disk as float16.
"""
import numpy as np
from sentence_transformers import SentenceTransformer
from backend.config import EMBEDDINGS_PATH, BOOK_IDS_PATH, MODEL_NAME

# Module-level state (loaded once at startup)
model: SentenceTransformer | None = None
embeddings: np.ndarray | None = None  # float32 in memory
book_ids: np.ndarray | None = None
id_to_index: dict[str, int] = {}
_new_count = 0  # track unsaved additions


def load():
    """Load model and pre-computed embeddings. Called once at startup."""
    global model, embeddings, book_ids, id_to_index

    print("Loading sentence-transformer model...")
    model = SentenceTransformer(MODEL_NAME)

    if EMBEDDINGS_PATH.exists() and BOOK_IDS_PATH.exists():
        print("Loading pre-computed embeddings...")
        raw = np.load(str(EMBEDDINGS_PATH))
        embeddings = raw.astype(np.float32)  # cast float16 → float32 for computation
        book_ids = np.load(str(BOOK_IDS_PATH), allow_pickle=True)
        id_to_index = {bid: i for i, bid in enumerate(book_ids)}
        print(f"Loaded {len(book_ids)} embeddings, shape={embeddings.shape}")
    else:
        print("No pre-computed embeddings found. Starting with empty matrix.")
        embeddings = np.empty((0, 384), dtype=np.float32)
        book_ids = np.array([], dtype=str)
        id_to_index = {}


def get_embedding(book_id: str) -> np.ndarray | None:
    """Get embedding vector for a book ID."""
    idx = id_to_index.get(book_id)
    if idx is not None:
        return embeddings[idx]
    return None


def encode_text(text: str) -> np.ndarray:
    """Encode a single text and L2-normalize."""
    vec = model.encode(text, normalize_embeddings=True)
    return vec.astype(np.float32)


def add_embedding(book_id: str, text: str):
    """Encode text, add to in-memory matrix. Flush to disk periodically."""
    global embeddings, book_ids, _new_count

    if book_id in id_to_index:
        return  # already have it

    vec = encode_text(text)
    vec = vec.reshape(1, -1)

    embeddings = np.vstack([embeddings, vec])
    book_ids = np.append(book_ids, book_id)
    id_to_index[book_id] = len(book_ids) - 1
    _new_count += 1

    if _new_count >= 50:
        flush_to_disk()


def flush_to_disk():
    """Save current embeddings to disk as float16."""
    global _new_count
    if _new_count == 0:
        return
    np.save(str(EMBEDDINGS_PATH), embeddings.astype(np.float16))
    np.save(str(BOOK_IDS_PATH), book_ids)
    print(f"Flushed {_new_count} new embeddings to disk (total: {len(book_ids)})")
    _new_count = 0
