/**
 * Lifecycle Email Cron Job
 * Feature: BS-702
 *
 * Scheduled task to send lifecycle emails based on user activity.
 * Run this via cron (e.g., Vercel Cron, GitHub Actions, or external cron service)
 *
 * Schedule recommendations:
 * - Every hour: Check for activation emails (24h after signup)
 * - Daily: Check for stalled writer emails (7d inactive)
 * - Daily: Check for proof push emails (3d after PDF)
 * - Daily: Check for post-delivery emails (7d after delivery)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { lifecycleEmailTriggers } from '@/lib/email/lifecycle';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

// ============================================================================
// CRON ENDPOINT
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (for security)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const results = {
      activation: 0,
      stalledWriter: 0,
      proofPush: 0,
      postDelivery: 0,
      errors: [] as string[],
    };

    // ==========================================================================
    // 1. ACTIVATION EMAILS (24h after signup, no books created)
    // ==========================================================================

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Get users who signed up ~24h ago
    const { data: newUsers } = await supabase.auth.admin.listUsers();

    if (newUsers?.users) {
      for (const user of newUsers.users) {
        const createdAt = new Date(user.created_at);
        const hoursSinceSignup =
          (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);

        // Send activation email if between 24-25 hours since signup
        if (hoursSinceSignup >= 24 && hoursSinceSignup < 25) {
          // Check if already sent activation email
          const { data: existingSend } = await supabase
            .from('email_sends')
            .select('id')
            .eq('user_id', user.id)
            .eq('trigger_event', 'user_inactive_24h')
            .limit(1)
            .single();

          if (!existingSend) {
            try {
              const result = await lifecycleEmailTriggers.sendActivationEmail(
                user.id
              );
              if (result.success) {
                results.activation++;
              } else if (result.error && !result.error.includes('already active')) {
                results.errors.push(
                  `Activation email failed for ${user.id}: ${result.error}`
                );
              }
            } catch (error: any) {
              results.errors.push(
                `Activation email error for ${user.id}: ${error.message}`
              );
            }
          }
        }
      }
    }

    // ==========================================================================
    // 2. STALLED WRITER EMAILS (7 days inactive)
    // ==========================================================================

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Get books that haven't been updated in 7 days
    const { data: stalledBooks } = await supabase
      .from('books')
      .select('id, workspace_id, updated_at')
      .lt('updated_at', sevenDaysAgo);

    if (stalledBooks) {
      for (const book of stalledBooks) {
        // Get workspace owner
        const { data: workspace } = await supabase
          .from('workspaces')
          .select('owner_id')
          .eq('id', book.workspace_id)
          .single();

        if (workspace?.owner_id) {
          // Check if already sent stalled email in last 7 days
          const { data: existingSend } = await supabase
            .from('email_sends')
            .select('id')
            .eq('user_id', workspace.owner_id)
            .eq('trigger_event', 'user_inactive_7d')
            .gte('created_at', sevenDaysAgo)
            .limit(1)
            .single();

          if (!existingSend) {
            try {
              const result = await lifecycleEmailTriggers.sendStalledWriterEmail(
                workspace.owner_id
              );
              if (result.success) {
                results.stalledWriter++;
              } else if (result.error && !result.error.includes('No books')) {
                results.errors.push(
                  `Stalled writer email failed for ${workspace.owner_id}: ${result.error}`
                );
              }
            } catch (error: any) {
              results.errors.push(
                `Stalled writer email error for ${workspace.owner_id}: ${error.message}`
              );
            }
          }
        }
      }
    }

    // ==========================================================================
    // 3. PROOF PUSH EMAILS (3 days after PDF, no order)
    // ==========================================================================

    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

    // Get completed renditions from ~3 days ago without orders
    const { data: renditions } = await supabase
      .from('renditions')
      .select('id, book_id, created_at, books(workspace_id)')
      .eq('status', 'completed')
      .lt('created_at', threeDaysAgo);

    if (renditions) {
      for (const rendition of renditions) {
        // Check if book has any orders
        const { data: orders } = await supabase
          .from('orders')
          .select('id')
          .eq('book_id', rendition.book_id)
          .limit(1);

        if (!orders || orders.length === 0) {
          // Get workspace owner
          const book = rendition.books as unknown as { workspace_id: string } | null;
          const { data: workspace } = await supabase
            .from('workspaces')
            .select('owner_id')
            .eq('id', book?.workspace_id)
            .single();

          if (workspace?.owner_id) {
            // Check if already sent proof push email
            const { data: existingSend } = await supabase
              .from('email_sends')
              .select('id')
              .eq('user_id', workspace.owner_id)
              .eq('trigger_event', 'rendition_complete_no_order_3d')
              .eq('metadata->>book_id', rendition.book_id)
              .limit(1)
              .single();

            if (!existingSend) {
              try {
                const result = await lifecycleEmailTriggers.sendProofPushEmail(
                  workspace.owner_id,
                  rendition.book_id
                );
                if (result.success) {
                  results.proofPush++;
                }
              } catch (error: any) {
                results.errors.push(
                  `Proof push email error for ${workspace.owner_id}: ${error.message}`
                );
              }
            }
          }
        }
      }
    }

    // ==========================================================================
    // 4. POST-DELIVERY EMAILS (7 days after delivery)
    // ==========================================================================

    // Get orders delivered ~7 days ago
    const { data: deliveredOrders } = await supabase
      .from('orders')
      .select('id, workspace_id')
      .eq('status', 'delivered')
      .lt('updated_at', sevenDaysAgo);

    if (deliveredOrders) {
      for (const order of deliveredOrders) {
        // Get workspace owner
        const { data: workspace } = await supabase
          .from('workspaces')
          .select('owner_id')
          .eq('id', order.workspace_id)
          .single();

        if (workspace?.owner_id) {
          // Check if already sent post-delivery email
          const { data: existingSend } = await supabase
            .from('email_sends')
            .select('id')
            .eq('user_id', workspace.owner_id)
            .eq('trigger_event', 'order_delivered_7d')
            .eq('metadata->>order_id', order.id)
            .limit(1)
            .single();

          if (!existingSend) {
            try {
              const result = await lifecycleEmailTriggers.sendPostDeliveryEmail(
                workspace.owner_id,
                order.id
              );
              if (result.success) {
                results.postDelivery++;
              }
            } catch (error: any) {
              results.errors.push(
                `Post-delivery email error for ${workspace.owner_id}: ${error.message}`
              );
            }
          }
        }
      }
    }

    // ==========================================================================
    // RESPONSE
    // ==========================================================================

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results: {
        activationEmailsSent: results.activation,
        stalledWriterEmailsSent: results.stalledWriter,
        proofPushEmailsSent: results.proofPush,
        postDeliveryEmailsSent: results.postDelivery,
        totalEmailsSent:
          results.activation +
          results.stalledWriter +
          results.proofPush +
          results.postDelivery,
        errors: results.errors,
      },
    });
  } catch (error: any) {
    console.error('Lifecycle email cron error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
