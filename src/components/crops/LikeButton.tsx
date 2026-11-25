'use client';

import { useState } from 'react';
import { xenoAudio } from '@/components/landing/audio';

export default function LikeButton({ id, initial }: { id: string; initial: number }) {
  const key = `uap-liked:${id}`;
  const [likes, setLikes] = useState(initial);
  const [liked, setLiked] = useState(() => {
    try {
      return typeof window !== 'undefined' && localStorage.getItem(key) === '1';
    } catch {
      return false;
    }
  });
  const like = async () => {
    if (liked) return;
    setLiked(true);
    setLikes((n) => n + 1);
    xenoAudio?.blip(0.8);
    try {
      localStorage.setItem(key, '1');
    } catch {
      /* ignore */
    }
    const r = await fetch(`/api/crops/${id}/like`, { method: 'POST' }).catch(() => null);
    if (r?.ok) setLikes(((await r.json()) as { likes: number }).likes);
  };
  return (
    <button
      type="button"
      onClick={() => void like()}
      aria-pressed={liked}
      className={`rounded-full border px-3 py-1 font-mono text-xs transition ${liked ? 'border-[var(--xeno-d)] text-[var(--xeno-d)]' : 'border-white/20 text-white/70 hover:border-white/50'}`}
    >
      {liked ? '♥' : '♡'} {likes}
    </button>
  );
}
