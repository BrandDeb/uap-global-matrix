/**
 * src/lib/supabase/client.ts
 * ---------------------------------------------------------------------------
 * Browser-side Supabase client.
 *
 * ⚠ SECURITY: this client runs in the user's browser, so it uses the PUBLIC
 * **anon key** (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) — NOT the service-role key.
 * The service-role key bypasses Row Level Security and must stay server-side
 * (see `./server.ts`). Shipping it to the browser would hand every visitor
 * full read/write access to the database. Both values here are intentionally
 * `NEXT_PUBLIC_`-prefixed because they are designed to be public; your RLS
 * policies are what actually protect the data on this path.
 * ---------------------------------------------------------------------------
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Singleton browser client. Re-creating `createClient` on every render spawns
 * duplicate GoTrue auth listeners (the "Multiple GoTrueClient instances"
 * warning); caching one instance per tab avoids that.
 */
let cachedBrowserClient: SupabaseClient | null = null;

/**
 * Returns the shared anon-key Supabase client for use in Client Components.
 *
 * @throws if the public environment variables are missing — surfaced eagerly
 *         so a misconfigured deploy fails loudly instead of returning empty
 *         query results.
 */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (!SUPABASE_URL) {
    throw new Error('[supabase/client] NEXT_PUBLIC_SUPABASE_URL is not configured.');
  }

  if (!ANON_KEY) {
    throw new Error('[supabase/client] NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured.');
  }

  if (cachedBrowserClient) {
    return cachedBrowserClient;
  }

  cachedBrowserClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: {
      headers: { 'X-Client-Info': 'uap-global-matrix/browser' },
    },
  });

  return cachedBrowserClient;
}
