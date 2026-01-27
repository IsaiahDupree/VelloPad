import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  // During build time or SSR without env vars, return a mock client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey || typeof window === 'undefined') {
    // Return a mock client for build time
    return null as any;
  }

  return createBrowserClient(supabaseUrl, supabaseKey);
}
