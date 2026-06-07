from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.schemas.graph import GraphResponse
from backend.services import similarity_service

router = APIRouter(prefix="/api/graph", tags=["graph"])


@router.get("/similarity", response_model=GraphResponse)
async def get_similarity_graph(
    book_id: str = Query(...),
    top_n: int = Query(20, ge=1, le=50),
    min_similarity: float = Query(0.2, ge=0.0, le=1.0),
    db: AsyncSession = Depends(get_db),
):
    result = await similarity_service.get_similarity_graph(
        book_id, db, top_n=top_n, min_similarity=min_similarity,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Book not found or no embedding available")
    return result


@router.get("/similarity/expand", response_model=GraphResponse)
async def expand_similarity_graph(
    book_id: str = Query(..., description="Node to expand from"),
    existing_ids: str = Query("", description="Comma-separated IDs already in graph"),
    top_n: int = Query(10, ge=1, le=50),
    min_similarity: float = Query(0.2, ge=0.0, le=1.0),
    db: AsyncSession = Depends(get_db),
):
    parsed_ids = [eid.strip() for eid in existing_ids.split(",") if eid.strip()] if existing_ids else []
    result = await similarity_service.expand_node_graph(
        book_id, parsed_ids, db, top_n=top_n, min_similarity=min_similarity,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Book not found or no embedding available")
    return result
