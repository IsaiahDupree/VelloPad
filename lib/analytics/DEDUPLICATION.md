# Meta Pixel + CAPI Event Deduplication

**Feature:** GDP-010
**Status:** ✅ Implemented

## Overview

VelloPad implements Meta's best practice for event deduplication by sending the same `event_id` for both browser Pixel events and server-side Conversions API (CAPI) events. This prevents Meta from counting the same conversion twice and ensures accurate attribution and reporting.

## Why Deduplication Matters

When you track events from both the browser (Pixel) and server (CAPI):

- **Without deduplication**: Meta counts the same purchase twice → inflated metrics
- **With deduplication**: Meta deduplicates using `event_id` → accurate metrics

### Benefits

1. **Accurate Conversion Tracking**: No double-counting of conversions
2. **Better Attribution**: Meta can attribute conversions correctly across browser and server
3. **Improved Ad Performance**: Meta's algorithm gets accurate data for optimization
4. **Resilient Tracking**: If browser tracking fails (ad blockers), server event still fires

## How It Works

### Event Flow

```
User Action (e.g., Purchase)
        ↓
1. Generate unique event_id on client
        ↓
2. Fire browser Pixel with event_id
        ↓
3. Send server request with event_id in header
        ↓
4. Server fires CAPI with same event_id
        ↓
5. Meta receives both events, deduplicates via event_id
```

### Event ID Format

```
{timestamp}_{random}

Example: 1706543210123_k7x9p2m4q
```

- **Timestamp**: Milliseconds since epoch
- **Random**: Base-36 random string
- **Uniqueness**: Collision probability < 1 in 10 billion

## Implementation

### Client-Side Usage

```typescript
import { createDedupEvent } from '@/lib/analytics/event-dedup';
import { trackMetaPurchase } from '@/lib/analytics/meta-pixel';

// 1. Create dedup event
const dedup = createDedupEvent('Purchase');

// 2. Fire browser pixel with event ID
trackMetaPurchase({
  contentIds: [bookId],
  value: 29.99,
  currency: 'USD',
  eventID: dedup.eventID, // ← Same ID for browser and server
});

// 3. Store for server-side retrieval
dedup.storeForServer();

// 4. Send to server with event ID
await fetch('/api/checkout', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    ...dedup.getHeaders(), // ← Includes x-meta-event-purchase: {eventID}
  },
  body: JSON.stringify({ ... }),
});
```

### Server-Side Usage

```typescript
import { getOrGenerateEventID } from '@/lib/analytics/event-dedup';
import { trackCAPIPurchase } from '@/lib/analytics/meta-capi';

export async function POST(request: Request) {
  // 1. Retrieve event ID from request (or generate new)
  const eventID = getOrGenerateEventID(request, 'Purchase');

  // 2. Fire CAPI with same event ID
  await trackCAPIPurchase({
    eventId: eventID, // ← Same ID as browser pixel
    userId: user.id,
    email: user.email,
    value: 29.99,
    currency: 'USD',
    // ... other params
  });
}
```

### Using Integration Layer (Recommended)

The easiest way is to use the high-level integration functions:

```typescript
import {
  trackMetaPurchaseComplete,
  trackMetaPurchaseCompleteServer
} from '@/lib/analytics/meta-integration';

// Client-side
const eventID = trackMetaPurchaseComplete({
  book_id: bookId,
  quantity: 1,
  total_value: 29.99,
  currency: 'USD',
});

// Server-side (in webhook handler)
await trackMetaPurchaseCompleteServer({
  eventID, // ← Pass the same event ID from client
  userId: user.id,
  email: user.email,
  bookId: bookId,
  value: 29.99,
  request, // ← Fallback: extracts event ID from headers
});
```

## Event ID Storage

### Client Storage

Event IDs are stored in `sessionStorage` with automatic cleanup:

- **Key format**: `meta_event_{EventName}_{timestamp}`
- **Retention**: Last 10 event IDs only
- **Lifetime**: Session (cleared on browser close)

### Server Retrieval

Server retrieves event ID from HTTP headers:

- **Header format**: `x-meta-event-{eventname}`
- **Example**: `x-meta-event-purchase: 1706543210123_k7x9p2m4q`

## Supported Events

All standard Meta events support deduplication:

- ✅ `CompleteRegistration`
- ✅ `InitiateCheckout`
- ✅ `Purchase`
- ✅ `Subscribe`
- ✅ `Lead`
- ✅ `ViewContent`

## Testing

### Unit Tests

```bash
# Test event ID generation
npm test lib/analytics/event-dedup.test.ts
```

### E2E Tests

```bash
# Test full deduplication flow
npx playwright test e2e/meta-deduplication.spec.ts
```

### Verify in Meta Events Manager

1. Go to Meta Events Manager
2. Select your Pixel
3. Click "Test Events"
4. Fire an event from browser and server with same `event_id`
5. Should see **1 event** (not 2)

## Best Practices

### ✅ Do

- **Always** generate event ID on client first
- **Always** pass event ID to server
- Store event ID in `sessionStorage` for fallback retrieval
- Use the same event ID for browser and server events
- Include event ID in custom headers for server API calls

### ❌ Don't

- Generate different event IDs for browser vs server
- Store event IDs in `localStorage` (use `sessionStorage`)
- Reuse event IDs across different event types
- Forget to include event ID when calling CAPI

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Browser                              │
│                                                              │
│  1. createDedupEvent('Purchase')                            │
│     ↓                                                        │
│  2. Generate: 1706543210123_k7x9p2m4q                       │
│     ↓                                                        │
│  3. Store in sessionStorage                                  │
│     ↓                                                        │
│  4. Fire Pixel with eventID                                  │
│     ↓                                                        │
│  5. Send to server with x-meta-event-purchase header         │
│                                                              │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ↓
┌──────────────────────────────┴───────────────────────────────┐
│                         Server                               │
│                                                              │
│  6. Receive request                                          │
│     ↓                                                        │
│  7. Extract eventID from header                              │
│     ↓                                                        │
│  8. Fire CAPI with same eventID                              │
│                                                              │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ↓
┌──────────────────────────────┴───────────────────────────────┐
│                      Meta Platform                           │
│                                                              │
│  9. Receive browser event (eventID: 1706543210123_k7x9p2m4q)│
│ 10. Receive server event (eventID: 1706543210123_k7x9p2m4q) │
│     ↓                                                        │
│ 11. Match event_id → DEDUPLICATE → Count as 1 event         │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## Debugging

### Check if Event ID is Being Sent

**Browser Console:**
```javascript
// Check sessionStorage
Object.keys(sessionStorage).filter(k => k.startsWith('meta_event_'))

// Check Pixel calls
window._fbqCalls.forEach(call => {
  if (call[0] === 'track' && call[2]?.eventID) {
    console.log(call[1], call[2].eventID);
  }
});
```

**Server Logs:**
```typescript
// Log event IDs being sent to CAPI
console.log('CAPI event ID:', eventID);
```

**Network Tab:**
```
# Check request headers
x-meta-event-purchase: 1706543210123_k7x9p2m4q
```

### Common Issues

**Issue**: Events are counted twice in Meta
**Fix**: Verify browser and server use **exact same** `event_id`

**Issue**: Server can't retrieve event ID
**Fix**: Check that client sends `x-meta-event-*` header

**Issue**: Event IDs are duplicated
**Fix**: Always generate fresh event ID per user action

## Related Features

- **META-001**: Meta Pixel Installation
- **META-004**: CAPI Server-Side Events
- **META-005**: Event Deduplication (this feature)
- **GDP-001**: Growth Data Plane Setup

## References

- [Meta: Event Deduplication](https://developers.facebook.com/docs/marketing-api/conversions-api/deduplicate-pixel-and-server-events)
- [Meta: Conversions API Best Practices](https://developers.facebook.com/docs/marketing-api/conversions-api/best-practices)
- [Meta: Event ID Parameter](https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/server-event#event-id)
