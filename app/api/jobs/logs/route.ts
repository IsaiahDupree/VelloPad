/**
 * Job Logs API
 * Feature: BS-901
 *
 * GET /api/jobs/logs - Get job logs for a rendition
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getJobLogs, getRenditionJobLogs } from '@/lib/jobs/monitoring';

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
    const jobId = searchParams.get('jobId');
    const renditionId = searchParams.get('renditionId');

    if (!jobId && !renditionId) {
      return NextResponse.json(
        { error: 'Missing required parameter: jobId or renditionId' },
        { status: 400 }
      );
    }

    // Get logs
    const logs = jobId
      ? await getJobLogs(jobId)
      : await getRenditionJobLogs(renditionId!);

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Error in GET /api/jobs/logs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
