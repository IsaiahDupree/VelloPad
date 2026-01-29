/**
 * PostHog Identity Stitching - GDP-009
 *
 * Links VelloPad person records with PostHog distinct_id for unified analytics
 * Implements bidirectional identity resolution between Growth Data Plane and PostHog
 */

import { createClient } from '@/lib/supabase/server';
import { identifyServerUser, aliasUser } from '@/lib/analytics/posthog-server';

export interface PostHogIdentity {
  personId: string;
  distinctId: string;
  email?: string;
  properties?: Record<string, any>;
}

/**
 * Link a person to their PostHog distinct_id
 * Creates or updates the identity_link record
 */
export async function linkPostHogIdentity(params: {
  personId: string;
  distinctId: string;
  properties?: Record<string, any>;
}): Promise<boolean> {
  try {
    const supabase = await createClient();

    // Check if identity link already exists
    const { data: existing } = await supabase
      .from('identity_link')
      .select('id')
      .eq('person_id', params.personId)
      .eq('platform', 'posthog')
      .single();

    if (existing) {
      // Update existing link
      const { error } = await supabase
        .from('identity_link')
        .update({
          external_id: params.distinctId,
          properties: params.properties || {},
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (error) {
        console.error('[PostHog Identity] Failed to update identity link:', error);
        return false;
      }
    } else {
      // Create new identity link
      const { error } = await supabase.from('identity_link').insert({
        person_id: params.personId,
        platform: 'posthog',
        external_id: params.distinctId,
        properties: params.properties || {},
      });

      if (error) {
        console.error('[PostHog Identity] Failed to create identity link:', error);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('[PostHog Identity] Error linking identity:', error);
    return false;
  }
}

/**
 * Get PostHog distinct_id for a person
 */
export async function getPostHogDistinctId(personId: string): Promise<string | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('identity_link')
      .select('external_id')
      .eq('person_id', personId)
      .eq('platform', 'posthog')
      .single();

    if (error || !data) {
      return null;
    }

    return data.external_id;
  } catch (error) {
    console.error('[PostHog Identity] Error getting distinct_id:', error);
    return null;
  }
}

/**
 * Get person_id from PostHog distinct_id
 */
export async function getPersonIdFromDistinctId(
  distinctId: string
): Promise<string | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('identity_link')
      .select('person_id')
      .eq('platform', 'posthog')
      .eq('external_id', distinctId)
      .single();

    if (error || !data) {
      return null;
    }

    return data.person_id;
  } catch (error) {
    console.error('[PostHog Identity] Error getting person_id:', error);
    return null;
  }
}

/**
 * Identify user in PostHog and link to person record
 * This is the main entry point for identity stitching
 */
export async function identifyPostHogUser(params: {
  personId: string;
  email: string;
  properties?: Record<string, any>;
  anonymousId?: string; // Previous anonymous PostHog ID to link
}): Promise<boolean> {
  try {
    const supabase = await createClient();

    // Fetch person details for enrichment
    const { data: person } = await supabase
      .from('person')
      .select('*')
      .eq('id', params.personId)
      .single();

    if (!person) {
      console.error('[PostHog Identity] Person not found:', params.personId);
      return false;
    }

    // Use person_id as the PostHog distinct_id for consistency
    const distinctId = params.personId;

    // Identify user in PostHog with enriched properties
    identifyServerUser(distinctId, {
      email: params.email,
      first_name: person.first_name,
      last_name: person.last_name,
      full_name: person.full_name,
      lifecycle_stage: person.lifecycle_stage,
      first_seen_at: person.first_seen_at,
      utm_source: person.utm_source,
      utm_medium: person.utm_medium,
      utm_campaign: person.utm_campaign,
      ...params.properties,
    });

    // If we have an anonymous ID, link it to the identified user
    if (params.anonymousId && params.anonymousId !== distinctId) {
      aliasUser(params.anonymousId, distinctId);
    }

    // Store the identity link in database
    const linked = await linkPostHogIdentity({
      personId: params.personId,
      distinctId,
      properties: {
        email: params.email,
        identified_at: new Date().toISOString(),
        anonymous_id: params.anonymousId,
      },
    });

    if (!linked) {
      console.error('[PostHog Identity] Failed to link identity in database');
      return false;
    }

    return true;
  } catch (error) {
    console.error('[PostHog Identity] Error identifying user:', error);
    return false;
  }
}

/**
 * Get or create person and identify in PostHog
 * Use this on signup/login when you have a Supabase auth user
 */
export async function identifyPostHogUserByAuthId(
  authUserId: string,
  anonymousId?: string
): Promise<boolean> {
  try {
    const supabase = await createClient();

    // Get user email from auth.users
    const { data: authUser } = await supabase.auth.admin.getUserById(authUserId);

    if (!authUser.user?.email) {
      console.error('[PostHog Identity] No email found for auth user:', authUserId);
      return false;
    }

    const email = authUser.user.email;

    // Get or create person record
    let personId: string | null = null;

    // Check if person exists
    const { data: existingPerson } = await supabase
      .from('person')
      .select('id')
      .eq('email', email)
      .single();

    if (existingPerson) {
      personId = existingPerson.id;

      // Update last_seen_at
      await supabase
        .from('person')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', personId);
    } else {
      // Create new person record
      const { data: newPerson, error: createError } = await supabase
        .from('person')
        .insert({
          email,
          lifecycle_stage: 'lead',
          first_seen_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (createError || !newPerson) {
        console.error('[PostHog Identity] Failed to create person:', createError);
        return false;
      }

      personId = newPerson.id;
    }

    if (!personId) {
      console.error('[PostHog Identity] Failed to get or create person');
      return false;
    }

    // Also link auth user ID to person
    const { data: existingAuthLink } = await supabase
      .from('identity_link')
      .select('id')
      .eq('person_id', personId)
      .eq('platform', 'auth')
      .single();

    if (!existingAuthLink) {
      await supabase.from('identity_link').insert({
        person_id: personId,
        platform: 'auth',
        external_id: authUserId,
      });
    }

    // Identify in PostHog
    return await identifyPostHogUser({
      personId,
      email,
      anonymousId,
    });
  } catch (error) {
    console.error('[PostHog Identity] Error identifying user by auth ID:', error);
    return false;
  }
}

/**
 * Resolve person_id from auth user or email
 */
export async function resolvePersonId(params: {
  authUserId?: string;
  email?: string;
}): Promise<string | null> {
  try {
    const supabase = await createClient();

    // Try auth user ID first
    if (params.authUserId) {
      const { data: authLink } = await supabase
        .from('identity_link')
        .select('person_id')
        .eq('platform', 'auth')
        .eq('external_id', params.authUserId)
        .single();

      if (authLink) {
        return authLink.person_id;
      }
    }

    // Try email
    if (params.email) {
      const { data: person } = await supabase
        .from('person')
        .select('id')
        .eq('email', params.email)
        .single();

      if (person) {
        return person.id;
      }
    }

    return null;
  } catch (error) {
    console.error('[PostHog Identity] Error resolving person_id:', error);
    return null;
  }
}
