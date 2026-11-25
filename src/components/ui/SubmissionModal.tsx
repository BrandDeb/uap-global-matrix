'use client';

/**
 * src/components/ui/SubmissionModal.tsx
 * ---------------------------------------------------------------------------
 * Drag-and-drop sighting intake. POSTs multipart to /api/verify and triggers an
 * immediate matrix refresh + focus on the newly logged sighting.
 * ---------------------------------------------------------------------------
 */

import { toast } from 'sonner';
import { useEffect, useState } from 'react';
import { UploadCloud, X } from 'lucide-react';

interface SubmissionModalProps {
  readonly onClose: () => void;
  readonly onSubmitted?: (newId?: string) => void;
}

export default function SubmissionModal({ onClose, onSubmitted }: SubmissionModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setMessage('Attach an image or video first.');
      return;
    }
    const form = new FormData(event.currentTarget);
    form.set('file', file);
    const localTs = String(form.get('timestamp') ?? '');
    if (localTs) form.set('timestamp', new Date(localTs).toISOString());

    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch('/api/verify', { method: 'POST', body: form });
      const body = (await res.json()) as {
        success: boolean;
        data?: { id?: string; credibilityScore: number; sourceTier: string };
        error?: string;
      };
      if (body.success && body.data) {
        toast.success('Contact logged', {
          description: `Credibility ${body.data.credibilityScore}% · ${body.data.sourceTier}`,
        });
        setMessage(`Logged. C=${body.data.credibilityScore} → ${body.data.sourceTier}.`);
        onSubmitted?.(body.data.id);
      } else {
        toast.error('Report rejected', { description: body.error ?? 'unknown error' });
        setMessage(`Rejected: ${body.error ?? 'unknown error'}`);
      }
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Network error.');
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    'w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-cyan-500 focus:outline-none';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Report a sighting"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl border border-zinc-800 bg-zinc-900 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold tracking-widest text-cyan-400">
            <UploadCloud size={16} /> SUBMIT SIGHTING
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              const dropped = e.dataTransfer.files?.[0];
              if (dropped) setFile(dropped);
            }}
            className={`flex h-28 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed text-center text-xs transition-colors ${
              dragActive ? 'border-cyan-500 bg-cyan-500/10' : 'border-zinc-700 bg-zinc-950'
            }`}
          >
            <UploadCloud size={22} className="mb-1 text-zinc-500" />
            <span className="text-zinc-400">
              {file ? file.name : 'Drag & drop image/video, or click to browse'}
            </span>
            <input
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>

          <input name="title" placeholder="Title" required className={inputClass} />
          <textarea name="description" placeholder="Description" rows={2} className={inputClass} />
          <div className="grid grid-cols-2 gap-3">
            <input name="latitude" type="number" step="any" placeholder="Latitude" required className={inputClass} />
            <input name="longitude" type="number" step="any" placeholder="Longitude" required className={inputClass} />
          </div>
          <input name="location_name" placeholder="Location name (optional)" className={inputClass} />
          <input name="timestamp" type="datetime-local" required className={inputClass} />

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-cyan-600 py-2 text-sm font-semibold text-white transition-colors hover:bg-cyan-500 disabled:opacity-50"
          >
            {submitting ? 'Analyzing…' : 'Run Verification'}
          </button>
          {message && <p className="text-xs text-zinc-400">{message}</p>}
        </form>
      </div>
    </div>
  );
}
