"""Core similarity engine: hybrid scoring (cosine + genre + author + era + popularity) → graph response."""
import math
import re
import numpy as np
from collections import defaultdict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.models.book import Book
from backend.services import embedding_service
from backend.schemas.graph import GraphNode, GraphEdge, GraphResponse


# --- Scoring weights ---
COSINE_WEIGHT = 0.70
GENRE_WEIGHT = 0.15
AUTHOR_WEIGHT = 0.05
ERA_WEIGHT = 0.05
POPULARITY_WEIGHT = 0.05

# --- Diversity ---
MAX_PER_AUTHOR = 3
PAIRWISE_EDGE_THRESHOLD = 0.5

# --- Genre adjacency map ---
# Same genre = 1.0, related genres = 0.5, unrelated = 0.0
GENRE_ADJACENCY: dict[tuple[str, str], float] = {}

_RELATED_PAIRS = [
    ("Fiction", "Mystery/Thriller"),
    ("Fiction", "Romance"),
    ("Fiction", "Fantasy"),
    ("Fiction", "Science Fiction"),
    ("Science Fiction", "Fantasy"),
    ("Science Fiction", "Science"),
    ("Mystery/Thriller", "Romance"),
    ("Non-Fiction", "Biography"),
    ("Non-Fiction", "History"),
    ("Non-Fiction", "Science"),
    ("Non-Fiction", "Self-Help"),
    ("Biography", "History"),
    ("History", "Science"),
]

for a, b in _RELATED_PAIRS:
    GENRE_ADJACENCY[(a, b)] = 0.5
    GENRE_ADJACENCY[(b, a)] = 0.5


def _normalize_title(title: str) -> str:
    t = title.lower().strip()
    t = re.sub(r"\(.*?\)", "", t)
    t = re.sub(r"[^a-z0-9\s]", "", t)
    return re.sub(r"\s+", " ", t).strip()


def _dedup_key(author: str | None, title: str) -> str:
    a = (author or "unknown").strip().lower()
    a = re.sub(r"\s+", " ", a)
    return f"{a}||{_normalize_title(title)}"


def _genre_adjacency_score(genre_a: str | None, genre_b: str | None) -> float:
    if not genre_a or not genre_b:
        return 0.0
    if genre_a == genre_b:
        return 1.0
    return GENRE_ADJACENCY.get((genre_a, genre_b), 0.0)


def _era_match(year_a: int | None, year_b: int | None) -> float:
    if year_a is None or year_b is None:
        return 0.0
    return 1.0 - min(abs(year_a - year_b) / 50.0, 1.0)


def _popularity_match(ratings_a: int | None, ratings_b: int | None) -> float:
    if not ratings_a or not ratings_b or ratings_a <= 0 or ratings_b <= 0:
        return 0.0
    return 1.0 - min(abs(math.log(ratings_a) - math.log(ratings_b)) / 5.0, 1.0)


async def get_similarity_graph(
    book_id: str,
    db: AsyncSession,
    top_n: int = 20,
    min_similarity: float = 0.2,
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
    cosine_scores = all_embeddings @ center_vec  # shape: (N,)

    # Get center book metadata for scoring
    center_author = (center_book.author or "").strip().lower()
    center_genre = center_book.genres
    center_year = center_book.publication_year
    center_ratings = center_book.num_ratings

    # Get top candidates (extra to allow for author cap filtering)
    k = min(top_n * 5, len(cosine_scores))
    top_indices = np.argpartition(cosine_scores, -k)[-k:]
    top_indices = top_indices[np.argsort(cosine_scores[top_indices])[::-1]]

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

    # Hybrid scoring with author diversity cap and dedup
    scored_nodes = []
    author_counts: dict[str, int] = defaultdict(int)
    seen_titles: set[str] = set()
    center_key = _dedup_key(center_book.author, center_book.title)
    seen_titles.add(center_key)

    for idx in top_indices:
        bid = str(all_ids[idx])
        if bid == book_id:
            continue
        book = books_map.get(bid)
        if not book:
            continue

        # Deduplicate: skip books with same normalized (author, title)
        dk = _dedup_key(book.author, book.title)
        if dk in seen_titles:
            continue

        # Author diversity cap
        book_author = (book.author or "").strip().lower()
        if author_counts[book_author] >= MAX_PER_AUTHOR:
            continue

        cosine_sim = float(cosine_scores[idx])
        author_match = 1.0 if book_author == center_author else 0.0
        genre_score = _genre_adjacency_score(center_genre, book.genres)
        era_score = _era_match(center_year, book.publication_year)
        pop_score = _popularity_match(center_ratings, book.num_ratings)

        final_sim = (
            COSINE_WEIGHT * cosine_sim
            + GENRE_WEIGHT * genre_score
            + AUTHOR_WEIGHT * author_match
            + ERA_WEIGHT * era_score
            + POPULARITY_WEIGHT * pop_score
        )

        if final_sim >= min_similarity:
            scored_nodes.append((book, final_sim))
            author_counts[book_author] += 1
            seen_titles.add(dk)

        if len(scored_nodes) >= top_n:
            break

    # Sort by final similarity
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


async def expand_node_graph(
    book_id: str,
    existing_ids: list[str],
    db: AsyncSession,
    top_n: int = 10,
    min_similarity: float = 0.2,
) -> GraphResponse | None:
    """Expand the graph from a node: find new similar books excluding existing ones."""
    # Get the book to expand from
    result = await db.execute(select(Book).where(Book.book_id == book_id))
    expand_book = result.scalar_one_or_none()
    if not expand_book:
        return None

    expand_vec = embedding_service.get_embedding(book_id)
    if expand_vec is None:
        return None

    # Compute cosine similarities
    all_embeddings = embedding_service.embeddings
    all_ids = embedding_service.book_ids
    cosine_scores = all_embeddings @ expand_vec

    # Metadata for hybrid scoring
    center_author = (expand_book.author or "").strip().lower()
    center_genre = expand_book.genres
    center_year = expand_book.publication_year
    center_ratings = expand_book.num_ratings

    existing_set = set(existing_ids)

    # Get top candidates (extra to allow filtering)
    k = min(top_n * 5, len(cosine_scores))
    top_indices = np.argpartition(cosine_scores, -k)[-k:]
    top_indices = top_indices[np.argsort(cosine_scores[top_indices])[::-1]]

    # Filter out existing IDs and the expand book itself
    candidate_ids = [
        str(all_ids[i]) for i in top_indices
        if str(all_ids[i]) != book_id and str(all_ids[i]) not in existing_set
    ]
    if not candidate_ids:
        return GraphResponse(
            center_book=_book_to_node(expand_book, 1.0, is_center=False),
            nodes=[], edges=[]
        )

    # Batch fetch metadata
    result = await db.execute(select(Book).where(Book.book_id.in_(candidate_ids)))
    books_map = {b.book_id: b for b in result.scalars().all()}

    # Hybrid scoring with author diversity cap and dedup
    scored_nodes = []
    author_counts: dict[str, int] = defaultdict(int)
    seen_titles: set[str] = set()
    seen_titles.add(_dedup_key(expand_book.author, expand_book.title))

    # Also mark existing graph books as seen to avoid adding duplicates of them
    existing_books_result = await db.execute(select(Book).where(Book.book_id.in_(list(existing_set))))
    for eb in existing_books_result.scalars().all():
        seen_titles.add(_dedup_key(eb.author, eb.title))

    for idx in top_indices:
        bid = str(all_ids[idx])
        if bid == book_id or bid in existing_set:
            continue
        book = books_map.get(bid)
        if not book:
            continue

        # Deduplicate: skip books with same normalized (author, title)
        dk = _dedup_key(book.author, book.title)
        if dk in seen_titles:
            continue

        book_author = (book.author or "").strip().lower()
        if author_counts[book_author] >= MAX_PER_AUTHOR:
            continue

        cosine_sim = float(cosine_scores[idx])
        author_match = 1.0 if book_author == center_author else 0.0
        genre_score = _genre_adjacency_score(center_genre, book.genres)
        era_score = _era_match(center_year, book.publication_year)
        pop_score = _popularity_match(center_ratings, book.num_ratings)

        final_sim = (
            COSINE_WEIGHT * cosine_sim
            + GENRE_WEIGHT * genre_score
            + AUTHOR_WEIGHT * author_match
            + ERA_WEIGHT * era_score
            + POPULARITY_WEIGHT * pop_score
        )

        if final_sim >= min_similarity:
            scored_nodes.append((book, final_sim))
            author_counts[book_author] += 1
            seen_titles.add(dk)

        if len(scored_nodes) >= top_n:
            break

    scored_nodes.sort(key=lambda x: x[1], reverse=True)
    scored_nodes = scored_nodes[:top_n]

    # Build new nodes
    nodes = [_book_to_node(book, sim) for book, sim in scored_nodes]

    # Edges from expand book to each new node
    edges = [
        GraphEdge(source=book_id, target=book.book_id, weight=round(sim, 4))
        for book, sim in scored_nodes
    ]

    # Pairwise edges among new nodes
    new_ids = [book.book_id for book, _ in scored_nodes]
    edges.extend(_compute_pairwise_edges(new_ids))

    # Cross-edges between new nodes and existing nodes
    edges.extend(_compute_cross_edges(new_ids, list(existing_set)))

    return GraphResponse(
        center_book=_book_to_node(expand_book, 1.0, is_center=False),
        nodes=nodes,
        edges=edges,
    )


def _compute_cross_edges(new_ids: list[str], existing_ids: list[str]) -> list[GraphEdge]:
    """Compute cosine similarity between new and existing node embeddings, return edges above threshold."""
    edges = []
    if not new_ids or not existing_ids:
        return edges

    new_vecs = []
    valid_new = []
    for nid in new_ids:
        vec = embedding_service.get_embedding(nid)
        if vec is not None:
            new_vecs.append(vec)
            valid_new.append(nid)

    existing_vecs = []
    valid_existing = []
    for eid in existing_ids:
        vec = embedding_service.get_embedding(eid)
        if vec is not None:
            existing_vecs.append(vec)
            valid_existing.append(eid)

    if not new_vecs or not existing_vecs:
        return edges

    new_mat = np.stack(new_vecs)
    existing_mat = np.stack(existing_vecs)
    sims = new_mat @ existing_mat.T  # shape: (len(new), len(existing))

    for i in range(len(valid_new)):
        for j in range(len(valid_existing)):
            if sims[i, j] > PAIRWISE_EDGE_THRESHOLD:
                edges.append(GraphEdge(
                    source=valid_new[i],
                    target=valid_existing[j],
                    weight=round(float(sims[i, j]), 4),
                ))

    return edges


def _compute_pairwise_edges(node_ids: list[str]) -> list[GraphEdge]:
    """Compute similarity between all pairs of result nodes."""
    edges = []
    if len(node_ids) < 2:
        return edges

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
