# BookSum: Implementation Plan

## Context

BookSum is a social media platform for book readers. It combines two quality datasets — the CMU Book Summary Corpus (16,559 books with plot summaries) and "Best Books Ever" CSV (~63,700 books with rich metadata) — into a web application with two main features:

1. **Interactive ConnectedPapers-style similarity graph** for books
2. **Spotify-like book playlists** with social features

**Tech Stack**: Next.js frontend + FastAPI backend + Cytoscape.js for graphs + SQLite for metadata + float16 NumPy for embeddings

**Data Sources**: Best Books Ever + CMU Corpus only (Amazon-scraped data excluded). Open Library API as live fallback.

---

## Project Structure

```
booksum/
├── booksummaries/                    # [EXISTING] CMU corpus
├── books_1.Best_Books_Ever.csv       # [EXISTING] 63k books
├── project/                          # [EXISTING] Notebooks + scraped data
├── backend/                          # FastAPI
│   ├── main.py                       # App entry, CORS, lifespan
│   ├── config.py                     # Paths, JWT secret, model name
│   ├── database.py                   # SQLAlchemy + SQLite
│   ├── requirements.txt
│   ├── models/                       # SQLAlchemy ORM (book, user, playlist, social)
│   ├── schemas/                      # Pydantic (book, user, playlist, social, graph)
│   ├── routers/                      # API routes (auth, books, graph, playlists, social)
│   ├── services/                     # Business logic
│   │   ├── book_service.py           # Hybrid search: SQLite + Open Library fallback
│   │   ├── embedding_service.py      # Load/compute embeddings with all-MiniLM-L6-v2
│   │   ├── similarity_service.py     # Core: cosine sim + author boost → graph response
│   │   ├── auth_service.py           # JWT + bcrypt
│   │   └── openlibrary_client.py     # Open Library API wrapper
│   ├── data/                         # Runtime data
│   │   ├── booksum.db                # SQLite (users, books, playlists, follows)
│   │   ├── unified_books.csv         # Merged dataset (BBE + CMU)
│   │   ├── embeddings.npy            # Pre-computed (N x 384) float16 (~49MB)
│   │   └── book_ids.npy              # Book ID index mapping
│   └── scripts/                      # One-time data pipeline
│       ├── build_unified_dataset.py  # Merge BBE + CMU → unified CSV
│       ├── compute_embeddings.py     # Generate all embeddings
│       └── seed_db.py                # Populate SQLite books table
├── frontend/                         # Next.js + Tailwind
│   └── src/
│       ├── app/                      # Pages: /, /graph, /playlists, /profile, /social, /login, /register
│       ├── components/               # BookSearchBar, SimilarityGraph, GraphControls, GenreLegend, PlaylistCard, BookDetailSidebar
│       ├── hooks/                    # useBookSearch, useGraph, usePlaylists
│       ├── lib/                      # api.ts, types.ts, constants.ts
│       └── context/                  # AuthContext.tsx
```

---

## Database Schema (SQLite)

```sql
books (book_id TEXT PK, title, author, description, genres, publication_year, isbn, cover_img, rating, num_ratings, source, open_library_key, has_embedding BOOL)
users (id INTEGER PK, username UNIQUE, email UNIQUE, password_hash, display_name, created_at)
playlists (id INTEGER PK, user_id FK, name, genre, description, is_public, created_at, updated_at)
playlist_books (id PK, playlist_id FK CASCADE, book_id FK, position, added_at, UNIQUE(playlist_id, book_id))
follows (follower_id FK, followed_id FK, created_at, PK(follower_id, followed_id), CHECK follower != followed)
```

---

## API Endpoints

| Router | Method | Path | Purpose | Auth |
|--------|--------|------|---------|------|
| Books | GET | `/api/books/search?q=&limit=20` | Hybrid search (SQLite first, Open Library fallback) | No |
| Books | GET | `/api/books/{book_id}` | Full book details | No |
| Graph | GET | `/api/graph/similarity?book_id=&top_n=20&min_similarity=0.3` | Returns nodes + edges for Cytoscape.js | No |
| Auth | POST | `/api/auth/register` | Create account | No |
| Auth | POST | `/api/auth/login` | Get JWT token | No |
| Auth | GET | `/api/auth/me` | Current user info | JWT |
| Playlists | POST | `/api/playlists` | Create playlist | JWT |
| Playlists | GET | `/api/playlists?user_id=&genre=` | List playlists | Optional |
| Playlists | GET/PUT/DELETE | `/api/playlists/{id}` | CRUD | JWT (owner) |
| Playlists | POST/DELETE | `/api/playlists/{id}/books` | Add/remove books | JWT (owner) |
| Social | POST/DELETE | `/api/social/follow/{user_id}` | Follow/unfollow | JWT |
| Social | GET | `/api/social/followers` / `following` | List connections | Optional |
| Social | GET | `/api/social/feed` | Recent playlists from followed users | JWT |
| Social | GET | `/api/social/users/search?q=` | Search users | No |

---

## Embedding Strategy

- **float16 NumPy files** — ~49MB on disk for 64k books
- At startup: cast to float32 in memory (~103MB) for computation accuracy
- Cosine similarity = dot product (embeddings are L2-normalized at save time)
- One query = matrix-vector multiply, <5ms for 64k books
- New Open Library books: encode on-the-fly, append to in-memory matrix, flush to disk every 50 new books

## Similarity Algorithm

1. Load embedding for query book_id
2. Dot product against all embeddings → raw cosine similarities
3. Author boost: `final_sim = 0.85 * cosine_sim + 0.15 * author_match`
4. Top-N above threshold → nodes
5. Pairwise similarities among result nodes → inter-node edges (threshold > 0.25)

## 10 Canonical Genres

| Genre | Color |
|-------|-------|
| Fiction | #4361ee |
| Non-Fiction | #3a86a8 |
| Mystery/Thriller | #7b2cbf |
| Science Fiction | #f72585 |
| Fantasy | #4cc9f0 |
| Romance | #ff6b6b |
| Biography | #fca311 |
| History | #8d6748 |
| Science | #2ec4b6 |
| Self-Help | #80b918 |

---

## Phase 1: MVP — Search + Similarity Graph (COMPLETE)

- [x] **1.1** Project scaffolding
- [x] **1.2** Data pipeline: `build_unified_dataset.py` — merged 65,470 books, 10 canonical genres
- [x] **1.3** Compute embeddings: 64,092 books encoded as float16 (49.2MB)
- [x] **1.4** Seed database: SQLite with all 65,470 books (110.5MB)
- [x] **1.5** Core backend: FastAPI + CORS + lifespan, config, database, ORM models, Pydantic schemas
- [x] **1.6** Book search endpoint: hybrid local + Open Library fallback
- [x] **1.7** Similarity engine: cosine sim + author boost → graph response
- [x] **1.8** Frontend foundation: layout, Navbar, API client, types, constants, auth context
- [x] **1.9** Landing page: hero section with debounced autocomplete BookSearchBar
- [x] **1.10** Graph page: Cytoscape.js with cose-bilkent layout, genre colors, hover tooltips, click sidebar, double-click re-center
- [x] **1.11** Auth: register/login endpoints, JWT, frontend auth context + pages

## Phase 2: Playlists + Social (COMPLETE)

- [x] **2.1** Playlist CRUD backend (create, list, get, update, delete, add/remove books)
- [x] **2.2** Playlist frontend: browse with genre filter, create form, playlist detail with book list, add from search
- [x] **2.3** Social backend: follow/unfollow, followers/following, feed, user search
- [x] **2.4** Social frontend: feed tab, discover people tab, follow/unfollow buttons
- [x] **2.5** Profile page: playlists, followers, following tabs

---

## How to Run

```bash
# Backend (from booksum/)
PYTHONPATH=. backend_env/bin/python -m uvicorn backend.main:app --port 8000

# Frontend (from booksum/frontend/)
npm run dev -- --port 3001
```

## Key Dependencies

**Backend**: fastapi, uvicorn, sqlalchemy, aiosqlite, python-jose, passlib, bcrypt==4.0.1, greenlet, sentence-transformers, numpy, pandas, httpx
**Frontend**: next 15, react 19, cytoscape, cytoscape-cose-bilkent, axios, tailwindcss
