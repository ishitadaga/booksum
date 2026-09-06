"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import SimilarityGraph, { type SimilarityGraphHandle } from "./SimilarityGraph";
import BookSearchBar from "./BookSearchBar";
import { useGraph } from "@/hooks/useGraph";
import { networkLinks } from "@/lib/network";
import { GENRE_COLORS } from "@/lib/constants";
import styles from "./DiscoveryWorkspace.module.css";

export default function DiscoveryWorkspace({ bookId }: { bookId: string }) {
  const { graph, loading, error, loadGraph, expandNode, expanding } = useGraph();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [allLinks, setAllLinks] = useState(false);
  const [topN, setTopN] = useState(20);
  const graphRef = useRef<SimilarityGraphHandle>(null);
  const panelRef = useRef<HTMLElement>(null);
  useEffect(() => { void loadGraph(bookId, topN); }, [bookId, topN, loadGraph]);
  const edges = useMemo(() => graph ? networkLinks(graph, allLinks) : [], [graph, allLinks]);
  const books = useMemo(() => graph ? [graph.center_book, ...graph.nodes.filter(n => n.id !== graph.center_book.id)] : [], [graph]);
  const selected = books.find(book => book.id === selectedId);
  function selectBook(id: string | null) {
    setSelectedId(id);
    if (id && window.matchMedia("(max-width: 760px)").matches) {
      panelRef.current?.scrollIntoView({ block: "start", behavior: "auto" });
    }
  }
  return <section className={styles.workspace} aria-label="Book discovery">
    <header className={styles.header}>
      <div><p className={styles.eyebrow}>A book is only the beginning</p><h1>{graph ? graph.center_book.label : "Your next chapter"}</h1>
      <p className={styles.intro}>Follow a connection. Find your next read.</p></div>
      <div className={styles.search}><BookSearchBar size="sm" placeholder="Try another book or author" /></div>
    </header>
    <div className={styles.toolbar}>
      <div className={styles.mapTitle}>Your book map <span>{books.length ? `${books.length} books` : ""}</span></div>
      <div className={styles.options}>
        <label className={styles.toggle}><input type="checkbox" checked={allLinks} onChange={event => setAllLinks(event.target.checked)} />All connections</label>
        <label className={styles.count}>Nearby books <select value={topN} onChange={event => { setSelectedId(null); setTopN(Number(event.target.value)); }} disabled={loading || expanding}>
          <option value={10}>10</option><option value={20}>20</option><option value={30}>30</option>
        </select></label>
        <Link className={styles.startOver} href="/">Start over</Link>
      </div>
    </div>
    {error && <div className={styles.error} role="alert">{error} <button onClick={() => void loadGraph(bookId, topN)}>Reload map</button></div>}
    <div className={styles.body}>
      <div className={styles.map} aria-busy={loading || expanding}>
        {graph && <SimilarityGraph ref={graphRef} graph={graph} edges={edges} selectedId={selected?.id ?? null} onSelect={selectBook} />}
        {(loading || expanding) && <div className={graph ? styles.progress : styles.loading} role="status"><span className={styles.spinner} />{expanding ? "Finding more connections…" : "Drawing your book map…"}</div>}
        {!graph && !loading && error && <div className={styles.loading}>Your map will appear here once the library responds.</div>}
        {graph && <>
          <div className={styles.legend} aria-label="Map genres">{[...new Set(books.map(book => book.genre || "Other"))].map(genre => <span key={genre}><i style={{ background: GENRE_COLORS[genre] || "#8993a5" }} />{genre}</span>)}</div>
          <div className={styles.mapFooter}><span>{allLinks ? "All" : "Strongest"} connections · {edges.length} of {networkLinks(graph, true).length}<small>Drag to explore · Scroll or pinch to zoom</small></span>
            <div className={styles.zoom}><button aria-label="Zoom out" onClick={() => graphRef.current?.zoom(1 / 1.25)}>−</button><button aria-label="Reset map view" onClick={() => graphRef.current?.fit()}>Reset</button><button aria-label="Zoom in" onClick={() => graphRef.current?.zoom(1.25)}>+</button></div>
          </div>
        </>}
      </div>
      <aside ref={panelRef} className={styles.panel} aria-label="Books in this map">
        {selected ? <div className={styles.detail}>
          <button className={styles.back} onClick={() => setSelectedId(null)}>← All books</button>
          <p className={styles.eyebrow}>{selected.id === bookId ? "Your starting point" : "Follow this thread"}</p>
          {selected.cover_img && <img key={selected.id} src={selected.cover_img} alt="" className={styles.cover} onError={event => { event.currentTarget.style.display = "none"; }} />}
          <h2>{selected.label}</h2><p className={styles.author}>{selected.author || "Unknown author"}</p>
          <p className={styles.metadata}>{[selected.genre, selected.publication_year].filter(Boolean).join(" · ")}</p>
          {selected.id !== bookId && <p className={styles.score}>{(selected.similarity * 100).toFixed(1)}% similarity <span>{selected.similarity_source ? `to ${selected.similarity_source}` : "to your starting book"}</span></p>}
          <h3>About this book</h3><p className={styles.description}>{selected.description || "A description isn’t available for this book yet."}</p>
          <div className={styles.actions}>
            {selected.id !== bookId && <Link href={`/?book_id=${encodeURIComponent(selected.id)}`}>Start a map from this book ↗</Link>}
            <button disabled={expanding || loading} onClick={() => void expandNode(selected.id, books.map(book => book.id))}>{expanding ? "Finding connections…" : "Add its connections to this map"}</button>
          </div>
        </div> : <>
          <div className={styles.panelHeading}><p className={styles.eyebrow}>The reading trail</p><h2>Where will you go next?</h2><p>Select a book on the map or below.</p></div>
          <ul className={styles.bookList}>{books.map((book, index) => <li key={book.id}>
            <button onClick={() => selectBook(book.id)}>
              <span className={styles.dot} style={{ background: GENRE_COLORS[book.genre || ""] || "#8993a5" }} />
              <span><strong>{book.label}</strong><small>{book.author || "Unknown author"}</small></span>
              <span className={styles.rank} title={book.similarity_source ? `Similarity to ${book.similarity_source}` : "Similarity to your starting book"}>{index === 0 ? "Start" : book.similarity_source ? "Added" : `${Math.round(book.similarity * 100)}%`}</span>
            </button>
          </li>)}</ul>
          {graph && books.length === 1 && <p className={styles.empty}>No nearby books were found for this title. Try another starting book.</p>}
          <p className={styles.panelNote}>Connections come from the existing book embeddings. A shorter line is not a higher score.</p>
        </>}
      </aside>
    </div>
  </section>;
}
