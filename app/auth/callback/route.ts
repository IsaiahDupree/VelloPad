import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { identifyPostHogUserByAuthId } from '@/lib/identity/posthog-identity';

/**
 * Auth callback handler
 * Handles OAuth redirects and email confirmations
 * Feature: GDP-009 - PostHog Identity Stitching
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/dashboard';

  if (code) {
    const cookieStore = await cookies();
    const supabase = await createClient();

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // GDP-009: Identify user in PostHog and link to person record
      try {
        // Get anonymous PostHog ID from cookie if it exists
        const anonymousId = cookieStore.get('ph_distinct_id')?.value;

        await identifyPostHogUserByAuthId(data.user.id, anonymousId);
      } catch (identityError) {
        // Log but don't block auth flow
        console.error('[Auth] PostHog identity stitching failed:', identityError);
      }

      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(new URL('/auth/error', requestUrl.origin));
}
