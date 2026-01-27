/**
 * User Identity Tracker
 * Feature: TRACK-008 - User Identification
 *
 * Automatically identifies users in PostHog when they log in
 */

'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useIdentifyUser } from '@/lib/analytics/hooks';
import type { User } from '@supabase/supabase-js';

export function UserIdentityTracker() {
  const [user, setUser] = useState<User | null>(null);
  const supabase = createClient();

  // Get current user and subscribe to auth changes
  useEffect(() => {
    if (!supabase) return;

    // Get initial session
    supabase.auth.getSession().then((result: any) => {
      setUser(result.data.session?.user ?? null);
    });

    // Subscribe to auth changes
    const subscription = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.data.subscription.unsubscribe();
  }, [supabase]);

  // Use the identify hook
  useIdentifyUser(user);

  return null; // This component doesn't render anything
}
