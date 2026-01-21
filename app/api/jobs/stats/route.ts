/**
 * Job Statistics API
 * Feature: BS-901
 *
 * GET /api/jobs/stats - Get job statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getJobStats, getBookJobStats } from '@/lib/jobs/monitoring';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const hours = searchParams.get('hours')
      ? parseInt(searchParams.get('hours')!, 10)
      : 24;
    const bookId = searchParams.get('bookId');

    // Get statistics
    const stats = bookId
      ? await getBookJobStats(bookId)
      : await getJobStats(hours);

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error in GET /api/jobs/stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
