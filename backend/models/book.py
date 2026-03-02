from sqlalchemy import Column, String, Text, Integer, Float, Boolean
from backend.database import Base


class Book(Base):
    __tablename__ = "books"

    book_id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    author = Column(String)
    description = Column(Text)
    genres = Column(String)  # canonical genre name
    publication_year = Column(Integer)
    isbn = Column(String)
    cover_img = Column(String)
    rating = Column(Float)
    num_ratings = Column(Integer)
    source = Column(String)
    open_library_key = Column(String)
    has_embedding = Column(Boolean, default=False)
