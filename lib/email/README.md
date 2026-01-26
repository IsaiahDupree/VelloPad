# Email System with Growth Data Plane Integration

This directory contains the email infrastructure for VelloPad, integrated with the Growth Data Plane for comprehensive tracking.

## Features

- **GDP-004**: Resend Webhook Edge Function with Svix signature verification
- **GDP-005**: Email Event Tracking (delivered, opened, clicked, bounced, complained)

## Architecture

```
┌─────────────────┐
│  Email Sender   │
│  (resend-client)│
└────────┬────────┘
         │
         │ 1. Create email_message
         │ 2. Send via Resend API with tags
         │    - person_id
         │    - email_message_id
         │    - email_type
         │
         v
┌─────────────────┐
│  Resend API     │
└────────┬────────┘
         │
         │ Email events (delivered, opened, clicked, etc.)
         │
         v
┌─────────────────┐
│ Webhook Handler │
│ (/api/webhooks/ │
│     resend)     │
└────────┬────────┘
         │
         │ 1. Verify Svix signature
         │ 2. Extract person_id from tags
         │ 3. Create email_event
         │ 4. Update email_message
         │ 5. Create unified_event
         │
         v
┌─────────────────┐
│ Growth Data     │
│ Plane Tables    │
│ - person        │
│ - email_message │
│ - email_event   │
│ - unified_event │
└─────────────────┘
```

## Usage

### Sending an Email

```typescript
import { sendEmail } from '@/lib/email/resend-client';

const result = await sendEmail({
  personId: 'person-uuid',
  to: 'user@example.com',
  subject: 'Welcome to VelloPad!',
  html: '<h1>Welcome!</h1>',
  emailType: 'lifecycle'
});

if (result.success) {
  console.log('Email sent:', result.emailMessageId);
}
```

### Sending a Templated Email

```typescript
import { sendTemplatedEmail } from '@/lib/email/resend-client';

const result = await sendTemplatedEmail(
  'person-uuid',
  'activation_welcome',
  {
    dashboard_url: 'https://vellopad.com/dashboard'
  }
);
```

### Get or Create Person

```typescript
import { getOrCreatePersonByEmail } from '@/lib/email/resend-client';

const personId = await getOrCreatePersonByEmail(
  'user@example.com',
  'John',
  'Doe'
);
```

## Email Tags

All emails sent via `resend-client` are automatically tagged with:

| Tag | Description |
|-----|-------------|
| `person_id` | UUID linking to the `person` table |
| `email_message_id` | UUID linking to the `email_message` table |
| `email_type` | lifecycle, transactional, or campaign |

These tags enable the webhook handler to properly attribute email events.

## Webhook Setup

### 1. Configure Resend Webhook

In your Resend dashboard:
- Navigate to Webhooks
- Create a new webhook endpoint: `https://vellopad.com/api/webhooks/resend`
- Copy the webhook signing secret
- Subscribe to events:
  - `email.sent`
  - `email.delivered`
  - `email.delivery_delayed`
  - `email.bounced`
  - `email.complained`
  - `email.opened`
  - `email.clicked`

### 2. Set Environment Variables

```bash
RESEND_API_KEY=re_...
RESEND_WEBHOOK_SECRET=whsec_...
```

### 3. Verify Webhook

Test the webhook endpoint:

```bash
curl https://vellopad.com/api/webhooks/resend
# Response: {"status":"Resend webhook endpoint is active"}
```

## Event Flow

### Email Sent

1. `sendEmail()` creates `email_message` record with status `queued`
2. Resend API is called with tags
3. `email_message` updated with `provider_message_id` and status `sent`
4. `unified_event` created: `email.sent`

### Email Delivered

1. Resend sends webhook: `email.delivered`
2. Webhook handler verifies Svix signature
3. `email_event` created with `event_type: 'delivered'`
4. `email_message` updated: `status = 'delivered'`, `delivered_at`
5. `unified_event` created: `email.delivered`

### Email Opened

1. Resend sends webhook: `email.opened`
2. `email_event` created with `event_type: 'opened'`
3. `email_message` updated:
   - `status = 'opened'`
   - `opened_at` (first open)
   - `open_count++`
4. `unified_event` created: `email.opened`

### Email Clicked

1. Resend sends webhook: `email.clicked`
2. `email_event` created with:
   - `event_type: 'clicked'`
   - `clicked_url`
   - `user_agent`
   - `ip_address`
3. `email_message` updated:
   - `status = 'clicked'`
   - `first_clicked_at`
   - `click_count++`
4. `unified_event` created: `email.clicked`

## Database Schema

### email_message

Stores each email sent with engagement metrics.

```sql
CREATE TABLE email_message (
  id UUID PRIMARY KEY,
  person_id UUID NOT NULL REFERENCES person(id),
  to_email VARCHAR(255) NOT NULL,
  from_email VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  email_type VARCHAR(50) NOT NULL, -- lifecycle, transactional, campaign
  campaign_id UUID,
  template_key VARCHAR(100),
  provider VARCHAR(50) NOT NULL DEFAULT 'resend',
  provider_message_id VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'queued',
  -- Timestamps
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  first_clicked_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  complained_at TIMESTAMPTZ,
  -- Engagement
  open_count INT DEFAULT 0,
  click_count INT DEFAULT 0,
  -- Metadata
  tags JSONB DEFAULT '[]'::JSONB,
  properties JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### email_event

Stores individual email interaction events.

```sql
CREATE TABLE email_event (
  id UUID PRIMARY KEY,
  email_message_id UUID NOT NULL REFERENCES email_message(id),
  person_id UUID NOT NULL REFERENCES person(id),
  event_type VARCHAR(50) NOT NULL, -- sent, delivered, opened, clicked, bounced, complained
  event_timestamp TIMESTAMPTZ NOT NULL,
  clicked_url TEXT,
  user_agent TEXT,
  ip_address INET,
  country_code CHAR(2),
  city VARCHAR(100),
  provider_event_id VARCHAR(255),
  raw_event JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## Analytics Queries

### Email Engagement by Person

```sql
SELECT
  p.email,
  COUNT(*) FILTER (WHERE em.status = 'sent') as emails_sent,
  COUNT(*) FILTER (WHERE em.opened_at IS NOT NULL) as emails_opened,
  COUNT(*) FILTER (WHERE em.first_clicked_at IS NOT NULL) as emails_clicked,
  ROUND(
    COUNT(*) FILTER (WHERE em.opened_at IS NOT NULL)::NUMERIC /
    NULLIF(COUNT(*) FILTER (WHERE em.status = 'sent'), 0) * 100,
    2
  ) as open_rate,
  ROUND(
    COUNT(*) FILTER (WHERE em.first_clicked_at IS NOT NULL)::NUMERIC /
    NULLIF(COUNT(*) FILTER (WHERE em.status = 'sent'), 0) * 100,
    2
  ) as click_rate
FROM person p
LEFT JOIN email_message em ON em.person_id = p.id
WHERE em.created_at > NOW() - INTERVAL '30 days'
GROUP BY p.id, p.email
ORDER BY emails_sent DESC;
```

### Most Clicked URLs

```sql
SELECT
  clicked_url,
  COUNT(*) as click_count,
  COUNT(DISTINCT person_id) as unique_clickers
FROM email_event
WHERE event_type = 'clicked'
  AND event_timestamp > NOW() - INTERVAL '7 days'
GROUP BY clicked_url
ORDER BY click_count DESC
LIMIT 20;
```

### Email Campaign Performance

```sql
SELECT
  c.name as campaign_name,
  COUNT(*) as emails_sent,
  COUNT(*) FILTER (WHERE em.opened_at IS NOT NULL) as opened,
  COUNT(*) FILTER (WHERE em.first_clicked_at IS NOT NULL) as clicked,
  ROUND(
    COUNT(*) FILTER (WHERE em.opened_at IS NOT NULL)::NUMERIC /
    COUNT(*)::NUMERIC * 100,
    2
  ) as open_rate,
  ROUND(
    COUNT(*) FILTER (WHERE em.first_clicked_at IS NOT NULL)::NUMERIC /
    COUNT(*)::NUMERIC * 100,
    2
  ) as click_rate
FROM campaigns c
JOIN email_message em ON em.campaign_id = c.id
WHERE c.status = 'sent'
GROUP BY c.id, c.name
ORDER BY open_rate DESC;
```

## Troubleshooting

### Webhook Not Receiving Events

1. Check that `RESEND_WEBHOOK_SECRET` is set correctly
2. Verify the webhook endpoint is publicly accessible
3. Check Resend webhook logs in dashboard
4. Test signature verification locally

### Person Not Found

If you receive "No person_id in tags" warnings:

1. Ensure emails are sent via `resend-client.ts` (not direct Resend API)
2. Verify `personId` is valid UUID
3. Check that person exists in `person` table

### Email Not Linking to Person

If `email_message` records aren't being created:

1. Verify Supabase credentials are correct
2. Check `person` table has matching `person_id`
3. Review webhook logs for errors

## Testing

Run E2E tests:

```bash
npx playwright test e2e/resend-webhook.spec.ts
```

## Security

- All webhook requests are verified using Svix signature verification
- Email content is sanitized before storage
- PII is handled according to GDPR requirements
- Rate limiting is applied to webhook endpoint
