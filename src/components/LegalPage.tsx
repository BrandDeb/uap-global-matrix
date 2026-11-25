import Link from 'next/link';
import type { ReactNode } from 'react';

export default function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <main className="mx-auto max-w-2xl px-5 py-16 text-white/75">
      <Link href="/" className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/40 hover:text-white">
        ← UAP/MATRIX
      </Link>
      <h1 className="mt-6 font-[family-name:var(--font-display)] text-4xl font-extrabold uppercase leading-[1.05] text-white">{title}</h1>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.3em] text-white/35">Last updated {updated}</p>
      <div className="mt-10 space-y-6 leading-relaxed [&_h2]:mt-10 [&_h2]:font-semibold [&_h2]:text-white [&_a]:text-[var(--xeno-a)] [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
        {children}
      </div>
      <p className="mt-16 font-mono text-[10px] uppercase tracking-[0.3em] text-white/30">Designed and built by Lowkee Studios</p>
    </main>
  );
}
