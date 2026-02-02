/**
 * Verify Sending Domain DNS Configuration (MT-009)
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkDomainVerification } from '@/lib/email/sending-domains';

export const runtime = 'nodejs';

/**
 * POST /api/admin/sending-domains/[id]/verify
 * Verify DNS configuration for a sending domain
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Domain ID is required' }, { status: 400 });
    }

    // Check verification status with Resend
    const domain = await checkDomainVerification(id);

    return NextResponse.json({ domain }, { status: 200 });
  } catch (error) {
    console.error('Error verifying sending domain:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to verify sending domain',
      },
      { status: 500 }
    );
  }
}
