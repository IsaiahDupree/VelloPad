# Click Redirect Tracker (GDP-006)

## Overview

The Click Redirect Tracker implements an attribution spine that tracks the complete user journey from email clicks through to conversions. It uses first-party cookies to maintain session continuity and provides full visibility into email campaign effectiveness.

## Architecture

```
Email Send → Click Tracking → Attribution Cookie → Session Events → Conversion
     ↓              ↓                  ↓                  ↓              ↓
email_message  email_event    _vp_attr cookie    unified_event   conversion event
```

## Key Components

### 1. Click Tracking URL Generator

Wraps destination URLs with tracking parameters:

```typescript
import { generateTrackedUrl } from '@/lib/tracking/click-redirect';

const trackedUrl = generateTrackedUrl({
  url: 'https://vellopad.com/books/new',
  emailId: 'email-message-uuid',
  campaignId: 'campaign-uuid',
  personId: 'person-uuid',
  properties: {
    buttonName: 'cta-start-writing',
  },
});

// Returns: https://vellopad.com/api/track/click?url=...&eid=...&cid=...
```

### 2. Email Link Rewriting

Automatically rewrites all links in email HTML:

```typescript
import { rewriteEmailLinksWithTracking } from '@/lib/tracking/click-redirect';

const trackedHtml = rewriteEmailLinksWithTracking(
  emailHtml,
  emailMessageId,
  personId,
  campaignId
);
```

### 3. Click Redirect Endpoint

**Endpoint:** `GET /api/track/click`

**Parameters:**
- `url` - Destination URL (required)
- `eid` - Email message ID (optional)
- `cid` - Campaign ID (optional)
- `pid` - Person ID (optional)
- `props` - Base64-encoded JSON properties (optional)

**Flow:**
1. Parse tracking parameters
2. Record click event in `email_event` table
3. Update `email_message` click stats
4. Record `email.clicked` in `unified_event`
5. Set attribution cookie
6. Redirect to destination URL

### 4. Attribution Cookie

**Cookie Name:** `_vp_attr`

**Contents:**
```json
{
  "sid": "session-uuid",
  "eid": "email-message-uuid",
  "cid": "campaign-uuid",
  "pid": "person-uuid",
  "ts": 1706554800000
}
```

**Lifespan:** 30 days
**Flags:** `HttpOnly; Secure; SameSite=Lax`

## Usage Examples

### In Lifecycle Emails

```typescript
import { LifecycleEmailService } from '@/lib/email/lifecycle';
import { rewriteEmailLinksWithTracking } from '@/lib/tracking/click-redirect';

const emailService = new LifecycleEmailService();

// Send email with tracked links
const result = await emailService.sendEmail({
  userId,
  workspaceId,
  templateKey: 'activation_nudge',
  toEmail: user.email,
  variables: {
    first_name: 'John',
    cta_url: generateTrackedUrl({
      url: 'https://vellopad.com/books/new',
      emailId: emailSendId,
      personId,
    }),
  },
});
```

### In Campaign Emails

```typescript
import { generateTrackedUrl } from '@/lib/tracking/click-redirect';

// Generate tracked CTA button
const ctaUrl = generateTrackedUrl({
  url: 'https://vellopad.com/pricing',
  campaignId: 'spring-sale-2026',
  properties: {
    buttonText: 'Get 50% Off',
    placement: 'hero',
  },
});
```

### Reading Attribution Data

```typescript
import { parseAttributionCookie } from '@/lib/tracking/click-redirect';

// In API route or middleware
const cookieHeader = request.headers.get('cookie');
const attribution = parseAttributionCookie(cookieHeader);

if (attribution?.sessionId) {
  // User came from an email click within the last 30 days
  console.log('Email message:', attribution.emailMessageId);
  console.log('Campaign:', attribution.campaignId);
  console.log('Session:', attribution.sessionId);
}
```

### Tracking Conversions

```typescript
import { createClient } from '@/lib/supabase/server';
import { parseAttributionCookie } from '@/lib/tracking/click-redirect';

// In checkout completion handler
const attribution = parseAttributionCookie(request.headers.get('cookie'));

if (attribution?.sessionId) {
  const supabase = await createClient();

  // Link conversion to email attribution
  await supabase.rpc('track_conversion_from_session', {
    session_id_param: attribution.sessionId,
    conversion_event_name: 'order_placed',
    conversion_value_cents: orderTotal,
    conversion_properties: {
      order_id: orderId,
      book_id: bookId,
    },
  });
}
```

## Database Schema

### email_event Table

Stores individual click events:

```sql
SELECT
  ee.id,
  ee.email_message_id,
  ee.person_id,
  ee.event_type, -- 'clicked'
  ee.clicked_url,
  ee.event_timestamp,
  ee.user_agent,
  ee.ip_address
FROM email_event ee
WHERE ee.event_type = 'clicked'
ORDER BY ee.event_timestamp DESC;
```

### unified_event Table

Stores all session events:

```sql
SELECT
  ue.person_id,
  ue.event_name,
  ue.event_source,
  ue.session_id,
  ue.properties
FROM unified_event ue
WHERE ue.session_id = 'session-uuid'
ORDER BY ue.event_timestamp ASC;
```

## Analytics Queries

### Email Click-Through Rate

```sql
SELECT
  em.template_key,
  COUNT(*) as sent_count,
  COUNT(em.first_clicked_at) as clicked_count,
  ROUND(100.0 * COUNT(em.first_clicked_at) / COUNT(*), 2) as ctr_percent
FROM email_message em
WHERE em.sent_at > NOW() - INTERVAL '30 days'
GROUP BY em.template_key
ORDER BY ctr_percent DESC;
```

### Email → Conversion Attribution

```sql
WITH email_clicks AS (
  SELECT
    ue.person_id,
    ue.session_id,
    (ue.properties->>'email_message_id')::UUID as email_message_id,
    ue.event_timestamp as clicked_at
  FROM unified_event ue
  WHERE ue.event_name = 'email.clicked'
),
conversions AS (
  SELECT
    ue.person_id,
    ue.session_id,
    ue.event_timestamp as converted_at,
    (ue.properties->>'order_id')::UUID as order_id
  FROM unified_event ue
  WHERE ue.event_name = 'order_placed'
)
SELECT
  em.template_key,
  COUNT(DISTINCT ec.person_id) as unique_clickers,
  COUNT(DISTINCT c.person_id) as unique_converters,
  ROUND(100.0 * COUNT(DISTINCT c.person_id) / NULLIF(COUNT(DISTINCT ec.person_id), 0), 2) as conversion_rate
FROM email_clicks ec
LEFT JOIN conversions c ON ec.session_id = c.session_id
LEFT JOIN email_message em ON ec.email_message_id = em.id
GROUP BY em.template_key
ORDER BY conversion_rate DESC;
```

### Session Journey Analysis

```sql
SELECT
  ue.session_id,
  p.email,
  ARRAY_AGG(ue.event_name ORDER BY ue.event_timestamp) as event_sequence,
  MIN(ue.event_timestamp) as session_start,
  MAX(ue.event_timestamp) as session_end,
  COUNT(*) as event_count
FROM unified_event ue
JOIN person p ON ue.person_id = p.id
WHERE ue.session_id IS NOT NULL
GROUP BY ue.session_id, p.email
HAVING COUNT(*) > 1
ORDER BY session_start DESC
LIMIT 100;
```

## Testing

See `e2e/click-tracking.spec.ts` for comprehensive E2E tests.

## Privacy & Compliance

- **First-party cookies only** - No third-party tracking pixels
- **HttpOnly cookies** - Protected from JavaScript access
- **Secure flag** - Only transmitted over HTTPS
- **30-day expiration** - Reasonable attribution window
- **Unsubscribe links excluded** - Compliance with email regulations
- **IP address hashing** - Optional for GDPR compliance

## Performance Considerations

- Click redirects add ~50-150ms latency (database write + redirect)
- Attribution cookies are ~200 bytes
- No impact on email deliverability
- Async event recording (non-blocking)

## Future Enhancements

- [ ] Multi-touch attribution (first-click, last-click, linear)
- [ ] Cross-device attribution (email to mobile)
- [ ] A/B test tracking (variant assignment)
- [ ] Link click heatmaps
- [ ] Spam trap detection
- [ ] Bot click filtering
