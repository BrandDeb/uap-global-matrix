/**
 * src/lib/operatorId.ts
 * ---------------------------------------------------------------------------
 * Stable per-browser anonymous operator id, persisted in localStorage. Used as
 * the `operator_handle` for upvotes so each browser counts as one voter without
 * auth. Once GitHub auth lands, the verified profile handle supersedes this.
 * ---------------------------------------------------------------------------
 */

const KEY = 'uap_operator_id';

export function getOperatorId(): string {
  if (typeof window === 'undefined') return 'ANON_OPERATOR';
  // A pilot name chosen in Settings / onboarding wins over the random id.
  try {
    const name = (JSON.parse(window.localStorage.getItem('uap-profile') ?? '{}') as { name?: string }).name?.trim();
    if (name && name.length >= 2) return name.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 40);
  } catch {
    /* fall through */
  }
  let id = window.localStorage.getItem(KEY);
  if (!id) {
    id = `anon_${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(KEY, id);
  }
  return id;
}
