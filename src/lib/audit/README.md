# Audit Logging System

**Feature:** BS-902 - Commerce + provider audit logs (PII redaction)

## Overview

The audit logging system provides comprehensive tracking of all commerce-related events with automatic PII (Personally Identifiable Information) redaction for privacy compliance (GDPR, CCPA, etc.).

## Features

- **Automatic PII Redaction**: Sensitive data is automatically redacted before storage
- **Dual Payload Storage**: Both raw and sanitized versions are stored (raw for debugging, sanitized for general access)
- **Row-Level Security**: Different access levels for admins vs. regular users
- **Provider-Agnostic**: Works with Stripe, Prodigi, Gelato, Lulu, Peecho, and custom events
- **IP Address Auto-Redaction**: IP addresses are automatically redacted after 90 days
- **Comprehensive Event Types**: Webhooks, admin actions, order events, payment events

## Usage

### Logging a Webhook Event

```typescript
import { logWebhookEvent } from '@/lib/audit'

await logWebhookEvent({
  provider: 'stripe',
  eventType: 'checkout.session.completed',
  orderId: 'ord_123',
  payload: stripeEvent,
  status: 'success',
  ipAddress: req.headers['x-forwarded-for'],
  userAgent: req.headers['user-agent'],
})
```

### Logging an Admin Action

```typescript
import { logAdminAction } from '@/lib/audit'

await logAdminAction({
  action: 'order_refunded',
  userId: adminId,
  workspaceId: workspace.id,
  orderId: order.id,
  details: {
    reason: 'Customer request',
    amount: 2999,
  },
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
})
```

### Retrieving Audit Logs

```typescript
import { getOrderAuditLogs, getUserAuditLogs } from '@/lib/audit'

// Get all audit events for an order
const { logs, error } = await getOrderAuditLogs('ord_123')

// Get recent audit events for a user
const { logs, error } = await getUserAuditLogs('user_456', 50)
```

### Manual PII Redaction

```typescript
import { redactPII, sanitizeWebhookPayload } from '@/lib/audit'

const customerData = {
  email: 'customer@example.com',
  name: 'John Doe',
  phone: '+1-555-123-4567',
  orderId: 'ord_123',
  amount: 2999,
}

const redacted = redactPII(customerData)
// {
//   email: '[REDACTED_EMAIL]',
//   name: '[REDACTED_NAME]',
//   phone: '[REDACTED_PHONE]',
//   orderId: 'ord_123',
//   amount: 2999
// }
```

## PII Fields Redacted

The system automatically redacts the following types of PII:

- **Email Addresses**: Any field matching `*email*` (case-insensitive)
- **Phone Numbers**: Any field matching `*phone*`, `*mobile*`, `*tel*`
- **Names**: Any field matching `*name*`, `*first_name*`, `*last_name*`
- **Addresses**: Any field matching `*address*`, `*street*`, `*line1*`, `*line2*`
- **IP Addresses**: Any field matching `*ip*`, `*ip_address*`, `*client_ip*`
- **Payment Cards**: Any field matching `*card_number*`, `*credit_card*`
- **SSN**: Any field matching `*ssn*`, `*social_security*`
- **Tax IDs**: Any field matching `*tax_id*`, `*ein*`, `*vat*`

## Preserved Fields

The following fields are **NOT** redacted as they're essential for debugging:

- IDs: `id`, `order_id`, `user_id`, `workspace_id`, `transaction_id`, etc.
- Amounts: `amount`, `total`, `subtotal`, `tax`, `shipping`
- Metadata: `currency`, `status`, `provider`, `event`, `type`
- Timestamps: `created_at`, `updated_at`, `timestamp`
- Location (non-PII): `city`, `state`, `country`, `postal_code`
- Payment (non-PII): `last4`, `exp_month`, `exp_year`, `brand`

## Database Schema

```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    provider VARCHAR(50),
    event_name VARCHAR(100) NOT NULL,
    order_id UUID,
    user_id UUID,
    workspace_id UUID,
    raw_payload JSONB,          -- Admin-only access
    sanitized_payload JSONB,    -- General access
    status VARCHAR(20),
    error_message TEXT,
    ip_address INET,            -- Auto-redacted after 90 days
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ
);
```

## Row-Level Security (RLS)

- **Admins** (owner/admin role): Can view all logs including `raw_payload`
- **Regular Users**: Can only view `sanitized_payload` for their workspace
- **System** (service role): Can insert new audit logs

## Event Types

| Event Type | Description |
|------------|-------------|
| `stripe_webhook` | Stripe webhook events |
| `prodigi_webhook` | Prodigi print provider events |
| `gelato_webhook` | Gelato print provider events |
| `lulu_webhook` | Lulu print provider events |
| `peecho_webhook` | Peecho print provider events |
| `order_created` | Order creation events |
| `order_updated` | Order update events |
| `payment_success` | Successful payment events |
| `payment_failure` | Failed payment events |
| `refund_issued` | Refund events |
| `admin_action` | Administrative actions |

## Compliance

### GDPR Compliance

- PII is redacted from general-access logs
- Raw payloads are restricted to admin users only
- IP addresses are automatically redacted after 90 days
- Audit logs can be used for data subject access requests (DSARs)

### CCPA Compliance

- Supports right to know (audit trail of data processing)
- Supports right to delete (via order/user deletion cascade)
- Logs consumer opt-out actions

## Testing

Run the E2E tests:

```bash
npm run test:e2e e2e/audit-logs.spec.ts
```

## Best Practices

1. **Always log webhook events**: Use `logWebhookEvent()` in all webhook handlers
2. **Log admin actions**: Track all administrative changes to orders
3. **Avoid logging raw PII**: Use the audit system instead of console.log for sensitive data
4. **Review logs regularly**: Set up alerts for failed events
5. **Respect retention policies**: The system auto-redacts IP addresses after 90 days

## Example: Complete Webhook Handler

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { logWebhookEvent } from '@/lib/audit'

export async function POST(request: NextRequest) {
  const headersList = await headers()
  const ipAddress = headersList.get('x-forwarded-for') || undefined
  const userAgent = headersList.get('user-agent') || undefined

  try {
    const body = await request.text()
    const payload = JSON.parse(body)

    // Verify signature here...

    // Process the webhook...
    const orderId = await processWebhook(payload)

    // Log successful event
    await logWebhookEvent({
      provider: 'stripe',
      eventType: payload.type,
      orderId,
      payload,
      status: 'success',
      ipAddress,
      userAgent,
    })

    return NextResponse.json({ received: true })
  } catch (error) {
    // Log failed event
    await logWebhookEvent({
      provider: 'stripe',
      eventType: 'processing_error',
      payload: {},
      status: 'failure',
      errorMessage: error.message,
      ipAddress,
      userAgent,
    })

    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
```

## Related Features

- **BS-502**: Stripe Checkout
- **BS-602**: Provider Adapter v1
- **BS-603**: Webhook Ingestion
- **DB-004**: Commerce Schema

## Migrations

Migration file: `supabase/migrations/20260126000002_add_audit_logs.sql`

## License

Part of VelloPad - Master Builder (33) Energy
