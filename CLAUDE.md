# BookSum — Project Guide

## What is this?
A social media platform for book readers with an interactive similarity graph and Spotify-like playlists. Built on 65k+ books from Best Books Ever + CMU Book Summary Corpus.

## Tech Stack
- **Backend**: FastAPI (Python 3.12) + SQLite + sentence-transformers
- **Frontend**: Next.js 15 + React 19 + Tailwind CSS + Cytoscape.js
- **Embeddings**: all-MiniLM-L6-v2 model, stored as float16 NumPy arrays

## How to Run
```bash
# Backend (port 8000)
cd /Users/ishitadaga/Downloads/booksum
PYTHONPATH=. backend_env/bin/python -m uvicorn backend.main:app --port 8000

# Frontend (port 3001 — port 3000 is used by another app)
cd /Users/ishitadaga/Downloads/booksum/frontend
npx next dev --port 3001
```

## Key Directories
- `backend/` — FastAPI app (models, schemas, routers, services, scripts, data)
- `frontend/src/` — Next.js app (app/, components/, hooks/, lib/, context/)
- `backend/data/` — Runtime data (booksum.db, embeddings.npy, book_ids.npy, unified_books.csv)
- `backend/scripts/` — One-time data pipeline scripts

## Virtual Environments
- `backend_env/` — Python venv for backend (has all deps including greenlet, bcrypt==4.0.1)
- `venv/` — Older Python venv (from notebooks)

## Data Pipeline (already run, data exists in backend/data/)
1. `build_unified_dataset.py` → unified_books.csv (65,470 books)
2. `compute_embeddings.py` → embeddings.npy (49.2MB, 64,092 books) + book_ids.npy
3. `seed_db.py` → booksum.db (110.5MB)

## Important Notes
- CORS is configured for ports 3000 and 3001 (in `backend/config.py`)
- bcrypt must be pinned to 4.0.1 (passlib compat issue with newer versions)
- greenlet is required for SQLAlchemy async
- Embeddings are L2-normalized — dot product = cosine similarity
- Backend loads ~103MB into RAM at startup (float16 → float32 cast)
- Full plan with phases and architecture: see `Plan.md`
