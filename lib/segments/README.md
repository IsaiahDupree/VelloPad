# Segment Engine (GDP-012)

The Segment Engine evaluates user cohorts based on behavioral and feature data, enabling targeted campaigns and automations.

## Overview

The segment engine provides:

- **Dynamic Segmentation**: Automatically evaluate persons against segment filter criteria
- **Membership Tracking**: Track when persons enter/exit segments with full history
- **Automation Triggers**: Trigger campaigns (Resend, Meta, outbound) when segment membership changes
- **Flexible Filters**: Support complex boolean logic and comparison operators

## Core Concepts

### Segments

A segment is a cohort of persons defined by filter criteria. There are three types:

- **`dynamic`**: Membership computed on-demand based on current person features
- **`behavioral`**: Membership based on event sequences and patterns
- **`static`**: Manually managed membership list

### Filter Criteria

Filters use MongoDB-like query syntax with support for:

#### Logical Operators

```typescript
{
  $and: [...filters],  // All conditions must match
  $or: [...filters],   // Any condition must match
  $not: {...filter}    // Negates the filter
}
```

#### Comparison Operators

```typescript
{
  field: { $eq: value },       // Equal to
  field: { $ne: value },       // Not equal to
  field: { $gt: number },      // Greater than
  field: { $gte: number },     // Greater than or equal
  field: { $lt: number },      // Less than
  field: { $lte: number },     // Less than or equal
  field: { $in: [...values] }, // In array
  field: { $nin: [...values] },// Not in array
  field: { $exists: boolean }  // Field exists/doesn't exist
}
```

#### Direct Equality

```typescript
{
  field: value  // Direct equality check
}
```

## Example Segments

### New Signups (No Book Created)

Users who signed up but haven't created a book in 48 hours:

```json
{
  "lifecycle_stage": "lead",
  "books_created": 0,
  "hours_since_signup": { "$gte": 48 }
}
```

### High Engagement Users

Users with high engagement scores:

```json
{
  "engagement_score": { "$gte": 70 }
}
```

### PDF Generated (No Order)

Users who generated a PDF but haven't ordered:

```json
{
  "pdfs_generated": { "$gte": 1 },
  "orders_placed": 0
}
```

### At Risk Subscribers

Active subscribers with low recent activity:

```json
{
  "$and": [
    { "is_subscriber": true },
    { "active_days_30d": { "$lt": 2 } },
    { "engagement_score": { "$lt": 30 } }
  ]
}
```

### Complex Multi-Condition

Books created AND words written AND (PDF generated OR high engagement):

```json
{
  "$and": [
    { "books_created": { "$gte": 1 } },
    { "words_written": { "$gte": 1000 } },
    {
      "$or": [
        { "pdfs_generated": { "$gte": 1 } },
        { "engagement_score": { "$gte": 80 } }
      ]
    }
  ]
}
```

## Usage

### Evaluate Person for Segment

Check if a specific person matches segment criteria:

```typescript
import { evaluatePersonForSegment } from '@/lib/segments/segment-engine';

const result = await evaluatePersonForSegment(personId, segmentId);

if (result.matches) {
  console.log('Person matches segment!');
} else {
  console.log('Person does not match:', result.reason);
}
```

### Compute Segment Membership

Recompute membership for all persons:

```typescript
import { computeSegmentMembership } from '@/lib/segments/segment-engine';

const stats = await computeSegmentMembership(segmentId);

console.log(`Added: ${stats.membersAdded}`);
console.log(`Removed: ${stats.membersRemoved}`);
console.log(`Total: ${stats.totalMembers}`);
```

### Get Segment Members

Retrieve all active members of a segment:

```typescript
import { getSegmentMembers } from '@/lib/segments/segment-engine';

const members = await getSegmentMembers(segmentId);

for (const member of members) {
  console.log(`Person ${member.personId} entered at ${member.enteredAt}`);
}
```

### Get Person's Segments

Find all segments a person belongs to:

```typescript
import { getPersonSegments } from '@/lib/segments/segment-engine';

const segments = await getPersonSegments(personId);

for (const segment of segments) {
  console.log(`Person is in: ${segment.segment_name}`);
}
```

### Create New Segment

```typescript
import { createSegment } from '@/lib/segments/segment-engine';

const segment = await createSegment({
  segmentName: 'Active Writers',
  segmentKey: 'active_writers',
  description: 'Users who write regularly',
  segmentType: 'dynamic',
  filterCriteria: {
    books_created: { $gte: 1 },
    active_days_30d: { $gte: 10 },
    words_written: { $gte: 5000 },
  },
});
```

### Update Segment Criteria

```typescript
import { updateSegmentCriteria } from '@/lib/segments/segment-engine';

await updateSegmentCriteria(segmentId, {
  engagement_score: { $gte: 80 },
  is_subscriber: true,
});

// Membership automatically recomputed
```

### Batch Compute (Scheduled Job)

Recompute all active segments:

```typescript
import { batchComputeSegmentMembership } from '@/lib/segments/segment-engine';

// Compute all segments
const { results } = await batchComputeSegmentMembership();

// Or compute specific segments
const { results } = await batchComputeSegmentMembership([segmentId1, segmentId2]);

for (const result of results) {
  if (result.success) {
    console.log(`✓ ${result.segmentId}: ${result.stats.totalMembers} members`);
  } else {
    console.error(`✗ ${result.segmentId}: ${result.error}`);
  }
}
```

## Available Fields

### From `person` table

- `lifecycle_stage`: lead, activated, engaged, customer, churned
- `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`
- `country_code`, `city`, `timezone`
- `first_seen_at`, `last_seen_at` (timestamps)

### From `person_features` table

- **Activity**: `active_days_7d`, `active_days_30d`, `active_days_90d`
- **Events**: `total_events`, `events_7d`, `events_30d`
- **Core Actions**: `books_created`, `chapters_written`, `words_written`, `pdfs_generated`, `orders_placed`
- **Engagement**: `pricing_views`, `template_previews`
- **Email**: `emails_sent`, `emails_opened`, `emails_clicked`, `email_open_rate`, `email_click_rate`
- **Subscription**: `is_subscriber`, `subscription_mrr_cents`
- **Revenue**: `total_revenue_cents`, `first_purchase_at`, `last_purchase_at`
- **Scores**: `engagement_score`, `activation_score`, `churn_risk_score` (0-100)
- **Activity**: `last_active_at`

## Scheduled Jobs

### Nightly Segment Computation

Recompute all segments daily to keep membership fresh:

```typescript
// app/api/cron/compute-segments/route.ts
import { batchComputeSegmentMembership } from '@/lib/segments/segment-engine';

export async function GET(request: Request) {
  const { results } = await batchComputeSegmentMembership();

  const successCount = results.filter((r) => r.success).length;
  const failureCount = results.filter((r) => !r.success).length;

  return Response.json({
    success: true,
    segmentsComputed: successCount,
    segmentsFailed: failureCount,
    results,
  });
}
```

## Automation Triggers (Future)

When a person enters a segment, trigger:

- **Resend Email**: Send targeted lifecycle email
- **Meta Custom Audience**: Add to Facebook/Instagram custom audience for ad targeting
- **Outbound Campaign**: Trigger sales outreach or personalized message

When a person exits a segment, trigger:

- **Meta Audience Removal**: Remove from custom audience
- **Re-engagement Email**: Win-back campaign

## Performance Considerations

- **Batch Operations**: Use `batchComputeSegmentMembership()` for scheduled jobs
- **Feature Freshness**: Person features should be computed before segment evaluation
- **Indexes**: All filter fields have database indexes for fast queries
- **Async Processing**: Large segment computations should run in background jobs

## Testing

Run E2E tests:

```bash
npx playwright test e2e/segment-engine.spec.ts
```

## API Routes

- `POST /api/segments/:id/evaluate` - Evaluate person for segment
- `POST /api/segments/:id/compute-membership` - Recompute segment membership
- `GET /api/segments/:id/members` - Get segment members
- `POST /api/segments` - Create new segment
- `PATCH /api/segments/:id` - Update segment criteria

## Database Schema

### `segment` table

```sql
CREATE TABLE segment (
  id UUID PRIMARY KEY,
  segment_name VARCHAR(100) UNIQUE NOT NULL,
  segment_key VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  filter_criteria JSONB NOT NULL,
  segment_type VARCHAR(50) NOT NULL, -- 'static', 'dynamic', 'behavioral'
  is_active BOOLEAN DEFAULT true,
  member_count INT DEFAULT 0,
  last_computed_at TIMESTAMPTZ,
  properties JSONB DEFAULT '{}'::JSONB,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### `segment_membership` table

```sql
CREATE TABLE segment_membership (
  id UUID PRIMARY KEY,
  segment_id UUID NOT NULL REFERENCES segment(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES person(id) ON DELETE CASCADE,
  entered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  exited_at TIMESTAMPTZ,
  properties JSONB DEFAULT '{}'::JSONB,
  UNIQUE(segment_id, person_id)
);
```

## Default Segments

The system includes pre-seeded segments:

1. **signup_no_book_48h**: New signups without books
2. **book_created_no_words_72h**: Books created but no writing
3. **writing_streak_broken**: Active writers who stopped
4. **10k_words_no_pdf**: High word count, no PDF
5. **pdf_generated_no_order**: PDF generated, no order
6. **first_order_placed**: First-time buyers
7. **high_engagement**: Engagement score > 70
8. **at_risk_churn**: High churn risk subscribers
9. **active_subscribers**: Active subscriptions
10. **email_engagers**: High email engagement

## Future Enhancements

- [ ] Segment A/B testing
- [ ] Predictive segments (ML-based)
- [ ] Real-time segment evaluation triggers
- [ ] Segment comparison and overlap analysis
- [ ] Export segments to external platforms (HubSpot, Salesforce)
