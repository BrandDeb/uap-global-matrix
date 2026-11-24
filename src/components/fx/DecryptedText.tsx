'use client';

/**
 * React Bits–style "decrypt" reveal: characters scramble through glyphs and
 * lock in left to right. Re-runs whenever `text` changes.
 */
import { useEffect, useState } from 'react';

const GLYPHS = '▓▒░<>/\\|=+*#%@ΞΨΔΣΩ01';

export default function DecryptedText({
  text,
  className,
  speed = 28,
}: {
  text: string;
  className?: string;
  speed?: number;
}) {
  const [out, setOut] = useState(text);
  useEffect(() => {
    let frame = 0;
    const id = window.setInterval(() => {
      frame++;
      const locked = Math.floor(frame / 2);
      setOut(
        text
          .split('')
          .map((ch, i) =>
            i < locked || ch === ' ' ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
          )
          .join(''),
      );
      if (locked >= text.length) window.clearInterval(id);
    }, speed);
    return () => window.clearInterval(id);
  }, [text, speed]);
  return (
    <span className={className} aria-label={text}>
      {out}
    </span>
  );
}
