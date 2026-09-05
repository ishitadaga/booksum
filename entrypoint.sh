#!/usr/bin/env bash
# Seed the Fly volume's DB on first boot, then start the API.
# DATABASE_URL should point at /data/booksum.db (the mounted volume) so user
# data survives redeploys; the seed copy lives in the image at /seed.
set -e

mkdir -p /data
if [ ! -f /data/booksum.db ]; then
  echo "First boot: seeding /data/booksum.db from image seed…"
  cp /seed/booksum.db /data/booksum.db
fi

exec uvicorn backend.main:app --host 0.0.0.0 --port "${PORT:-8000}"
