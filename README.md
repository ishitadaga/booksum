# BookSum

A social media platform for book readers. Search any book, explore an interactive similarity graph, create Spotify-like playlists, and follow friends.

Built on 65,000+ books from the CMU Book Summary Corpus and the Best Books Ever dataset.

---

## Pipeline Flow

```
Raw Data                    Data Pipeline                  Runtime
─────────                   ─────────────                  ───────

books_1.Best_Books_Ever.csv ─┐
                             ├─► build_unified_dataset.py ─► unified_books.csv (65k books)
booksummaries/booksummaries.txt ─┘                              │
                                                                ├─► compute_embeddings.py ─► embeddings.npy + book_ids.npy
                                                                │
                                                                └─► seed_db.py ─► booksum.db (SQLite)

                                                                         │
                                                          ┌──────────────┘
                                                          ▼
                                                     FastAPI backend (loads embeddings + DB at startup)
                                                          │
                                                          ▼
                                                     Next.js frontend (calls API, renders graph)
```

**Step 1** — `build_unified_dataset.py` merges the two raw datasets, normalizes genres into 10 categories, deduplicates on title+author, and outputs a single CSV.

**Step 2** — `compute_embeddings.py` encodes all book descriptions using the `all-MiniLM-L6-v2` sentence-transformer, L2-normalizes them, and saves as float16 NumPy arrays (~49MB on disk).

**Step 3** — `seed_db.py` creates the SQLite database with all tables (books, users, playlists, follows) and inserts all books from the unified CSV.

**Step 4** — The FastAPI backend loads the embeddings into memory (cast to float32, ~103MB), and serves the API. The Next.js frontend provides the UI.

---

## Project Structure

### Raw Data (pre-existing)

| Path | What it is |
|------|-----------|
| `books_1.Best_Books_Ever.csv` | 52k books with ratings, covers, descriptions, genres from Goodreads |
| `booksummaries/booksummaries.txt` | 16k books with plot summaries from CMU corpus (tab-separated) |
| `project/` | Original Jupyter notebooks and scraped category CSVs (not used at runtime) |

### Backend (`backend/`)

| File/Folder | What it does |
|-------------|-------------|
| `main.py` | FastAPI app entry point. Sets up CORS, lifespan (loads embeddings on startup, flushes on shutdown), mounts all routers. |
| `config.py` | All configuration: database URL, file paths, JWT secret, model name, CORS origins. |
| `database.py` | SQLAlchemy async engine + session factory + `get_db` dependency for injecting DB sessions into routes. |
| `requirements.txt` | Python dependencies (fastapi, sqlalchemy, sentence-transformers, numpy, etc). |

#### `backend/models/` — SQLAlchemy ORM table definitions
| File | Table |
|------|-------|
| `book.py` | `books` — book_id, title, author, description, genres, rating, cover_img, etc. |
| `user.py` | `users` — id, username, email, password_hash, display_name |
| `playlist.py` | `playlists` + `playlist_books` — playlist metadata and junction table for books in a playlist |
| `social.py` | `follows` — follower_id/followed_id pairs |

#### `backend/schemas/` — Pydantic request/response models
| File | Schemas |
|------|---------|
| `book.py` | `BookOut`, `BookSearchResult` |
| `user.py` | `UserCreate`, `UserLogin`, `UserOut`, `TokenOut` |
| `playlist.py` | `PlaylistCreate`, `PlaylistUpdate`, `PlaylistOut`, `PlaylistDetailOut`, `PlaylistBookAdd` |
| `graph.py` | `GraphNode`, `GraphEdge`, `GraphResponse` |
| `social.py` | `FollowOut`, `FeedItem` |

#### `backend/routers/` — API endpoint handlers
| File | Endpoints |
|------|-----------|
| `auth.py` | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` |
| `books.py` | `GET /api/books/search?q=`, `GET /api/books/{book_id}` |
| `graph.py` | `GET /api/graph/similarity?book_id=&top_n=&min_similarity=` |
| `playlists.py` | CRUD for playlists + add/remove books |
| `social.py` | Follow/unfollow, followers/following lists, feed, user search |

#### `backend/services/` — Business logic
| File | What it does |
|------|-------------|
| `embedding_service.py` | Loads the sentence-transformer model and float16 embeddings at startup. Encodes new texts on-the-fly. Manages in-memory float32 matrix with periodic flush to disk. |
| `similarity_service.py` | Core algorithm: dot-product similarity search, author boost (85% cosine + 15% same-author), pairwise edges among results, returns graph nodes + edges. |
| `book_service.py` | Hybrid search: queries SQLite first (LIKE on title/author), falls back to Open Library API if not enough results. Inserts new books into DB. |
| `auth_service.py` | Password hashing (bcrypt), JWT token creation/verification, `get_current_user` dependency. |
| `openlibrary_client.py` | Async HTTP client for Open Library search + works API. Fetches descriptions, maps subjects to genres. |

#### `backend/scripts/` — One-time data pipeline (run once, data persists)
| File | What it does |
|------|-------------|
| `build_unified_dataset.py` | Merges BBE + CMU datasets, normalizes genres to 10 categories, deduplicates, outputs `unified_books.csv`. |
| `compute_embeddings.py` | Encodes all book descriptions with `all-MiniLM-L6-v2`, saves as float16 `.npy` files. |
| `seed_db.py` | Creates SQLite tables and inserts all books from the unified CSV. |

#### `backend/data/` — Runtime data files
| File | Size | What it is |
|------|------|-----------|
| `unified_books.csv` | ~80MB | Merged dataset of 65,470 books |
| `embeddings.npy` | ~49MB | Float16 embedding vectors (64,092 x 384) |
| `book_ids.npy` | ~3MB | Book ID array mapping row index to book_id |
| `booksum.db` | ~110MB | SQLite database with all tables |

### Frontend (`frontend/src/`)

#### `app/` — Next.js pages
| File | Page |
|------|------|
| `page.tsx` | `/` — Landing page with search bar and genre showcase |
| `graph/page.tsx` | `/graph?book_id=` — Similarity graph with Cytoscape.js |
| `login/page.tsx` | `/login` — Login form |
| `register/page.tsx` | `/register` — Registration form |
| `playlists/page.tsx` | `/playlists` — Browse/create playlists with genre filter |
| `playlists/[id]/page.tsx` | `/playlists/:id` — Playlist detail with book list |
| `social/page.tsx` | `/social` — Feed from followed users + discover people |
| `profile/page.tsx` | `/profile` — User's playlists, followers, following |
| `layout.tsx` | Root layout with Navbar and AuthProvider |
| `globals.css` | Tailwind imports + dark theme + custom scrollbar |

#### `components/` — Reusable UI components
| File | What it renders |
|------|----------------|
| `Navbar.tsx` | Top navigation bar with links and auth state |
| `BookSearchBar.tsx` | Debounced search input with autocomplete dropdown |
| `SimilarityGraph.tsx` | Cytoscape.js graph — nodes colored by genre, edges scaled by similarity, hover tooltips |
| `GraphControls.tsx` | Sliders for top_n and min_similarity, zoom buttons, reset layout |
| `GenreLegend.tsx` | Color legend for the 10 genres |
| `BookDetailSidebar.tsx` | Floating overlay showing book abstract, metadata, and action buttons |
| `PlaylistCard.tsx` | Playlist preview card with name, author, genre, book count |

#### `hooks/` — Custom React hooks
| File | What it does |
|------|-------------|
| `useBookSearch.ts` | Debounced search — updates results as user types |
| `useGraph.ts` | Fetches similarity graph data from API |
| `usePlaylists.ts` | CRUD operations for playlists |

#### `lib/` — Shared utilities
| File | What it contains |
|------|-----------------|
| `api.ts` | Axios client with JWT interceptor + all API call functions |
| `types.ts` | TypeScript interfaces (Book, GraphNode, GraphEdge, User, Playlist, etc.) |
| `constants.ts` | API URL, genre color map, genre list |

#### `context/`
| File | What it does |
|------|-------------|
| `AuthContext.tsx` | React context for auth state — stores JWT in localStorage, provides `setAuth`/`logout` |

---

## How to Run

```bash
# Backend (from booksum/)
PYTHONPATH=. backend_env/bin/python -m uvicorn backend.main:app --port 8000

# Frontend (from booksum/frontend/)
npx next dev --port 3001
```

Open http://localhost:3001 in your browser.

---

## Tech Stack

- **Backend**: Python 3.12, FastAPI, SQLAlchemy (async), SQLite, sentence-transformers
- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS, Cytoscape.js
- **Embeddings**: all-MiniLM-L6-v2 (384-dim), stored as float16 NumPy arrays
- **Auth**: JWT tokens + bcrypt password hashing
