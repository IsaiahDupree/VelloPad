# Stripe Subscription Sync

**Features:** GDP-007, GDP-008

## Overview

The Stripe Subscription Sync system handles Stripe webhook events and syncs subscription data to the Growth Data Plane for MRR tracking, lifecycle management, and analytics.

## Architecture

```
Stripe Webhooks → /api/webhooks/stripe → subscription-sync.ts → Growth Data Plane
                                                ↓
                                          person, subscription,
                                          person_features, unified_event
```

## Features

### GDP-007: Stripe Webhook Integration
- Handles subscription events from Stripe webhooks
- Maps `stripe_customer_id` to `person_id` via identity_link table
- Logs all subscription events to `unified_event` for analytics

### GDP-008: Subscription Snapshot
- Upserts subscription data to `subscription` table
- Calculates MRR (Monthly Recurring Revenue) in cents
- Updates `person` lifecycle stage (lead → customer → churned)
- Updates `person_features` with subscription status and MRR

## Supported Events

| Event Type | Handler | Description |
|------------|---------|-------------|
| `customer.subscription.created` | `syncSubscription()` | New subscription created |
| `customer.subscription.updated` | `syncSubscription()` | Subscription plan/status changed |
| `customer.subscription.deleted` | `handleSubscriptionDeleted()` | Subscription canceled/ended |
| `invoice.paid` | `handleInvoicePaid()` | Invoice payment succeeded |
| `invoice.payment_failed` | `handleInvoicePaymentFailed()` | Invoice payment failed |

## Functions

### `syncSubscription(subscription: Stripe.Subscription)`

Syncs subscription data to Growth Data Plane:
1. Finds person by Stripe customer ID via `identity_link`
2. Calculates MRR based on billing interval
3. Upserts `subscription` table with latest data
4. Updates `person.lifecycle_stage` to 'customer'
5. Updates `person_features.is_subscriber` and `subscription_mrr_cents`
6. Logs event to `unified_event`

### `handleSubscriptionDeleted(subscription: Stripe.Subscription)`

Handles subscription cancellation:
1. Marks subscription as `canceled` in `subscription` table
2. Sets `ended_at` timestamp
3. Updates `person_features.is_subscriber` to false
4. Updates `person.lifecycle_stage` to 'churned'
5. Logs cancellation event

### `handleInvoicePaid(invoice: Stripe.Invoice)`

Tracks revenue from paid invoices:
1. Finds person by customer ID
2. Logs `invoice.paid` event with amount
3. Updates `person_features.total_revenue_cents`
4. Tracks `first_purchase_at` and `last_purchase_at`

### `handleInvoicePaymentFailed(invoice: Stripe.Invoice)`

Logs failed payment attempts for retention analysis.

### `linkStripeCustomerToPerson(customerId: string, email: string)`

Links a Stripe customer to a person record:
1. Gets or creates person by email
2. Creates identity link with platform='stripe'

## MRR Calculation

```typescript
function calculateMRR(amount: number, interval: 'month' | 'year'): number {
  if (interval === 'month') {
    return amount;
  } else if (interval === 'year') {
    return Math.round(amount / 12);
  }
  return amount;
}
```

## Person Lifecycle Flow

```
lead → activated → customer → churned
         ↑              ↑          ↑
      signup    subscription  cancellation
```

## Database Tables

### `subscription`
- Stores current subscription state
- Tracks MRR, billing interval, status
- Links to `person` via `person_id`
- Unique constraint on `stripe_subscription_id`

### `person`
- `lifecycle_stage` updated based on subscription status
- `last_seen_at` updated on subscription events

### `person_features`
- `is_subscriber`: boolean indicating active subscription
- `subscription_mrr_cents`: current MRR value
- `total_revenue_cents`: lifetime revenue
- `first_purchase_at`, `last_purchase_at`: revenue timestamps

### `unified_event`
- All subscription events logged with:
  - `event_name`: `subscription.active`, `subscription.canceled`, etc.
  - `event_source`: 'stripe'
  - `properties`: subscription details (plan, MRR, status)

## Usage

### Webhook Handler

```typescript
import { syncSubscription } from '@/lib/stripe/subscription-sync';

case "customer.subscription.created":
case "customer.subscription.updated": {
  const subscription = event.data.object as Stripe.Subscription;
  await syncSubscription(subscription);
  break;
}
```

### Manual Sync

```typescript
import { syncSubscription } from '@/lib/stripe/subscription-sync';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const subscription = await stripe.subscriptions.retrieve('sub_xxx');
await syncSubscription(subscription);
```

## Error Handling

- If person not found for Stripe customer, logs error and returns early
- All database errors are logged with `[GDP-007]` or `[GDP-008]` prefixes
- Failed sync operations throw errors to trigger webhook retry

## Testing

See `e2e/stripe-subscription-sync.spec.ts` for E2E tests covering:
- Subscription creation → person becomes customer
- Subscription update → MRR recalculated
- Subscription cancellation → person churned
- Invoice paid → revenue tracked

## Configuration

### Environment Variables

```env
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
SUPABASE_SERVICE_ROLE_KEY=eyJhbGxxx (for RLS bypass)
```

### Stripe Webhook Setup

1. Go to Stripe Dashboard → Webhooks
2. Add endpoint: `https://vellopad.com/api/webhooks/stripe`
3. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
4. Copy signing secret to `STRIPE_WEBHOOK_SECRET`

## Future Enhancements

1. **Proration Handling**: Track prorated charges separately
2. **Coupon Tracking**: Store discount codes and amounts
3. **Seat-Based Pricing**: Handle multi-seat subscriptions
4. **Subscription Items**: Support multiple line items per subscription
5. **Dunning Management**: Automated retry logic for failed payments
6. **Expansion Revenue**: Track upgrades/downgrades separately

## Related Features

- **BS-502**: Stripe Checkout (creates customers and subscriptions)
- **GDP-001**: Growth Data Plane Schema
- **GDP-002**: Person & Identity Tables
- **GDP-003**: Unified Events Table
- **GDP-009**: PostHog Identity Stitching
- **GDP-011**: Person Features Computation

## References

- [Stripe Subscription API](https://stripe.com/docs/api/subscriptions)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Growth Data Plane PRD](../../VelloPad/GROWTH_DATA_PLANE.md)
