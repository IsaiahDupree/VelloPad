/**
 * Cron Job: Compute Segment Memberships
 * GET /api/cron/compute-segments
 *
 * Scheduled job to recompute membership for all active segments
 * Run daily to keep segment membership fresh
 *
 * Configure in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/compute-segments",
 *     "schedule": "0 2 * * *"
 *   }]
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { batchComputeSegmentMembership } from '@/lib/segments/segment-engine';

export async function GET(request: NextRequest) {
  try {
    // Verify cron authorization (Vercel provides this header)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Cron] Starting segment membership computation...');

    const startTime = Date.now();

    // Compute all active segments
    const { results } = await batchComputeSegmentMembership();

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    const totalMembers = results
      .filter((r) => r.success && r.stats)
      .reduce((sum, r) => sum + (r.stats?.totalMembers || 0), 0);

    const totalAdded = results
      .filter((r) => r.success && r.stats)
      .reduce((sum, r) => sum + (r.stats?.membersAdded || 0), 0);

    const totalRemoved = results
      .filter((r) => r.success && r.stats)
      .reduce((sum, r) => sum + (r.stats?.membersRemoved || 0), 0);

    const duration = Date.now() - startTime;

    console.log(
      `[Cron] Segment computation complete: ${successCount} succeeded, ${failureCount} failed (${duration}ms)`
    );
    console.log(`[Cron] Total members: ${totalMembers} (+${totalAdded} -${totalRemoved})`);

    return NextResponse.json({
      success: true,
      stats: {
        segmentsComputed: successCount,
        segmentsFailed: failureCount,
        totalMembers,
        membersAdded: totalAdded,
        membersRemoved: totalRemoved,
        durationMs: duration,
      },
      results,
    });
  } catch (error: any) {
    console.error('[Cron] Segment computation error:', error);
    return NextResponse.json(
      {
        error: 'Failed to compute segments',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
