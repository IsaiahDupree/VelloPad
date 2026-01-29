/**
 * Client-side Identity Sync Hook - GDP-009
 *
 * Automatically syncs authenticated user identity with PostHog on the client side
 */

'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { identifyUser } from '@/lib/analytics/posthog-client';

/**
 * Hook to sync user identity with PostHog when authenticated
 * Call this in your root layout or auth provider
 */
export function useIdentitySync() {
  useEffect(() => {
    const supabase = createClient();

    // Get current user
    const syncIdentity = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.id && user?.email) {
        // Use auth user ID as distinct_id for consistency with server
        // The server will map this to person_id via identity_link table
        identifyUser(user.id, {
          email: user.email,
          user_id: user.id,
        });
      }
    };

    // Sync on mount
    syncIdentity();

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      if (session?.user) {
        identifyUser(session.user.id, {
          email: session.user.email,
          user_id: session.user.id,
        });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);
}
