"use client";
import { useEffect, useState } from "react";
import styles from "./RotatingSubtitle.module.css";

const lines = [
  ["Start with a story you love.", "Find the threads that connect it to your next."],
  ["One good book", "leads to another."],
  ["Start with a book you love.", "Discover what to read next."],
];

export default function RotatingSubtitle() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [interacting, setInteracting] = useState(false);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (paused || reducedMotion || interacting) return;
    const timer = setInterval(() => { if (!document.hidden) setIndex(value => (value + 1) % lines.length); }, 8000);
    return () => clearInterval(timer);
  }, [paused, reducedMotion, interacting]);
  return (
    <div className={styles.root} onMouseEnter={() => setInteracting(true)} onMouseLeave={() => setInteracting(false)}
      onFocus={() => setInteracting(true)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setInteracting(false); }}>
      <div className={styles.copy}>
        {lines.map(([first, second], position) => (
          <p key={first} className={`${styles.line} ${position === index ? styles.active : ""}`} aria-hidden={position !== index}>
            {first}<br /><span>{second}</span>
          </p>
        ))}
      </div>
      <div className={styles.controls} role="group" aria-label="Discovery messages">
        <button type="button" onClick={() => { setPaused(true); setIndex(value => (value + 1) % lines.length); }} aria-label="Next discovery message">
          <span aria-hidden="true">{index + 1} / {lines.length}</span>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m9 5 7 7-7 7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        {!reducedMotion && <button type="button" onClick={() => setPaused(value => !value)} aria-label={paused ? "Resume discovery messages" : "Pause discovery messages"}>
          {paused ? <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m8 4 12 8-12 8Z" /></svg> : <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 4h4v16H6zM14 4h4v16h-4z" /></svg>}
        </button>}
      </div>
    </div>
  );
}
