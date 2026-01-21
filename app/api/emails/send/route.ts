/**
 * Manual Email Trigger Endpoint
 * Feature: BS-702
 *
 * Allows manual triggering of lifecycle emails for testing and support.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { lifecycleEmailTriggers, lifecycleEmailService } from '@/lib/email/lifecycle';

export const runtime = 'edge';

// ============================================================================
// SEND LIFECYCLE EMAIL
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { emailType, userId, bookId, orderId } = body;

    if (!emailType) {
      return NextResponse.json(
        { error: 'emailType is required' },
        { status: 400 }
      );
    }

    let result;

    switch (emailType) {
      case 'activation':
        result = await lifecycleEmailTriggers.sendActivationEmail(
          userId || user.id
        );
        break;

      case 'stalled_writer':
        result = await lifecycleEmailTriggers.sendStalledWriterEmail(
          userId || user.id
        );
        break;

      case 'proof_push':
        if (!bookId) {
          return NextResponse.json(
            { error: 'bookId is required for proof_push' },
            { status: 400 }
          );
        }
        result = await lifecycleEmailTriggers.sendProofPushEmail(
          userId || user.id,
          bookId
        );
        break;

      case 'post_delivery':
        if (!orderId) {
          return NextResponse.json(
            { error: 'orderId is required for post_delivery' },
            { status: 400 }
          );
        }
        result = await lifecycleEmailTriggers.sendPostDeliveryEmail(
          userId || user.id,
          orderId
        );
        break;

      case 'first_draft_complete':
        if (!bookId) {
          return NextResponse.json(
            { error: 'bookId is required for first_draft_complete' },
            { status: 400 }
          );
        }
        result = await lifecycleEmailTriggers.sendFirstDraftCompleteEmail(
          userId || user.id,
          bookId
        );
        break;

      case 'order_confirmation':
        if (!orderId) {
          return NextResponse.json(
            { error: 'orderId is required for order_confirmation' },
            { status: 400 }
          );
        }
        result = await lifecycleEmailTriggers.sendOrderConfirmationEmail(
          userId || user.id,
          orderId
        );
        break;

      case 'order_shipped':
        if (!orderId) {
          return NextResponse.json(
            { error: 'orderId is required for order_shipped' },
            { status: 400 }
          );
        }
        result = await lifecycleEmailTriggers.sendOrderShippedEmail(
          userId || user.id,
          orderId
        );
        break;

      default:
        return NextResponse.json(
          { error: `Unknown email type: ${emailType}` },
          { status: 400 }
        );
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        emailSendId: result.emailSendId,
        providerMessageId: result.providerMessageId,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Email send error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// UPDATE EMAIL STATUS (Webhook from Resend)
// ============================================================================

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { emailSendId, status, metadata } = body;

    if (!emailSendId || !status) {
      return NextResponse.json(
        { error: 'emailSendId and status are required' },
        { status: 400 }
      );
    }

    const validStatuses = ['delivered', 'opened', 'clicked', 'bounced', 'failed'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status: ${status}` },
        { status: 400 }
      );
    }

    const success = await lifecycleEmailService.updateEmailStatus(
      emailSendId,
      status,
      metadata
    );

    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to update email status' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Email status update error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
