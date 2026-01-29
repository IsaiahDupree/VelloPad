/**
 * Person Features Computation API
 * Feature: GDP-011
 *
 * POST /api/features/compute
 * Computes person features for the current user or specified person
 */

import { NextRequest, NextResponse } from 'next/server';
import { computePersonFeatures, getPersonFeatures } from '@/lib/features/person-features';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get person_id from request body (optional)
    const body = await request.json().catch(() => ({}));
    const { person_id } = body;

    // Default to current user's email to look up person
    let personId = person_id;

    if (!personId) {
      // Look up person by user's email
      const { data: person, error: personError } = await supabase
        .from('person')
        .select('id')
        .eq('email', user.email)
        .single();

      if (personError || !person) {
        // Person doesn't exist yet - create one
        const { data: newPerson, error: createError } = await supabase
          .from('person')
          .insert({
            email: user.email!,
            first_name: user.user_metadata?.first_name,
            last_name: user.user_metadata?.last_name,
            full_name: user.user_metadata?.full_name,
          })
          .select('id')
          .single();

        if (createError || !newPerson) {
          return NextResponse.json(
            { error: 'Failed to create person record' },
            { status: 500 }
          );
        }

        personId = newPerson.id;
      } else {
        personId = person.id;
      }
    }

    // Compute features
    await computePersonFeatures(personId);

    // Get computed features
    const features = await getPersonFeatures(personId);

    return NextResponse.json({
      success: true,
      person_id: personId,
      features,
    });
  } catch (error: any) {
    console.error('[API] Feature computation failed:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/features/compute?person_id={id}
 * Get computed features for a person
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get person_id from query params
    const searchParams = request.nextUrl.searchParams;
    let personId = searchParams.get('person_id');

    if (!personId) {
      // Look up person by user's email
      const { data: person, error: personError } = await supabase
        .from('person')
        .select('id')
        .eq('email', user.email)
        .single();

      if (personError || !person) {
        return NextResponse.json(
          { error: 'Person not found' },
          { status: 404 }
        );
      }

      personId = person.id;
    }

    // Get features
    const features = await getPersonFeatures(personId);

    if (!features) {
      return NextResponse.json(
        {
          error: 'Features not computed yet',
          hint: 'POST to /api/features/compute to compute features',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      person_id: personId,
      features,
    });
  } catch (error: any) {
    console.error('[API] Failed to get features:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
