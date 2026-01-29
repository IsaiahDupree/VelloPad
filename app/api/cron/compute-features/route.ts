/**
 * Cron Job: Compute Person Features
 * Feature: GDP-011
 *
 * POST /api/cron/compute-features
 * Scheduled job that computes features for all recently active persons
 *
 * Schedule: Daily at 2 AM UTC
 * Vercel Cron: 0 2 * * *
 */

import { NextRequest, NextResponse } from 'next/server';
import { computeFeaturesForRecentlyActive } from '@/lib/features/person-features';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');

    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const startTime = Date.now();

    console.log('[Cron] Starting person features computation...');

    // Compute features for persons active in last 30 days
    const count = await computeFeaturesForRecentlyActive(30);

    const duration = Date.now() - startTime;

    console.log(
      `[Cron] Computed features for ${count} persons in ${duration}ms`
    );

    return NextResponse.json({
      success: true,
      persons_computed: count,
      duration_ms: duration,
    });
  } catch (error: any) {
    console.error('[Cron] Feature computation failed:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
