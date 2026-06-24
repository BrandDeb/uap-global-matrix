/**
 * src/lib/supabase/anon.ts
 * ---------------------------------------------------------------------------
 * Stateless anon-key Supabase client for SERVER-SIDE reads (Route Handlers,
 * Server Components).
 *
 * Why a third client? Least privilege. The service-role client in `./server.ts`
 * bypasses RLS — appropriate for the scoring write path, but over-privileged
 * for "list public sightings". This client authenticates as the public `anon`
 * role, so RLS policies are enforced: it can only ever see what an anonymous
 * visitor is allowed to. It also means the read endpoint works WITHOUT the
 * service-role secret being configured.
 *
 * Unlike `./client.ts` (browser, persisted session), this is stateless.
 * ---------------------------------------------------------------------------
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let cachedAnonClient: SupabaseClient | null = null;

/** Returns the shared stateless anon client for server-side reads. */
export function getSupabaseAnonServer(): SupabaseClient {
  if (!SUPABASE_URL) {
    throw new Error('[supabase/anon] NEXT_PUBLIC_SUPABASE_URL is not configured.');
  }
  if (!ANON_KEY) {
    throw new Error('[supabase/anon] NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured.');
  }
  if (cachedAnonClient) {
    return cachedAnonClient;
  }

  cachedAnonClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { 'X-Client-Info': 'uap-global-matrix/anon-server' } },
  });

  return cachedAnonClient;
}
