from pydantic import BaseModel


class GraphNode(BaseModel):
    id: str
    label: str
    author: str | None = None
    genre: str | None = None
    cover_img: str | None = None
    similarity: float = 0.0
    is_center: bool = False
    description: str | None = None
    rating: float | None = None
    publication_year: int | None = None


class GraphEdge(BaseModel):
    source: str
    target: str
    weight: float


class GraphResponse(BaseModel):
    center_book: GraphNode
    nodes: list[GraphNode]
    edges: list[GraphEdge]
