"""Core similarity engine: cosine sim + author boost → graph response."""
import numpy as np
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.models.book import Book
from backend.services import embedding_service
from backend.schemas.graph import GraphNode, GraphEdge, GraphResponse


AUTHOR_BOOST_WEIGHT = 0.15
COSINE_WEIGHT = 1.0 - AUTHOR_BOOST_WEIGHT
PAIRWISE_EDGE_THRESHOLD = 0.25


async def get_similarity_graph(
    book_id: str,
    db: AsyncSession,
    top_n: int = 20,
    min_similarity: float = 0.3,
) -> GraphResponse | None:
    # Get center book from DB
    result = await db.execute(select(Book).where(Book.book_id == book_id))
    center_book = result.scalar_one_or_none()
    if not center_book:
        return None

    center_vec = embedding_service.get_embedding(book_id)
    if center_vec is None:
        return None

    # Compute cosine similarities (dot product since embeddings are L2-normalized)
    all_embeddings = embedding_service.embeddings
    all_ids = embedding_service.book_ids
    scores = all_embeddings @ center_vec  # shape: (N,)

    # Get author for boost
    center_author = (center_book.author or "").strip().lower()

    # Get top candidates (extra to allow filtering)
    k = min(top_n * 3, len(scores))
    top_indices = np.argpartition(scores, -k)[-k:]
    top_indices = top_indices[np.argsort(scores[top_indices])[::-1]]

    # Fetch book metadata for top candidates
    candidate_ids = [str(all_ids[i]) for i in top_indices if str(all_ids[i]) != book_id]
    if not candidate_ids:
        return GraphResponse(
            center_book=_book_to_node(center_book, 1.0, is_center=True),
            nodes=[], edges=[]
        )

    # Batch fetch book metadata
    result = await db.execute(select(Book).where(Book.book_id.in_(candidate_ids)))
    books_map = {b.book_id: b for b in result.scalars().all()}

    # Score with author boost
    scored_nodes = []
    for idx in top_indices:
        bid = str(all_ids[idx])
        if bid == book_id:
            continue
        book = books_map.get(bid)
        if not book:
            continue

        cosine_sim = float(scores[idx])
        author_match = 1.0 if (book.author or "").strip().lower() == center_author else 0.0
        final_sim = COSINE_WEIGHT * cosine_sim + AUTHOR_BOOST_WEIGHT * author_match

        if final_sim >= min_similarity:
            scored_nodes.append((book, final_sim))

    # Take top N
    scored_nodes.sort(key=lambda x: x[1], reverse=True)
    scored_nodes = scored_nodes[:top_n]

    # Build nodes
    nodes = [_book_to_node(book, sim) for book, sim in scored_nodes]

    # Build edges from center to each node
    edges = [
        GraphEdge(source=book_id, target=book.book_id, weight=round(sim, 4))
        for book, sim in scored_nodes
    ]

    # Compute pairwise edges among result nodes
    node_ids = [book.book_id for book, _ in scored_nodes]
    pairwise_edges = _compute_pairwise_edges(node_ids)
    edges.extend(pairwise_edges)

    return GraphResponse(
        center_book=_book_to_node(center_book, 1.0, is_center=True),
        nodes=nodes,
        edges=edges,
    )


def _book_to_node(book: Book, similarity: float, is_center: bool = False) -> GraphNode:
    return GraphNode(
        id=book.book_id,
        label=book.title,
        author=book.author,
        genre=book.genres,
        cover_img=book.cover_img,
        similarity=round(similarity, 4),
        is_center=is_center,
        description=(book.description or "")[:1000],
        rating=book.rating,
        publication_year=book.publication_year,
    )


def _compute_pairwise_edges(node_ids: list[str]) -> list[GraphEdge]:
    """Compute similarity between all pairs of result nodes."""
    edges = []
    if len(node_ids) < 2:
        return edges

    # Get embeddings for all nodes
    vecs = []
    valid_ids = []
    for nid in node_ids:
        vec = embedding_service.get_embedding(nid)
        if vec is not None:
            vecs.append(vec)
            valid_ids.append(nid)

    if len(vecs) < 2:
        return edges

    mat = np.stack(vecs)
    sims = mat @ mat.T

    for i in range(len(valid_ids)):
        for j in range(i + 1, len(valid_ids)):
            if sims[i, j] > PAIRWISE_EDGE_THRESHOLD:
                edges.append(GraphEdge(
                    source=valid_ids[i],
                    target=valid_ids[j],
                    weight=round(float(sims[i, j]), 4),
                ))

    return edges
