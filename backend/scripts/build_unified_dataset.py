"""Merge Best Books Ever (63k) + CMU corpus (16k) into unified CSV.
Normalizes genres to 10 canonical categories, deduplicates on title+author.
"""
import pandas as pd
import json
import re
import hashlib
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
BBE_PATH = BASE_DIR / "books_1.Best_Books_Ever.csv"
CMU_PATH = BASE_DIR / "booksummaries" / "booksummaries.txt"
OUTPUT_PATH = BASE_DIR / "backend" / "data" / "unified_books.csv"

# Map diverse genre labels → 10 canonical genres
GENRE_MAP = {
    # Fiction
    "fiction": "Fiction", "literary fiction": "Fiction", "novels": "Fiction",
    "classics": "Fiction", "classic": "Fiction", "contemporary": "Fiction",
    "adult fiction": "Fiction", "general fiction": "Fiction",
    "cultural": "Fiction", "literature": "Fiction", "comic book": "Fiction",
    "graphic novels": "Fiction", "graphic novels comics": "Fiction",
    "comics": "Fiction", "manga": "Fiction", "short stories": "Fiction",
    "poetry": "Fiction", "plays": "Fiction", "drama": "Fiction",
    "humor": "Fiction", "comedy": "Fiction", "humour": "Fiction",
    "humor and comedy": "Fiction", "satire": "Fiction",
    "childrens": "Fiction", "children": "Fiction", "children's literature": "Fiction",
    "young adult": "Fiction", "middle grade": "Fiction",
    "picture books": "Fiction", "chapter books": "Fiction",
    "adult": "Fiction", "audiobook": "Fiction", "book club": "Fiction",
    "novella": "Fiction", "novel": "Fiction",
    # Non-Fiction
    "nonfiction": "Non-Fiction", "non-fiction": "Non-Fiction",
    "reference": "Non-Fiction", "journalism": "Non-Fiction",
    "essays": "Non-Fiction", "writing": "Non-Fiction",
    "education": "Non-Fiction", "philosophy": "Non-Fiction",
    "sociology": "Non-Fiction", "anthropology": "Non-Fiction",
    "economics": "Non-Fiction", "politics": "Non-Fiction",
    "law": "Non-Fiction", "true crime": "Non-Fiction",
    "religion": "Non-Fiction", "spirituality": "Non-Fiction",
    "theology": "Non-Fiction", "christianity": "Non-Fiction",
    "islam": "Non-Fiction", "buddhism": "Non-Fiction",
    "food and drink": "Non-Fiction", "cookbooks": "Non-Fiction",
    "cooking": "Non-Fiction", "art": "Non-Fiction", "music": "Non-Fiction",
    "photography": "Non-Fiction", "design": "Non-Fiction",
    "sports": "Non-Fiction", "sports and games": "Non-Fiction",
    "travel": "Non-Fiction", "nature": "Non-Fiction",
    "environment": "Non-Fiction", "gardening": "Non-Fiction",
    "crafts": "Non-Fiction", "parenting": "Non-Fiction",
    "business": "Non-Fiction", "money": "Non-Fiction",
    "feminism": "Non-Fiction", "gender": "Non-Fiction",
    "lgbtq": "Non-Fiction", "race": "Non-Fiction",
    "social justice": "Non-Fiction", "cultural studies": "Non-Fiction",
    # Mystery/Thriller
    "mystery": "Mystery/Thriller", "thriller": "Mystery/Thriller",
    "mystery thriller": "Mystery/Thriller",
    "crime": "Mystery/Thriller", "crime fiction": "Mystery/Thriller",
    "suspense": "Mystery/Thriller", "detective": "Mystery/Thriller",
    "noir": "Mystery/Thriller", "espionage": "Mystery/Thriller",
    "spy thriller": "Mystery/Thriller",
    # Science Fiction
    "science fiction": "Science Fiction", "sci-fi": "Science Fiction",
    "scifi": "Science Fiction", "cyberpunk": "Science Fiction",
    "dystopia": "Science Fiction", "dystopian": "Science Fiction",
    "utopian and dystopian fiction": "Science Fiction",
    "apocalyptic": "Science Fiction", "post apocalyptic": "Science Fiction",
    "space": "Science Fiction", "space opera": "Science Fiction",
    "time travel": "Science Fiction", "aliens": "Science Fiction",
    "speculative fiction": "Science Fiction", "steampunk": "Science Fiction",
    "alternate history": "Science Fiction",
    # Fantasy
    "fantasy": "Fantasy", "high fantasy": "Fantasy", "epic fantasy": "Fantasy",
    "urban fantasy": "Fantasy", "dark fantasy": "Fantasy",
    "paranormal": "Fantasy", "paranormal romance": "Fantasy",
    "magic": "Fantasy", "supernatural": "Fantasy", "fairy tales": "Fantasy",
    "mythology": "Fantasy", "vampires": "Fantasy", "werewolves": "Fantasy",
    "witches": "Fantasy", "dragons": "Fantasy", "shapeshifters": "Fantasy",
    "fairies": "Fantasy", "angels": "Fantasy", "demons": "Fantasy",
    "zombies": "Fantasy", "ghosts": "Fantasy", "mermaids": "Fantasy",
    # Romance
    "romance": "Romance", "love": "Romance",
    "contemporary romance": "Romance", "historical romance": "Romance",
    "romantic": "Romance", "chick lit": "Romance",
    "new adult": "Romance", "erotica": "Romance",
    # Biography
    "biography": "Biography", "memoir": "Biography",
    "autobiography": "Biography", "biographies": "Biography",
    "biography memoir": "Biography", "memoir biography": "Biography",
    "diary": "Biography", "personal narratives": "Biography",
    # History
    "history": "History", "historical": "History",
    "historical fiction": "History", "world war ii": "History",
    "world war i": "History", "war": "History", "military": "History",
    "military fiction": "History", "medieval": "History",
    "american history": "History", "european history": "History",
    "ancient history": "History", "world history": "History",
    # Science
    "science": "Science", "technology": "Science",
    "mathematics": "Science", "physics": "Science",
    "biology": "Science", "chemistry": "Science",
    "astronomy": "Science", "computer science": "Science",
    "medical": "Science", "medicine": "Science",
    "neuroscience": "Science", "psychology": "Science",
    "evolution": "Science", "genetics": "Science",
    "ecology": "Science", "popular science": "Science",
    "science and math": "Science",
    # Self-Help
    "self help": "Self-Help", "self-help": "Self-Help",
    "personal development": "Self-Help", "productivity": "Self-Help",
    "motivational": "Self-Help", "inspirational": "Self-Help",
    "leadership": "Self-Help", "management": "Self-Help",
    "health": "Self-Help", "wellness": "Self-Help",
    "fitness": "Self-Help", "mental health": "Self-Help",
    "mindfulness": "Self-Help", "meditation": "Self-Help",
    "relationships": "Self-Help",
}


def normalize_genre(raw_genres: list[str]) -> str:
    """Map a list of raw genre strings to the best canonical genre."""
    if not raw_genres:
        return "Fiction"

    # Count votes for each canonical genre
    votes: dict[str, int] = {}
    for g in raw_genres:
        key = g.strip().lower().replace("'", "").replace('"', '')
        canonical = GENRE_MAP.get(key)
        if canonical:
            votes[canonical] = votes.get(canonical, 0) + 1

    if votes:
        return max(votes, key=votes.get)
    return "Fiction"  # default fallback


def make_book_id(title: str, author: str) -> str:
    """Deterministic book ID from normalized title + author."""
    norm = f"{title.strip().lower()}|{author.strip().lower()}"
    return hashlib.md5(norm.encode()).hexdigest()[:12]


def dedup_key(title: str, author: str) -> str:
    """Normalize title+author for deduplication."""
    t = re.sub(r'[^\w\s]', '', title.strip().lower())
    a = re.sub(r'[^\w\s]', '', author.strip().lower())
    # Remove common suffixes like "(Illustrator)"
    a = re.sub(r'\s*\(.*?\)', '', a).strip()
    # Take first author if multiple
    a = a.split(',')[0].strip()
    return f"{t}|{a}"


def parse_bbe_genres(genres_str: str) -> list[str]:
    """Parse BBE genres field like "['Young Adult', 'Fiction', 'Dystopia']"."""
    if pd.isna(genres_str) or not genres_str.strip():
        return []
    try:
        return eval(genres_str)
    except:
        return [g.strip().strip("'\"") for g in genres_str.strip("[]").split(",")]


def parse_cmu_genres(genres_json: str) -> list[str]:
    """Parse CMU genres field like '{"/m/016lj8": "Roman à clef", ...}'."""
    if pd.isna(genres_json) or not genres_json.strip():
        return []
    try:
        d = json.loads(genres_json)
        return list(d.values())
    except:
        return []


def load_bbe() -> pd.DataFrame:
    print("Loading Best Books Ever dataset...")
    df = pd.read_csv(BBE_PATH, on_bad_lines='skip')
    print(f"  Raw BBE rows: {len(df)}")

    records = []
    for _, row in df.iterrows():
        title = str(row.get('title', '')).strip()
        author = str(row.get('author', '')).strip()
        if not title or title == 'nan' or not author or author == 'nan':
            continue

        raw_genres = parse_bbe_genres(str(row.get('genres', '')))
        genre = normalize_genre(raw_genres)
        desc = str(row.get('description', '')).strip()
        if desc == 'nan':
            desc = ''

        # Clean rating
        rating = row.get('rating')
        try:
            rating = float(rating)
        except:
            rating = None

        num_ratings = row.get('numRatings')
        try:
            num_ratings = int(float(num_ratings))
        except:
            num_ratings = None

        # Publication year from firstPublishDate
        pub_year = None
        fpd = str(row.get('firstPublishDate', ''))
        if fpd and fpd != 'nan':
            year_match = re.search(r'\b(1[5-9]\d{2}|20[0-2]\d)\b', fpd)
            if year_match:
                pub_year = int(year_match.group())

        isbn = str(row.get('isbn', '')).strip()
        if isbn == 'nan':
            isbn = ''

        cover_img = str(row.get('coverImg', '')).strip()
        if cover_img == 'nan':
            cover_img = ''

        records.append({
            'title': title,
            'author': author.split(',')[0].strip(),  # primary author
            'description': desc,
            'genres': genre,
            'publication_year': pub_year,
            'isbn': isbn,
            'cover_img': cover_img,
            'rating': rating,
            'num_ratings': num_ratings,
            'source': 'bbe',
        })

    result = pd.DataFrame(records)
    print(f"  Valid BBE records: {len(result)}")
    return result


def load_cmu() -> pd.DataFrame:
    print("Loading CMU Book Summary Corpus...")
    cols = ['wiki_id', 'freebase_id', 'title', 'author', 'pub_date', 'genres', 'summary']
    df = pd.read_csv(CMU_PATH, sep='\t', header=None, names=cols, on_bad_lines='skip')
    print(f"  Raw CMU rows: {len(df)}")

    records = []
    for _, row in df.iterrows():
        title = str(row.get('title', '')).strip()
        author = str(row.get('author', '')).strip()
        if not title or title == 'nan':
            continue
        if not author or author == 'nan':
            author = 'Unknown'

        raw_genres = parse_cmu_genres(str(row.get('genres', '')))
        genre = normalize_genre(raw_genres)
        desc = str(row.get('summary', '')).strip()
        if desc == 'nan':
            desc = ''

        pub_year = None
        pd_str = str(row.get('pub_date', ''))
        if pd_str and pd_str != 'nan':
            year_match = re.search(r'\b(1[5-9]\d{2}|20[0-2]\d)\b', pd_str)
            if year_match:
                pub_year = int(year_match.group())

        records.append({
            'title': title,
            'author': author,
            'description': desc,
            'genres': genre,
            'publication_year': pub_year,
            'isbn': '',
            'cover_img': '',
            'rating': None,
            'num_ratings': None,
            'source': 'cmu',
        })

    result = pd.DataFrame(records)
    print(f"  Valid CMU records: {len(result)}")
    return result


def main():
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    bbe = load_bbe()
    cmu = load_cmu()

    # Combine with BBE taking priority (has richer metadata)
    combined = pd.concat([bbe, cmu], ignore_index=True)
    print(f"\nCombined rows before dedup: {len(combined)}")

    # Deduplicate: keep first occurrence (BBE comes first = higher priority)
    combined['_dedup_key'] = combined.apply(
        lambda r: dedup_key(str(r['title']), str(r['author'])), axis=1
    )
    combined = combined.drop_duplicates(subset='_dedup_key', keep='first')
    combined = combined.drop(columns=['_dedup_key'])

    # Generate book IDs
    combined['book_id'] = combined.apply(
        lambda r: make_book_id(str(r['title']), str(r['author'])), axis=1
    )

    # Handle any ID collisions
    combined = combined.drop_duplicates(subset='book_id', keep='first')

    # Filter: must have description for embeddings to be useful
    has_desc = combined['description'].str.len() > 10
    print(f"Books with meaningful descriptions: {has_desc.sum()}")
    # Keep all books in CSV but mark which have descriptions
    combined['has_embedding'] = has_desc

    # Reorder columns
    cols = ['book_id', 'title', 'author', 'description', 'genres',
            'publication_year', 'isbn', 'cover_img', 'rating',
            'num_ratings', 'source', 'has_embedding']
    combined = combined[cols]

    combined.to_csv(OUTPUT_PATH, index=False)
    print(f"\nSaved unified dataset: {OUTPUT_PATH}")
    print(f"Total books: {len(combined)}")
    print(f"With embeddings: {combined['has_embedding'].sum()}")
    print(f"\nGenre distribution:")
    print(combined['genres'].value_counts().to_string())


if __name__ == '__main__':
    main()
