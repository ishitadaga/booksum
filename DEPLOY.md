# Deploying BookSum

**Frontend → Vercel. Backend → Railway.** They talk over HTTPS; wire them with
two env vars (`NEXT_PUBLIC_API_URL` on Vercel, `CORS_ORIGINS` on Railway).

```
┌─────────────┐        ┌───────────────────────────────┐
│   Vercel    │ ─API─▶ │  Railway (Dockerfile)          │
│  frontend/  │        │  FastAPI + embeddings in image │
└─────────────┘        │  booksum.db on a /data volume  │
 NEXT_PUBLIC_API_URL    └───────────────────────────────┘
                          CORS_ORIGINS, JWT_SECRET, DATABASE_URL
```

---

## Backend on Railway

> **Why the CLI, not GitHub:** `booksum.db` is ~121MB and GitHub rejects files
> over 100MB. `railway up` uploads the local build context directly, so the DB
> and embeddings ride along without touching git.

### 1. Install + log in

```bash
npm i -g @railway/cli
railway login
```

### 2. Create the project (from the repo root)

```bash
cd /Users/ishitadaga/Downloads/booksum
railway init          # name it e.g. "booksum-api"
```

### 3. Add a persistent volume mounted at `/data`

In the Railway dashboard → your service → **Variables/Settings → Volumes** →
add a volume with **mount path `/data`**. This is where the writable
`booksum.db` lives so signups/playlists survive redeploys.

### 4. Set environment variables

Dashboard → **Variables**, or via CLI (`railway variables --set K=V`):

| Variable | Value |
|---|---|
| `DATABASE_URL` | `sqlite+aiosqlite:////data/booksum.db` (four slashes = absolute `/data/...`) |
| `JWT_SECRET` | a long random string — generate with `python3 -c "import secrets;print(secrets.token_urlsafe(48))"` |
| `ENV` | `production` |
| `CORS_ORIGINS` | your Vercel URL(s), comma-separated, e.g. `https://booksum.vercel.app` |

### 5. Deploy

```bash
railway up
```

First build is slow (~5–10 min: it installs CPU torch and bundles the embedding
model). The image is large (~1.5GB) — that's expected.

### 6. Get the URL + verify

```bash
railway domain        # creates/prints the public URL
```

Then check health (should return JSON with `embeddings_loaded: true`):

```bash
curl https://<your-railway-domain>/api/health
```

**Redeploys preserve the DB** — the volume copy is only seeded on first boot
(see `entrypoint.sh`). To reset to the shipped seed, delete the volume file and
redeploy.

---

## Frontend on Vercel

1. Vercel → **New Project** → import this repo → set **Root Directory** to
   `frontend/`.
2. Add env var **`NEXT_PUBLIC_API_URL`** = your Railway URL (e.g.
   `https://booksum-api.up.railway.app`).
3. Deploy. Vercel auto-detects Next.js.
4. Copy the resulting Vercel URL back into Railway's `CORS_ORIGINS` and redeploy
   the backend so the browser isn't blocked by CORS.

---

## Pre-flight (recommended)

`backend/data/*.db` and `*.npy` are gitignored. Railway's uploader uses
`.railwayignore` (which this repo provides) *instead of* `.gitignore`, so the DB
and embeddings do get uploaded. To confirm the image actually builds before
spending a Railway build, run it locally once (start Docker Desktop first):

```bash
cd /Users/ishitadaga/Downloads/booksum && docker build -t booksum-api .
```

If that succeeds, `railway up` will too.

## Notes

- **Model is lazy:** the backend loads only the precomputed embeddings at
  startup (fast, low RAM). The sentence-transformer model loads on the first
  Open Library embed. Give the Railway instance ≥1GB RAM to be safe if that
  feature is used.
- **Cost lever:** if you don't need Open Library books embedded live, you can
  drop `sentence-transformers`/`torch` from `backend/requirements.txt` entirely
  for a much smaller/cheaper backend — the graph runs on precomputed embeddings
  regardless.
