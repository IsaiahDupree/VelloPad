# Meta Pixel + CAPI Integration

Complete Facebook/Meta Pixel and Conversions API (CAPI) integration for VelloPad.

**Features:** META-001 through META-006

## Overview

This integration provides:

1. **Browser Pixel Tracking** - Client-side event tracking via Meta Pixel
2. **Server-Side CAPI** - Server-to-server event tracking via Conversions API
3. **Event Deduplication** - Prevents double-counting of events
4. **PII Hashing** - SHA256 hashing of sensitive user data
5. **Standard Event Mapping** - Maps VelloPad events to Meta standard events

## Setup

### 1. Get Meta Pixel ID

1. Go to [Meta Events Manager](https://business.facebook.com/events_manager)
2. Create a new Pixel or use existing one
3. Copy your Pixel ID (15-digit number)

### 2. Get CAPI Access Token

1. In Events Manager, go to Settings → Conversions API
2. Generate new access token
3. Copy the token (starts with `EAA...`)

### 3. Configure Environment Variables

Add to `.env.local`:

```bash
# Meta Pixel (Browser)
NEXT_PUBLIC_META_PIXEL_ID=123456789012345

# Meta CAPI (Server)
META_PIXEL_ID=123456789012345
META_CAPI_ACCESS_TOKEN=EAA...

# Optional: Test Event Code (for testing in Events Manager)
META_TEST_EVENT_CODE=TEST12345
```

## Event Mapping

VelloPad events are automatically mapped to Meta standard events:

| VelloPad Event | Meta Event | Trigger |
|----------------|------------|---------|
| `signup_start` | `Lead` | User clicks signup button |
| `signup_complete` | `CompleteRegistration` | User creates account |
| `book_created` | `ViewContent` | User creates new book |
| `checkout_started` | `InitiateCheckout` | User starts checkout |
| `purchase_completed` | `Purchase` | Payment succeeds |
| `subscription_started` | `Subscribe` | User starts subscription |

## How It Works

### Browser Pixel (Client-Side)

The Meta Pixel tracks user actions in the browser:

```typescript
import { trackMetaCompleteRegistration } from '@/lib/analytics/meta-pixel';

// Track signup completion
trackMetaCompleteRegistration({
  contentName: 'VelloPad Account',
  status: true,
  eventID: generateEventID(), // For deduplication with CAPI
});
```

### Conversions API (Server-Side)

CAPI tracks events from your server for better reliability:

```typescript
import { trackCAPIPurchase } from '@/lib/analytics/meta-capi';

// Track purchase from webhook
await trackCAPIPurchase({
  eventId: generateEventID(), // Same ID as browser pixel
  userId: user.id,
  email: user.email, // Automatically hashed
  contentIds: [bookId],
  numItems: quantity,
  value: totalAmount,
  currency: 'USD',
});
```

### Event Deduplication

Both browser pixel and CAPI send events. To prevent double-counting, we use **event IDs**:

```typescript
const eventID = generateEventID(); // Unique ID

// Browser sends with eventID
trackMetaPurchase({ ..., eventID });

// Server sends with same eventID
trackCAPIPurchase({ ..., eventId: eventID });

// Meta deduplicates automatically
```

## PII Handling

All personally identifiable information (PII) is automatically hashed with SHA256:

- ✅ Email addresses
- ✅ Phone numbers
- ✅ Names (first, last)
- ✅ Addresses (city, state, zip, country)
- ✅ User IDs

**Raw PII never leaves your server.** Only SHA256 hashes are sent to Meta.

```typescript
import { hashPII } from '@/lib/analytics/meta-capi';

const hashedEmail = hashPII('user@example.com');
// Returns: "b4c9a289323b21a01c3e940f150eb9b8c542587f1abfd8f0e1cc1ffc5e475514"
```

## Testing

### Test Events in Meta Events Manager

1. Set `META_TEST_EVENT_CODE` in `.env.local`
2. Send test events from your development environment
3. View test events in Events Manager → Test Events tab
4. Remove `META_TEST_EVENT_CODE` when deploying to production

### Verify Event Deduplication

1. Trigger an event (e.g., purchase)
2. Check Events Manager → Events tab
3. Click on event → View Details
4. Verify both "Browser" and "Server" sources show
5. Check "Event Count" = 1 (not 2)

## Integration with Existing Analytics

Meta events are automatically sent alongside PostHog events:

```typescript
// This function tracks to both PostHog AND Meta
trackMetaPurchaseComplete({
  order_id: orderId,
  book_id: bookId,
  quantity: 1,
  total_value: 29.99,
  currency: 'USD',
});
```

## Client-Side Integration

Meta Pixel is automatically initialized in the root layout:

```typescript
// app/layout.tsx
<MetaPixelProvider>
  {children}
</MetaPixelProvider>
```

Page views are tracked automatically on route changes.

## Server-Side Integration

CAPI events are sent from API routes and webhooks:

```typescript
// app/api/webhooks/stripe/route.ts
import { trackMetaPurchaseCompleteServer } from '@/lib/analytics/meta-integration';

await trackMetaPurchaseCompleteServer({
  userId: user.id,
  email: user.email,
  bookId: order.book_id,
  quantity: order.quantity,
  value: order.total_amount,
  currency: order.currency,
  request, // Pass Request object for IP, user-agent, fbc/fbp
});
```

## Facebook Click ID (fbc) and Browser ID (fbp)

For best ad attribution, Meta needs:

- **`fbp`** - Facebook Browser ID from `_fbp` cookie
- **`fbc`** - Facebook Click ID from `fbclid` URL parameter

These are automatically extracted from requests:

```typescript
import { extractFBC, extractFBP } from '@/lib/analytics/meta-capi';

const fbc = extractFBC(request.headers.get('referer'));
const fbp = extractFBP(request.headers.get('cookie'));
```

## Advanced Usage

### Custom Events

Track custom events not in the standard set:

```typescript
import { trackMetaCustomEvent } from '@/lib/analytics/meta-pixel';

trackMetaCustomEvent('BookDownloaded', {
  book_id: bookId,
  format: 'pdf',
  value: 0,
});
```

### Manual CAPI Events

Send custom CAPI events:

```typescript
import { sendMetaCAPIEvent } from '@/lib/analytics/meta-capi';

await sendMetaCAPIEvent([
  {
    event_name: 'CustomEvent',
    event_time: Math.floor(Date.now() / 1000),
    action_source: 'website',
    user_data: {
      em: hashPII(email),
      external_id: hashPII(userId),
    },
    custom_data: {
      value: 100,
      currency: 'USD',
    },
  },
]);
```

## Troubleshooting

### Events Not Showing in Meta

1. **Check Pixel ID** - Verify `NEXT_PUBLIC_META_PIXEL_ID` matches Events Manager
2. **Check Access Token** - Verify `META_CAPI_ACCESS_TOKEN` is valid
3. **Check Browser Console** - Look for Meta Pixel errors
4. **Use Meta Pixel Helper** - Install [Chrome extension](https://chrome.google.com/webstore/detail/meta-pixel-helper/fdgfkebogiimcoedlicjlajpkdmockpc)

### Events Counted Twice

1. **Check Event IDs** - Ensure browser and server use same `eventID`
2. **Check Timestamp** - Events must be sent within 48 hours to deduplicate
3. **Verify Hashing** - User data must be hashed identically

### Low Match Quality

"Match Quality" shows how well Meta can match your events to Facebook users.

**Improve match quality:**
- ✅ Send email and phone (hashed)
- ✅ Send client IP and user-agent
- ✅ Send fbc and fbp parameters
- ✅ Use external_id (user ID, hashed)

## Resources

- [Meta Pixel Documentation](https://developers.facebook.com/docs/meta-pixel)
- [Conversions API Documentation](https://developers.facebook.com/docs/marketing-api/conversions-api)
- [Event Deduplication Guide](https://developers.facebook.com/docs/marketing-api/conversions-api/deduplicate-pixel-and-server-events)
- [Standard Events Reference](https://developers.facebook.com/docs/meta-pixel/reference)

## Support

For issues with Meta Pixel integration, check:
1. Meta Events Manager → Diagnostics tab
2. Browser console for pixel errors
3. Server logs for CAPI errors
4. This README for troubleshooting tips
