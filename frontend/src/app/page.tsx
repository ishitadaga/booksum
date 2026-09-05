"use client";
import BookSearchBar from "@/components/BookSearchBar";
import RotatingSubtitle from "@/components/RotatingSubtitle";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <section className={styles.discovery} aria-labelledby="discovery-title">
        <div className={styles.mark} aria-hidden="true">
          <svg viewBox="0 0 48 36" fill="none">
            <path d="M7 25 24 8l17 17M7 25h34" stroke="currentColor" strokeWidth="1.3" />
            <circle cx="24" cy="8" r="4" fill="currentColor" />
            <circle cx="7" cy="25" r="4" fill="rgb(var(--canvas))" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="41" cy="25" r="4" fill="rgb(var(--canvas))" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </div>
        <h1 id="discovery-title" className={styles.wordmark}>Book<span>Sum</span></h1>
        <RotatingSubtitle />
        <div className={styles.search}>
          <BookSearchBar
            variant="landing"
            placeholder="Search a book or author"
            examples={["Dune", "The Hobbit", "Project Hail Mary"]}
          />
        </div>
        <p className={styles.hint}>Choose a book to explore its connections.</p>
      </section>
      <footer className={styles.footer}>A world of books, connected by you.</footer>
    </div>
  );
}
