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
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  // Use the identify hook
  useIdentifyUser(user);

  return null; // This component doesn't render anything
}
