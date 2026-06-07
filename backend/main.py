from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from backend.config import CORS_ORIGINS
from backend.services import embedding_service
from backend.routers import auth_router, books_router, graph_router, playlists_router, social_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: load model + embeddings
    embedding_service.load()
    yield
    # Shutdown: flush any unsaved embeddings
    embedding_service.flush_to_disk()


limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="BookSum API", version="1.0.0", lifespan=lifespan)
app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(status_code=429, content={"detail": "Too many requests — try again later"})

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(books_router)
app.include_router(graph_router)
app.include_router(playlists_router)
app.include_router(social_router)


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "embeddings_loaded": embedding_service.embeddings is not None,
        "num_embeddings": len(embedding_service.book_ids) if embedding_service.book_ids is not None else 0,
    }
