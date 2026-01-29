/**
 * Stripe Subscription Sync
 * Feature: GDP-007, GDP-008
 *
 * Handles Stripe subscription events and syncs to the Growth Data Plane
 * subscription table for MRR tracking and person lifecycle management.
 */

import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Use service role for bypassing RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Calculate MRR (Monthly Recurring Revenue) in cents
 */
function calculateMRR(amount: number, interval: 'month' | 'year'): number {
  if (interval === 'month') {
    return amount;
  } else if (interval === 'year') {
    // Annual subscriptions: divide by 12 to get monthly value
    return Math.round(amount / 12);
  }
  return amount;
}

/**
 * Handle subscription created/updated events
 * Features: GDP-007, GDP-008
 */
export async function syncSubscription(subscription: Stripe.Subscription): Promise<void> {
  console.log('[GDP-007] Syncing subscription:', subscription.id);

  const customerId = subscription.customer as string;
  const subscriptionId = subscription.id;
  const status = subscription.status;

  // Extract plan details from first item (assumes single-plan subscription)
  const priceItem = subscription.items.data[0];
  const price = priceItem.price;
  const planName = price.nickname || price.product as string;
  const planId = price.id;
  const billingInterval = price.recurring?.interval as 'month' | 'year';
  const currency = price.currency.toUpperCase();
  const amountCents = price.unit_amount || 0;
  const mrrCents = calculateMRR(amountCents, billingInterval);

  // Find person by Stripe customer ID
  const { data: identityLink, error: identityError } = await supabase
    .from('identity_link')
    .select('person_id')
    .eq('platform', 'stripe')
    .eq('external_id', customerId)
    .single();

  if (identityError || !identityLink) {
    console.error('[GDP-007] Person not found for Stripe customer:', customerId, identityError);
    // TODO: Create person if not exists (from customer email)
    return;
  }

  const personId = identityLink.person_id;

  // Upsert subscription
  const { error: upsertError } = await supabase
    .from('subscription')
    .upsert({
      person_id: personId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      plan_name: planName,
      plan_id: planId,
      status: status,
      billing_interval: billingInterval,
      currency: currency,
      amount_cents: amountCents,
      mrr_cents: mrrCents,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
      trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
      canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
      ended_at: subscription.ended_at ? new Date(subscription.ended_at * 1000).toISOString() : null,
      properties: {
        metadata: subscription.metadata,
        items: subscription.items.data.map(item => ({
          id: item.id,
          price_id: item.price.id,
          quantity: item.quantity,
        })),
      },
    }, {
      onConflict: 'stripe_subscription_id',
    });

  if (upsertError) {
    console.error('[GDP-008] Failed to upsert subscription:', upsertError);
    throw upsertError;
  }

  // Update person lifecycle stage
  if (status === 'active' || status === 'trialing') {
    const { error: personError } = await supabase
      .from('person')
      .update({
        lifecycle_stage: 'customer',
        last_seen_at: new Date().toISOString(),
      })
      .eq('id', personId);

    if (personError) {
      console.error('[GDP-008] Failed to update person lifecycle:', personError);
    }
  }

  // Update person_features
  const isActive = ['active', 'trialing'].includes(status);
  const { error: featuresError } = await supabase
    .from('person_features')
    .upsert({
      person_id: personId,
      is_subscriber: isActive,
      subscription_mrr_cents: isActive ? mrrCents : null,
    }, {
      onConflict: 'person_id',
    });

  if (featuresError) {
    console.error('[GDP-008] Failed to update person features:', featuresError);
  }

  // Log event to unified_event
  const { error: eventError } = await supabase
    .from('unified_event')
    .insert({
      person_id: personId,
      event_name: `subscription.${subscription.status}`,
      event_source: 'stripe',
      event_timestamp: new Date().toISOString(),
      properties: {
        subscription_id: subscriptionId,
        plan_name: planName,
        plan_id: planId,
        status: status,
        mrr_cents: mrrCents,
        billing_interval: billingInterval,
      },
      raw_event: subscription as unknown as Record<string, any>,
    });

  if (eventError) {
    console.error('[GDP-007] Failed to log subscription event:', eventError);
  }

  console.log('[GDP-008] ✅ Subscription synced:', subscriptionId, { personId, status, mrrCents });
}

/**
 * Handle subscription deleted event
 * Features: GDP-007, GDP-008
 */
export async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  console.log('[GDP-007] Handling subscription deletion:', subscription.id);

  const subscriptionId = subscription.id;

  // Mark subscription as canceled/ended
  const { error: updateError } = await supabase
    .from('subscription')
    .update({
      status: 'canceled',
      ended_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscriptionId);

  if (updateError) {
    console.error('[GDP-008] Failed to mark subscription as deleted:', updateError);
    throw updateError;
  }

  // Get person_id from subscription
  const { data: sub, error: subError } = await supabase
    .from('subscription')
    .select('person_id')
    .eq('stripe_subscription_id', subscriptionId)
    .single();

  if (subError || !sub) {
    console.error('[GDP-007] Subscription not found:', subscriptionId);
    return;
  }

  // Update person_features
  const { error: featuresError } = await supabase
    .from('person_features')
    .update({
      is_subscriber: false,
      subscription_mrr_cents: null,
    })
    .eq('person_id', sub.person_id);

  if (featuresError) {
    console.error('[GDP-008] Failed to update person features:', featuresError);
  }

  // Update person lifecycle to churned (if they were a customer)
  const { error: personError } = await supabase
    .from('person')
    .update({
      lifecycle_stage: 'churned',
    })
    .eq('id', sub.person_id)
    .eq('lifecycle_stage', 'customer');

  if (personError) {
    console.error('[GDP-008] Failed to update person lifecycle:', personError);
  }

  // Log event
  const { error: eventError } = await supabase
    .from('unified_event')
    .insert({
      person_id: sub.person_id,
      event_name: 'subscription.deleted',
      event_source: 'stripe',
      event_timestamp: new Date().toISOString(),
      properties: {
        subscription_id: subscriptionId,
      },
      raw_event: subscription as unknown as Record<string, any>,
    });

  if (eventError) {
    console.error('[GDP-007] Failed to log subscription deleted event:', eventError);
  }

  console.log('[GDP-008] ✅ Subscription marked as deleted:', subscriptionId);
}

/**
 * Handle invoice paid event
 * Track revenue and update person features
 */
export async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  console.log('[GDP-007] Handling invoice paid:', invoice.id);

  const customerId = invoice.customer as string;
  const amountPaid = invoice.amount_paid;
  const subscriptionId = invoice.subscription as string | null;

  // Find person by Stripe customer ID
  const { data: identityLink, error: identityError } = await supabase
    .from('identity_link')
    .select('person_id')
    .eq('platform', 'stripe')
    .eq('external_id', customerId)
    .single();

  if (identityError || !identityLink) {
    console.error('[GDP-007] Person not found for invoice:', invoice.id);
    return;
  }

  const personId = identityLink.person_id;

  // Log revenue event
  const { error: eventError } = await supabase
    .from('unified_event')
    .insert({
      person_id: personId,
      event_name: 'invoice.paid',
      event_source: 'stripe',
      event_timestamp: new Date(invoice.created * 1000).toISOString(),
      properties: {
        invoice_id: invoice.id,
        subscription_id: subscriptionId,
        amount_cents: amountPaid,
        currency: invoice.currency.toUpperCase(),
      },
      raw_event: invoice as unknown as Record<string, any>,
    });

  if (eventError) {
    console.error('[GDP-007] Failed to log invoice paid event:', eventError);
  }

  // Update person_features revenue tracking
  const now = new Date().toISOString();
  const { error: featuresError } = await supabase.rpc('update_person_revenue', {
    p_person_id: personId,
    p_amount_cents: amountPaid,
    p_timestamp: now,
  }).catch(async () => {
    // Fallback: manual update if function doesn't exist
    const { data: currentFeatures } = await supabase
      .from('person_features')
      .select('total_revenue_cents, first_purchase_at')
      .eq('person_id', personId)
      .single();

    const totalRevenue = (currentFeatures?.total_revenue_cents || 0) + amountPaid;
    const firstPurchaseAt = currentFeatures?.first_purchase_at || now;

    await supabase
      .from('person_features')
      .upsert({
        person_id: personId,
        total_revenue_cents: totalRevenue,
        first_purchase_at: firstPurchaseAt,
        last_purchase_at: now,
      }, {
        onConflict: 'person_id',
      });
  });

  if (featuresError) {
    console.error('[GDP-008] Failed to update person revenue:', featuresError);
  }

  console.log('[GDP-008] ✅ Invoice paid processed:', invoice.id, { personId, amountPaid });
}

/**
 * Handle invoice payment failed event
 */
export async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  console.log('[GDP-007] Handling invoice payment failed:', invoice.id);

  const customerId = invoice.customer as string;
  const subscriptionId = invoice.subscription as string | null;

  // Find person
  const { data: identityLink } = await supabase
    .from('identity_link')
    .select('person_id')
    .eq('platform', 'stripe')
    .eq('external_id', customerId)
    .single();

  if (!identityLink) {
    console.error('[GDP-007] Person not found for failed invoice:', invoice.id);
    return;
  }

  const personId = identityLink.person_id;

  // Log failed payment event
  await supabase
    .from('unified_event')
    .insert({
      person_id: personId,
      event_name: 'invoice.payment_failed',
      event_source: 'stripe',
      event_timestamp: new Date().toISOString(),
      properties: {
        invoice_id: invoice.id,
        subscription_id: subscriptionId,
        amount_due: invoice.amount_due,
        currency: invoice.currency.toUpperCase(),
        attempt_count: invoice.attempt_count,
      },
      raw_event: invoice as unknown as Record<string, any>,
    });

  console.log('[GDP-007] ✅ Invoice payment failed logged:', invoice.id);
}

/**
 * Link Stripe customer to person record
 * Called when we need to create the identity link
 */
export async function linkStripeCustomerToPerson(
  customerId: string,
  email: string
): Promise<string | null> {
  console.log('[GDP-007] Linking Stripe customer to person:', customerId, email);

  // Get or create person by email
  const { data: personData, error: personError } = await supabase.rpc('get_or_create_person', {
    p_email: email,
  });

  if (personError) {
    console.error('[GDP-007] Failed to get/create person:', personError);
    return null;
  }

  const personId = personData;

  // Link Stripe customer ID to person
  const { error: linkError } = await supabase.rpc('link_person_identity', {
    p_person_id: personId,
    p_platform: 'stripe',
    p_external_id: customerId,
  });

  if (linkError) {
    console.error('[GDP-007] Failed to link Stripe customer:', linkError);
    return null;
  }

  console.log('[GDP-007] ✅ Stripe customer linked:', { customerId, personId });
  return personId;
}
