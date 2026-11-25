'use client';

/**
 * React Bits–style "decrypt" reveal: characters scramble through glyphs and
 * lock in left to right. The whole reveal is capped at `duration` ms however
 * long the text is, so it reads as a flourish rather than a glitch. Re-runs
 * whenever `text` changes.
 */
import { useEffect, useState } from 'react';

const GLYPHS = '▓▒░<>/\\|=+*#%@ΞΨΔΣΩ01';

export default function DecryptedText({
  text,
  className,
  duration = 600,
}: {
  text: string;
  className?: string;
  duration?: number;
}) {
  const [out, setOut] = useState(text);
  useEffect(() => {
    const start = Date.now();
    const id = window.setInterval(() => {
      const locked = Math.ceil(((Date.now() - start) / duration) * text.length);
      setOut(
        text
          .split('')
          .map((ch, i) =>
            i < locked || ch === ' ' ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
          )
          .join(''),
      );
      if (locked >= text.length) {
        setOut(text);
        window.clearInterval(id);
      }
    }, 30);
    return () => window.clearInterval(id);
  }, [text, duration]);
  return (
    <span className={className} aria-label={text}>
      {out}
    </span>
  );
}
