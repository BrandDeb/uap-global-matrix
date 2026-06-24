/**
 * src/lib/supabase/server.ts
 * ---------------------------------------------------------------------------
 * Privileged, SERVER-ONLY Supabase client.
 *
 * This client is built with the **service-role key**, which bypasses Row
 * Level Security. It must therefore NEVER reach the browser bundle. Two
 * safeguards enforce that:
 *   1. The service-role key is read from `SUPABASE_SERVICE_ROLE_KEY` — a
 *      variable WITHOUT the `NEXT_PUBLIC_` prefix, so Next.js strips it from
 *      any client bundle (it would resolve to "" on the client).
 *   2. A runtime guard throws if this module is ever evaluated in a browser.
 *
 * Use this only inside Route Handlers, Server Components, and server actions.
 * For browser code use `./client.ts` (anon key) instead.
 * ---------------------------------------------------------------------------
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Lazily-instantiated singleton. Created on first use so that importing this
 * module never throws at build time merely for being present in the graph —
 * it only validates env vars when a request actually needs the client.
 */
let cachedAdminClient: SupabaseClient | null = null;

/**
 * Returns the privileged Supabase client for server-side use.
 *
 * @throws if invoked in a browser, or if required environment variables are
 *         absent. Failing fast here is deliberate: a missing service-role key
 *         should surface as a clear 500 at the boundary, not a silent
 *         RLS-permission error deep in a query.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (typeof window !== 'undefined') {
    throw new Error(
      '[supabase/server] The service-role client must never run in the browser.',
    );
  }

  if (!SUPABASE_URL) {
    throw new Error('[supabase/server] NEXT_PUBLIC_SUPABASE_URL is not configured.');
  }

  if (!SERVICE_ROLE_KEY) {
    throw new Error('[supabase/server] SUPABASE_SERVICE_ROLE_KEY is not configured.');
  }

  if (cachedAdminClient) {
    return cachedAdminClient;
  }

  cachedAdminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
      // A service client is stateless: no user session to persist or refresh.
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { 'X-Client-Info': 'uap-global-matrix/server' },
    },
  });

  return cachedAdminClient;
}
