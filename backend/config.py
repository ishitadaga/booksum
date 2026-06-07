import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"

# Database
DATABASE_URL = os.environ.get("DATABASE_URL", f"sqlite+aiosqlite:///{DATA_DIR / 'booksum.db'}")

# Embeddings
EMBEDDINGS_PATH = DATA_DIR / "embeddings.npy"
BOOK_IDS_PATH = DATA_DIR / "book_ids.npy"
MODEL_NAME = "all-MiniLM-L6-v2"

# JWT
JWT_SECRET = os.environ.get("JWT_SECRET", "booksum-dev-secret-change-in-production")
if JWT_SECRET == "booksum-dev-secret-change-in-production" and os.environ.get("ENV") == "production":
    raise RuntimeError("JWT_SECRET must be set in production — do not use the default secret")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# Open Library
OPENLIBRARY_SEARCH_URL = "https://openlibrary.org/search.json"
OPENLIBRARY_WORKS_URL = "https://openlibrary.org/works"

# App
_default_origins = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001"
CORS_ORIGINS = [o.strip() for o in os.environ.get("CORS_ORIGINS", _default_origins).split(",")]
