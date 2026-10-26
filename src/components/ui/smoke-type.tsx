"use client";

import styles from "./smoke-type.module.css";

export function SmokeType({ text }: { text: string }) {
  return (
    <>
      <span className={styles.srOnly}>{text}</span>
      <span className={styles.visual} aria-hidden="true">
        {Array.from(text).map((character, index) =>
          character === " " ? (
            " "
          ) : (
            <span
              key={`${index}-${character}`}
              className={styles.letter}
              style={{ animationDelay: `${index * 26}ms` }}
            >
              {character}
            </span>
          ),
        )}
      </span>
    </>
  );
}
