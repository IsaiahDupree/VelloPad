import { NextRequest, NextResponse } from 'next/server';
import { pollAllProviders } from '@/lib/print/polling';

/**
 * Cron endpoint for polling print provider order status
 * Feature: BS-604
 *
 * Usage with Vercel Cron:
 * Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/poll-orders",
 *     "schedule": "0,30 * * * *"
 *   }]
 * }
 *
 * Or call manually: POST /api/cron/poll-orders?token=CRON_SECRET
 */

export async function POST(request: NextRequest) {
  // Verify cron token for security
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && token !== cronSecret) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    console.log('Starting order polling job...');
    await pollAllProviders();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in polling job:', error);
    return NextResponse.json(
      { error: 'Polling job failed' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    service: 'Order Polling Cron Job',
    schedule: '*/30 * * * *', // Every 30 minutes
    note: 'Use POST to trigger manually with ?token=CRON_SECRET',
  });
}
