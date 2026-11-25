'use client';

/**
 * Share to every major network. Networks with a web share intent get a direct
 * link; TikTok, Instagram and Snapchat have none, so they use the phone's
 * native share sheet (which offers those apps) and fall back to copying the link.
 */
import { useState } from 'react';
import { toast } from 'sonner';

export default function ShareBar({ url, text, className = '' }: { url: string; text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(text);
  const links = [
    { label: 'X', href: `https://x.com/intent/post?text=${t}&url=${u}` },
    { label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { label: 'WhatsApp', href: `https://wa.me/?text=${t}%20${u}` },
    { label: 'Reddit', href: `https://www.reddit.com/submit?url=${u}&title=${t}` },
    { label: 'Threads', href: `https://www.threads.net/intent/post?text=${t}%20${u}` },
    { label: 'Bluesky', href: `https://bsky.app/intent/compose?text=${t}%20${u}` },
    { label: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
    { label: 'Telegram', href: `https://t.me/share/url?url=${u}&text=${t}` },
  ];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast('Link copied', { description: 'Paste it anywhere: TikTok bio, Insta story, the group chat.' });
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked */
    }
  };
  const native = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ url, text });
        return;
      } catch {
        return; // cancelled
      }
    }
    await copy();
  };

  const pill = 'rounded-full border border-white/15 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-white/65 transition hover:border-white/40 hover:text-white';
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className="mr-1 font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">Share</span>
      {links.map((l) => (
        <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className={pill}>
          {l.label}
        </a>
      ))}
      <button type="button" onClick={() => void native()} className={pill}>
        TikTok / Insta / Snap
      </button>
      <button type="button" onClick={() => void copy()} className={pill}>
        {copied ? 'Copied ✓' : 'Copy link'}
      </button>
    </div>
  );
}
