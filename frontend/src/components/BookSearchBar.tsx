"use client";
import { useRef, useEffect, useState, useId } from "react";
import { useRouter } from "next/navigation";
import { useBookSearch } from "@/hooks/useBookSearch";
import styles from "./BookSearchBar.module.css";

interface Props {
  onSelect?: (bookId: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  size?: "sm" | "lg";
  variant?: "default" | "landing";
  examples?: string[];
}

export default function BookSearchBar({
  onSelect,
  placeholder = "Search for a book...",
  autoFocus = false,
  size = "lg",
  variant = "default",
  examples = [],
}: Props) {
  const { query, setQuery, results, loading, error, retry } = useBookSearch();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const id = useId();
  const popupId = `${id}-results`;
  const showPopup = open && query.trim().length >= 2;
  const showResults = showPopup && !loading && !error && results.length > 0;

  useEffect(() => {
    function handleClick(event: PointerEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", handleClick);
    return () => document.removeEventListener("pointerdown", handleClick);
  }, []);

  useEffect(() => {
    if (showResults && activeIndex >= 0) {
      document.getElementById(`${popupId}-${activeIndex}`)?.scrollIntoView({block: "nearest"});
    }
  }, [activeIndex, showResults, popupId]);

  function updateQuery(value: string) {
    setQuery(value);
    setActiveIndex(-1);
    setOpen(true);
  }

  function handleSelect(bookId: string) {
    setOpen(false);
    setQuery("");
    setActiveIndex(-1);
    if (onSelect) onSelect(bookId);
    else router.push(`/?book_id=${encodeURIComponent(bookId)}`);
  }

  return (
    <div
      ref={ref}
      className={`${styles.root} ${variant === "landing" ? styles.landing : ""} ${size === "sm" ? styles.small : ""}`}
      onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <div className={styles.field}>
        <svg className={styles.searchIcon} width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.6" />
          <path d="m16 16 4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <label htmlFor={id} className="sr-only">{placeholder}</label>
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showResults}
          aria-controls={showResults ? popupId : undefined}
          aria-activedescendant={showResults && activeIndex >= 0 && results[activeIndex] ? `${popupId}-${activeIndex}` : undefined}
          aria-describedby={`${id}-status`}
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={event => updateQuery(event.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={event => {
            if (event.nativeEvent.isComposing) return;
            if (event.key === "Escape") { setOpen(false); setActiveIndex(-1); }
            if ((event.key === "ArrowDown" || event.key === "ArrowUp") && results.length && !loading && !error) {
              event.preventDefault();
              setOpen(true);
              setActiveIndex(index => event.key === "ArrowDown" ? Math.min(index + 1, results.length - 1) : index < 0 ? results.length - 1 : Math.max(0, index - 1));
            }
            if (event.key === "Enter") {
              event.preventDefault();
              if (showResults && activeIndex >= 0 && results[activeIndex]) handleSelect(results[activeIndex].book_id);
              else { setOpen(true); if (!loading && !error && results.length) setActiveIndex(0); }
            }
          }}
          placeholder={placeholder}
          autoFocus={autoFocus}
        />
        {query && <button
          type="button"
          className={styles.clear}
          aria-label="Clear search"
          onClick={() => { updateQuery(""); inputRef.current?.focus(); }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
        </button>}
      </div>

      <p id={`${id}-status`} role="status" className="sr-only">
        {showPopup ? loading ? "Searching books." : error || (results.length ? `${results.length} books found. Use the up and down arrow keys, then Enter to choose a book.` : "No books found. Try another title or author.") : ""}
      </p>

      {showPopup && (
        <div className={styles.popup}>
          {loading ? (
            <div className={styles.message}><span className={styles.spinner} aria-hidden="true" /><span>Searching the library…</span></div>
          ) : error ? (
            <div className={styles.message}><div><p>{error}</p><button type="button" className={styles.retry} onClick={retry}>Try again</button></div></div>
          ) : results.length === 0 ? (
            <div className={styles.message}><div><p>No books found for “{query.trim()}”.</p><p className={styles.secondary}>Try another title, an author, or a different spelling.</p></div></div>
          ) : (
            <>
              <p className={styles.resultsHint}>Choose your starting book</p>
              <ul id={popupId} role="listbox" aria-label="Books" className={styles.results}>
                {results.map((book, index) => (
                  <li
                    key={book.book_id}
                    id={`${popupId}-${index}`}
                    role="option"
                    aria-selected={activeIndex === index}
                    className={styles.result}
                    onPointerDown={event => { if (event.pointerType === "mouse") event.preventDefault(); }}
                    onClick={() => handleSelect(book.book_id)}
                  >
                    {book.cover_img ? (
                      <img src={book.cover_img} alt="" width={36} height={50} className={styles.cover} />
                    ) : (
                      <span className={styles.coverPlaceholder} aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M5 3h14v18H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm0 0v14h14M7 7h8" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /></svg></span>
                    )}
                    <span className={styles.resultCopy}>
                      <span className={styles.title}>{book.title}</span>
                      <span className={styles.secondary}>{book.author || "Unknown author"}{book.publication_year ? ` · ${book.publication_year}` : ""}</span>
                      {book.genres && <span className={styles.genre}>{book.genres}</span>}
                    </span>
                    <span className={styles.resultArrow} aria-hidden="true">↗</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {examples.length > 0 && (
        <div className={styles.examples}>
          <span>Try a favorite</span>
          {examples.map(example => <button type="button" key={example} onClick={() => { updateQuery(example); inputRef.current?.focus(); }}>{example}</button>)}
        </div>
      )}
    </div>
  );
}
