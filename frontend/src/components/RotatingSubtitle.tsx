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
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const timer = setInterval(() => {
      const active = document.activeElement;
      if (!media.matches && !document.hidden && !(active instanceof HTMLInputElement) && !(active instanceof HTMLTextAreaElement)) {
        setIndex(value => (value + 1) % lines.length);
      }
    }, 8000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className={styles.root}>
      <p className="sr-only">Discover your next read through connections between books.</p>
      <div className={styles.copy} aria-hidden="true">
        {lines.map(([first, second], position) => (
          <p key={first} className={`${styles.line} ${position === index ? styles.active : ""}`}>
            {first}<br /><span>{second}</span>
          </p>
        ))}
      </div>
    </div>
  );
}
