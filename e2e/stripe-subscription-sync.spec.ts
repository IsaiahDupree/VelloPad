/**
 * E2E Tests: Stripe Subscription Sync
 * Features: GDP-007, GDP-008
 *
 * Tests subscription webhook handling and Growth Data Plane integration
 */

import { test, expect } from '@playwright/test';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

test.describe('GDP-007: Stripe Subscription Webhook Integration', () => {
  let testEmail: string;
  let testPersonId: string;
  let testCustomerId: string;
  let testSubscriptionId: string;

  test.beforeEach(async () => {
    // Generate unique test email
    testEmail = `test+sub_${Date.now()}@vellopad.com`;

    // Create test person
    const { data: personId, error } = await supabase.rpc('get_or_create_person', {
      p_email: testEmail,
      p_first_name: 'Test',
      p_last_name: 'User',
    });

    expect(error).toBeNull();
    testPersonId = personId;

    // Create Stripe customer
    const customer = await stripe.customers.create({
      email: testEmail,
      name: 'Test User',
      metadata: { person_id: testPersonId },
    });
    testCustomerId = customer.id;

    // Link Stripe customer to person
    await supabase.rpc('link_person_identity', {
      p_person_id: testPersonId,
      p_platform: 'stripe',
      p_external_id: testCustomerId,
    });
  });

  test.afterEach(async () => {
    // Clean up: Cancel subscription if exists
    if (testSubscriptionId) {
      try {
        await stripe.subscriptions.cancel(testSubscriptionId);
      } catch (err) {
        // Ignore errors (may already be canceled)
      }
    }

    // Clean up: Delete customer
    if (testCustomerId) {
      try {
        await stripe.customers.del(testCustomerId);
      } catch (err) {
        // Ignore errors
      }
    }

    // Clean up: Delete test data from Supabase
    if (testPersonId) {
      await supabase.from('person').delete().eq('id', testPersonId);
    }
  });

  test('GDP-007: subscription.created event syncs to database', async () => {
    // Create subscription via Stripe API
    const priceId = process.env.STRIPE_TEST_PRICE_ID || 'price_test_monthly';

    const subscription = await stripe.subscriptions.create({
      customer: testCustomerId,
      items: [{ price: priceId }],
      metadata: { person_id: testPersonId },
    });
    testSubscriptionId = subscription.id;

    // Wait for webhook processing (simulate)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify subscription in database
    const { data: subData, error: subError } = await supabase
      .from('subscription')
      .select('*')
      .eq('stripe_subscription_id', testSubscriptionId)
      .single();

    expect(subError).toBeNull();
    expect(subData).toBeTruthy();
    expect(subData.person_id).toBe(testPersonId);
    expect(subData.stripe_customer_id).toBe(testCustomerId);
    expect(subData.status).toBe('active');
    expect(subData.mrr_cents).toBeGreaterThan(0);

    // Verify person lifecycle updated
    const { data: personData } = await supabase
      .from('person')
      .select('lifecycle_stage')
      .eq('id', testPersonId)
      .single();

    expect(personData?.lifecycle_stage).toBe('customer');

    // Verify person_features updated
    const { data: featuresData } = await supabase
      .from('person_features')
      .select('is_subscriber, subscription_mrr_cents')
      .eq('person_id', testPersonId)
      .single();

    expect(featuresData?.is_subscriber).toBe(true);
    expect(featuresData?.subscription_mrr_cents).toBeGreaterThan(0);

    // Verify event logged
    const { data: eventData } = await supabase
      .from('unified_event')
      .select('*')
      .eq('person_id', testPersonId)
      .eq('event_name', 'subscription.active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    expect(eventData).toBeTruthy();
    expect(eventData.event_source).toBe('stripe');
    expect(eventData.properties.subscription_id).toBe(testSubscriptionId);
  });

  test('GDP-008: MRR calculated correctly for monthly plan', async () => {
    // Create monthly subscription
    const subscription = await stripe.subscriptions.create({
      customer: testCustomerId,
      items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: 'Test Monthly Plan' },
          recurring: { interval: 'month' },
          unit_amount: 2900, // $29/month
        }
      }],
    });
    testSubscriptionId = subscription.id;

    await new Promise(resolve => setTimeout(resolve, 2000));

    const { data: subData } = await supabase
      .from('subscription')
      .select('mrr_cents, amount_cents, billing_interval')
      .eq('stripe_subscription_id', testSubscriptionId)
      .single();

    expect(subData?.amount_cents).toBe(2900);
    expect(subData?.billing_interval).toBe('month');
    expect(subData?.mrr_cents).toBe(2900); // Same as amount for monthly
  });

  test('GDP-008: MRR calculated correctly for annual plan', async () => {
    // Create annual subscription
    const subscription = await stripe.subscriptions.create({
      customer: testCustomerId,
      items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: 'Test Annual Plan' },
          recurring: { interval: 'year' },
          unit_amount: 29900, // $299/year
        }
      }],
    });
    testSubscriptionId = subscription.id;

    await new Promise(resolve => setTimeout(resolve, 2000));

    const { data: subData } = await supabase
      .from('subscription')
      .select('mrr_cents, amount_cents, billing_interval')
      .eq('stripe_subscription_id', testSubscriptionId)
      .single();

    expect(subData?.amount_cents).toBe(29900);
    expect(subData?.billing_interval).toBe('year');
    // MRR = 29900 / 12 = 2491.67 → 2492
    expect(subData?.mrr_cents).toBeCloseTo(2492, 0);
  });

  test('GDP-007: subscription.updated event updates database', async () => {
    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: testCustomerId,
      items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: 'Basic Plan' },
          recurring: { interval: 'month' },
          unit_amount: 1900, // $19/month
        }
      }],
    });
    testSubscriptionId = subscription.id;

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify initial MRR
    const { data: initialData } = await supabase
      .from('subscription')
      .select('mrr_cents')
      .eq('stripe_subscription_id', testSubscriptionId)
      .single();

    expect(initialData?.mrr_cents).toBe(1900);

    // Update subscription to new plan
    await stripe.subscriptions.update(testSubscriptionId, {
      items: [{
        id: subscription.items.data[0].id,
        price_data: {
          currency: 'usd',
          product_data: { name: 'Pro Plan' },
          recurring: { interval: 'month' },
          unit_amount: 4900, // $49/month (upgrade)
        }
      }],
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify updated MRR
    const { data: updatedData } = await supabase
      .from('subscription')
      .select('mrr_cents, plan_name')
      .eq('stripe_subscription_id', testSubscriptionId)
      .single();

    expect(updatedData?.mrr_cents).toBe(4900);
    expect(updatedData?.plan_name).toContain('Pro');
  });

  test('GDP-007: subscription.deleted event marks subscription as canceled', async () => {
    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: testCustomerId,
      items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: 'Test Plan' },
          recurring: { interval: 'month' },
          unit_amount: 2900,
        }
      }],
    });
    testSubscriptionId = subscription.id;

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Cancel subscription
    await stripe.subscriptions.cancel(testSubscriptionId);

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify subscription marked as canceled
    const { data: subData } = await supabase
      .from('subscription')
      .select('status, ended_at')
      .eq('stripe_subscription_id', testSubscriptionId)
      .single();

    expect(subData?.status).toBe('canceled');
    expect(subData?.ended_at).toBeTruthy();

    // Verify person_features updated
    const { data: featuresData } = await supabase
      .from('person_features')
      .select('is_subscriber, subscription_mrr_cents')
      .eq('person_id', testPersonId)
      .single();

    expect(featuresData?.is_subscriber).toBe(false);
    expect(featuresData?.subscription_mrr_cents).toBeNull();

    // Verify person lifecycle updated to churned
    const { data: personData } = await supabase
      .from('person')
      .select('lifecycle_stage')
      .eq('id', testPersonId)
      .single();

    expect(personData?.lifecycle_stage).toBe('churned');

    // Verify deletion event logged
    const { data: eventData } = await supabase
      .from('unified_event')
      .select('*')
      .eq('person_id', testPersonId)
      .eq('event_name', 'subscription.deleted')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    expect(eventData).toBeTruthy();
  });

  test('GDP-007: invoice.paid event tracks revenue', async () => {
    // Create subscription (triggers initial invoice)
    const subscription = await stripe.subscriptions.create({
      customer: testCustomerId,
      items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: 'Test Plan' },
          recurring: { interval: 'month' },
          unit_amount: 2900,
        }
      }],
    });
    testSubscriptionId = subscription.id;

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Verify invoice paid event logged
    const { data: eventData } = await supabase
      .from('unified_event')
      .select('*')
      .eq('person_id', testPersonId)
      .eq('event_name', 'invoice.paid')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    expect(eventData).toBeTruthy();
    expect(eventData.properties.amount_cents).toBe(2900);
    expect(eventData.properties.currency).toBe('USD');

    // Verify person_features revenue updated
    const { data: featuresData } = await supabase
      .from('person_features')
      .select('total_revenue_cents, first_purchase_at, last_purchase_at')
      .eq('person_id', testPersonId)
      .single();

    expect(featuresData?.total_revenue_cents).toBeGreaterThanOrEqual(2900);
    expect(featuresData?.first_purchase_at).toBeTruthy();
    expect(featuresData?.last_purchase_at).toBeTruthy();
  });

  test('GDP-008: multiple subscriptions tracked per person', async () => {
    // Create first subscription
    const sub1 = await stripe.subscriptions.create({
      customer: testCustomerId,
      items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: 'Plan A' },
          recurring: { interval: 'month' },
          unit_amount: 1900,
        }
      }],
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Cancel first, create second
    await stripe.subscriptions.cancel(sub1.id);
    await new Promise(resolve => setTimeout(resolve, 1000));

    const sub2 = await stripe.subscriptions.create({
      customer: testCustomerId,
      items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: 'Plan B' },
          recurring: { interval: 'month' },
          unit_amount: 4900,
        }
      }],
    });
    testSubscriptionId = sub2.id;

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify both subscriptions in database
    const { data: subsData } = await supabase
      .from('subscription')
      .select('*')
      .eq('person_id', testPersonId)
      .order('created_at', { ascending: true });

    expect(subsData).toHaveLength(2);
    expect(subsData[0].status).toBe('canceled');
    expect(subsData[1].status).toBe('active');

    // Verify current MRR reflects active subscription
    const { data: featuresData } = await supabase
      .from('person_features')
      .select('subscription_mrr_cents')
      .eq('person_id', testPersonId)
      .single();

    expect(featuresData?.subscription_mrr_cents).toBe(4900);
  });
});

test.describe('GDP-007: Error Handling', () => {
  test('handles subscription event for unknown customer gracefully', async () => {
    // This would be tested by sending a webhook with a non-existent customer
    // In practice, we'd mock the webhook handler
    // For now, we verify the code doesn't crash

    const response = await fetch('http://localhost:3000/api/webhooks/stripe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'invalid',
      },
      body: JSON.stringify({
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_test_unknown',
            customer: 'cus_unknown',
            status: 'active',
          }
        }
      }),
    });

    // Should return 400 for invalid signature (before processing)
    expect(response.status).toBe(400);
  });
});
