import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { identifyPostHogUserByAuthId } from '@/lib/identity/posthog-identity';
import { recordSignupTenantFromContext } from '@/lib/auth/signup-tenant-tracking';
import { getTenantFromRequest } from '@/lib/tenant/resolver';

/**
 * Auth callback handler
 * Handles OAuth redirects and email confirmations
 * Features:
 * - GDP-009: PostHog Identity Stitching
 * - MT-011: Customer Signup Tenant Tracking
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/dashboard';

  if (code) {
    const cookieStore = await cookies();
    const headerStore = await headers();
    const supabase = await createClient();

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // MT-011: Record which tenant user signed up through
      try {
        const tenantContext = await getTenantFromRequest(headerStore);
        await recordSignupTenantFromContext(data.user.id, tenantContext);
      } catch (tenantError) {
        // Log but don't block auth flow
        console.error('[Auth] Tenant tracking failed:', tenantError);
      }

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
