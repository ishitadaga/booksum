# BookSum backend — FastAPI + precomputed embeddings, for Fly.io.
# The writable DB lives on a Fly volume at /data (see entrypoint.sh); the
# read-only embeddings ship inside the image.
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PYTHONPATH=/app \
    HF_HUB_DISABLE_TELEMETRY=1

WORKDIR /app

# libgomp1 is required by torch at runtime.
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# CPU-only torch first (the default wheel bundles CUDA and is multi-GB), then
# the rest of the deps against the already-satisfied torch.
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --index-url https://download.pytorch.org/whl/cpu torch \
    && pip install -r backend/requirements.txt

# Bundle the embedding model at build time so the first Open Library embed
# doesn't fetch ~130MB at runtime.
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('BAAI/bge-small-en-v1.5')"

# App code + read-only data (embeddings.npy, book_ids.npy). unified_books.csv
# and the venvs/frontend are excluded via .dockerignore.
COPY backend backend

# Keep a pristine seed DB, then drop the in-image copy — the live DB is served
# from the Railway volume at /data, seeded from /seed on first boot.
RUN mkdir -p /seed && cp backend/data/booksum.db /seed/booksum.db && rm backend/data/booksum.db

COPY entrypoint.sh entrypoint.sh
RUN chmod +x entrypoint.sh

EXPOSE 8000
CMD ["./entrypoint.sh"]
