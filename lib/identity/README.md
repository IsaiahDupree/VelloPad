# Identity Stitching Module

**Feature:** GDP-009 - PostHog Identity Stitching

## Overview

This module implements identity stitching between VelloPad's Growth Data Plane and PostHog analytics. It creates a unified identity layer that links:

- **Person records** (Growth Data Plane canonical identity)
- **Supabase auth users** (authentication layer)
- **PostHog distinct_id** (analytics tracking)

## Architecture

### Identity Resolution Flow

```
Supabase Auth User
        ↓
   Person Record (canonical)
        ↓
   Identity Links
   ├── platform: 'auth' → auth_user_id
   ├── platform: 'posthog' → distinct_id
   ├── platform: 'stripe' → customer_id (future)
   └── platform: 'meta' → fb_external_id (future)
```

### Key Design Decisions

1. **Person ID as Distinct ID**: We use `person.id` as PostHog's `distinct_id` for consistency
2. **Bidirectional Lookup**: The `identity_link` table supports both forward and reverse lookups
3. **Server + Client Sync**: Identity is stitched on both server (auth callback) and client (React hook)
4. **Non-Blocking**: Identity stitching errors don't block the auth flow

## Usage

### Server-Side (Auth Callback)

```typescript
import { identifyPostHogUserByAuthId } from '@/lib/identity/posthog-identity';

// After successful auth
await identifyPostHogUserByAuthId(authUserId, anonymousId);
```

### Client-Side (React Hook)

```typescript
import { useIdentitySync } from '@/lib/identity/use-identity-sync';

export function AppShell({ children }) {
  // Automatically syncs identity on auth state changes
  useIdentitySync();

  return <div>{children}</div>;
}
```

### Manual Identity Operations

```typescript
import {
  identifyPostHogUser,
  getPostHogDistinctId,
  getPersonIdFromDistinctId,
  resolvePersonId
} from '@/lib/identity/posthog-identity';

// Identify user with custom properties
await identifyPostHogUser({
  personId: 'person-uuid',
  email: 'user@example.com',
  properties: { plan: 'pro' },
  anonymousId: 'anon-id-123'
});

// Get PostHog distinct_id for a person
const distinctId = await getPostHogDistinctId(personId);

// Get person_id from distinct_id
const personId = await getPersonIdFromDistinctId(distinctId);

// Resolve person_id from auth or email
const personId = await resolvePersonId({
  authUserId: 'auth-uuid',
  email: 'user@example.com'
});
```

## Database Schema

### identity_link Table

```sql
CREATE TABLE identity_link (
  id UUID PRIMARY KEY,
  person_id UUID REFERENCES person(id),
  platform VARCHAR(50),  -- 'posthog', 'auth', 'stripe', 'meta', 'resend'
  external_id VARCHAR(255),
  properties JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  UNIQUE(platform, external_id)
);
```

## Integration Points

### 1. Auth Callback Route

**File:** `app/auth/callback/route.ts`

- Exchanges auth code for session
- Identifies user in PostHog
- Creates person record if doesn't exist
- Links auth user ID and PostHog distinct_id

### 2. App Shell Component

**File:** `components/app-shell.tsx`

- Calls `useIdentitySync()` hook
- Syncs identity on auth state changes
- Identifies user in PostHog client-side

### 3. Person Management

**Table:** `person`

- Canonical user identity
- Single source of truth for user data
- Links to all external platforms via identity_link

## Event Flow

### New User Signup

1. User signs up via Supabase Auth
2. Auth callback receives session
3. Server creates `person` record
4. Server creates `identity_link` for platform='auth'
5. Server calls PostHog `identify()` with person_id
6. Server creates `identity_link` for platform='posthog'
7. Client-side hook detects auth state
8. Client calls PostHog `identify()` to sync browser session

### Returning User Login

1. User logs in via Supabase Auth
2. Auth callback receives session
3. Server looks up existing `person` via auth identity_link
4. Server updates `person.last_seen_at`
5. Server calls PostHog `identify()` to link session
6. If anonymous ID exists, server calls PostHog `alias()` to link anonymous → identified
7. Client-side hook syncs identity in browser

## Anonymous to Identified Transition

When a user who has been browsing anonymously signs up:

1. PostHog sets anonymous `distinct_id` in cookie (e.g., `ph_abc123`)
2. User signs up
3. Auth callback reads `ph_distinct_id` cookie
4. Server calls PostHog `alias(anonymousId, personId)`
5. PostHog links all anonymous events to identified user

## Testing

### E2E Tests

**File:** `e2e/posthog-identity.spec.ts`

Tests cover:
- Person record creation on signup
- Auth identity link creation
- PostHog identity link creation
- Bidirectional lookup (person_id ↔ distinct_id)
- last_seen_at updates
- Multiple platforms per person
- Anonymous to identified transition

### Run Tests

```bash
npm run test:e2e e2e/posthog-identity.spec.ts
```

## Dependencies

- `@supabase/supabase-js` - Database and auth
- `posthog-js` - Client-side analytics
- `posthog-node` - Server-side analytics

## Related Features

- **GDP-001**: Growth Data Plane Schema (person, identity_link tables)
- **GDP-002**: Person & Identity Tables
- **TRACK-001**: PostHog SDK Integration
- **TRACK-008**: User Identification

## Future Enhancements

- **GDP-007**: Stripe identity stitching (platform='stripe')
- **GDP-010**: Meta Pixel identity stitching (platform='meta')
- **Multi-workspace**: Handle workspace-level identity
- **Identity merge**: Merge duplicate person records

## Troubleshooting

### Identity not syncing

1. Check PostHog API key is configured
2. Verify Supabase auth is working
3. Check browser console for PostHog errors
4. Verify `identity_link` records in database

### Duplicate person records

If multiple person records exist for same email:
1. Use `resolvePersonId()` to find primary
2. Migrate identity_links to primary
3. Delete duplicate person records

### PostHog events not attributed

1. Verify `distinct_id` is being set correctly
2. Check PostHog dashboard for person profile
3. Verify events have `distinct_id` property
4. Check identity_link table for posthog platform
