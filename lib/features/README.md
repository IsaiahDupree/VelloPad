# Person Features Computation

**Feature:** GDP-011
**Status:** ✅ Implemented

## Overview

The Person Features system computes behavioral engagement metrics for each user based on their event history. These pre-computed features enable fast segmentation, targeting, and personalization without running complex queries at runtime.

## What Are Person Features?

Person Features are aggregated metrics computed from a user's behavioral data:

- **Activity Metrics**: Active days over 7d/30d/90d windows
- **Event Counts**: Total events and time-windowed event counts
- **Core Actions**: VelloPad-specific actions (books created, words written, PDFs generated)
- **Engagement Indicators**: Pricing views, template previews
- **Email Engagement**: Open rates, click rates
- **Subscription Metrics**: Subscriber status, MRR
- **Revenue Metrics**: Total revenue, purchase timestamps
- **Computed Scores**: Engagement score (0-100), activation score, churn risk

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       Event Sources                          │
│                                                              │
│  • Web App Events (book_created, chapter_written, etc.)     │
│  • Email Events (opened, clicked)                           │
│  • Stripe Events (purchase, subscription)                   │
│  • Meta Events (tracked conversions)                        │
│                                                              │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ↓
┌──────────────────────────────┴───────────────────────────────┐
│                    Unified Events Table                      │
│                                                              │
│  person_id | event_name    | event_timestamp | properties   │
│  ──────────┼───────────────┼─────────────────┼──────────────│
│  user-123  | book_created  | 2026-01-25      | {...}        │
│  user-123  | words_written | 2026-01-26      | {count:500}  │
│  user-123  | pdf_generated | 2026-01-27      | {...}        │
│                                                              │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ↓
┌──────────────────────────────┴───────────────────────────────┐
│              compute_person_features(person_id)              │
│                                                              │
│  • Aggregates events by person_id                           │
│  • Counts active days (DISTINCT DATE(timestamp))            │
│  • Sums core actions (books, words, PDFs)                   │
│  • Calculates email engagement rates                        │
│  • Computes engagement score                                │
│                                                              │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ↓
┌──────────────────────────────┴───────────────────────────────┐
│                    Person Features Table                     │
│                                                              │
│  person_id  | engagement_score | books_created | ...         │
│  ───────────┼──────────────────┼───────────────┼─────────   │
│  user-123   | 68               | 3             | ...         │
│                                                              │
│  • Used for segmentation (engagement score > 70)            │
│  • Used for targeting (churn_risk > 60)                     │
│  • Used for personalization (recommend next action)         │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## Usage

### Compute Features for Current User

```typescript
import { computePersonFeatures, getPersonFeatures } from '@/lib/features/person-features';

// Compute features
await computePersonFeatures(personId);

// Retrieve computed features
const features = await getPersonFeatures(personId);

console.log(`Engagement Score: ${features.engagement_score}`);
console.log(`Books Created: ${features.books_created}`);
console.log(`Active Days (30d): ${features.active_days_30d}`);
```

### Via API

**Compute Features:**
```bash
POST /api/features/compute
Content-Type: application/json

{
  "person_id": "optional-person-id" # Defaults to current user
}
```

**Get Features:**
```bash
GET /api/features/compute?person_id={person_id}
```

### Ensure Fresh Features

```typescript
import { ensureFreshFeatures } from '@/lib/features/person-features';

// Compute if features are stale (> 24 hours old)
await ensureFreshFeatures(personId);
```

### Batch Computation

```typescript
import { batchComputePersonFeatures } from '@/lib/features/person-features';

const personIds = ['person-1', 'person-2', 'person-3'];
const result = await batchComputePersonFeatures(personIds);

console.log(`Success: ${result.success.length}`);
console.log(`Failed: ${result.failed.length}`);
```

## Computed Metrics

### Activity Metrics

| Metric | Description | Use Case |
|--------|-------------|----------|
| `active_days_7d` | Days active in last 7 days | Detect recent engagement drop |
| `active_days_30d` | Days active in last 30 days | Measure monthly engagement |
| `active_days_90d` | Days active in last 90 days | Long-term usage pattern |

### Core Actions

| Metric | Description | Activation Goal |
|--------|-------------|-----------------|
| `books_created` | Total books created | ≥ 1 |
| `chapters_written` | Total chapters written | ≥ 5 |
| `words_written` | Total words written | ≥ 300 |
| `pdfs_generated` | PDFs generated | ≥ 1 |
| `orders_placed` | Print orders placed | ≥ 1 |

### Email Engagement

| Metric | Calculation | Benchmark |
|--------|-------------|-----------|
| `email_open_rate` | (opened / sent) × 100 | Good: > 40% |
| `email_click_rate` | (clicked / sent) × 100 | Good: > 10% |

### Computed Scores

**Engagement Score (0-100):**
```
engagement_score = MIN(100,
  (active_days_30d × 3) +
  (MIN(events_30d, 50) × 1) +
  (books_created × 10)
)
```

- **0-30**: Inactive
- **30-50**: Low engagement
- **50-70**: Medium engagement
- **70+**: High engagement

**Activation Score (0-100):**
- Based on completion of core activation milestones
- Fully activated: book created + 300+ words + PDF generated

**Churn Risk Score (0-100):**
- Computed from recent activity patterns
- High risk: > 60

## Helper Functions

### Get Engagement Segment

```typescript
import { getEngagementSegment } from '@/lib/features/person-features';

const segment = getEngagementSegment(features);
// Returns: 'high_engagement' | 'medium_engagement' | 'low_engagement' | 'inactive'
```

### Get Activation Status

```typescript
import { getActivationStatus } from '@/lib/features/person-features';

const { status, nextStep } = getActivationStatus(features);

if (status === 'not_activated') {
  console.log(`Next step: ${nextStep}`); // "Create your first book"
}
```

### Check Churn Risk

```typescript
import { isAtRiskOfChurn } from '@/lib/features/person-features';

if (isAtRiskOfChurn(features)) {
  // Trigger retention campaign
  await sendRetentionEmail(personId);
}
```

### Get Recommendations

```typescript
import { getRecommendations } from '@/lib/features/person-features';

const recommendations = getRecommendations(features);

recommendations.forEach(rec => {
  console.log(`• ${rec}`);
});

// Example output:
// • Set a daily writing goal to build momentum
// • Generate a PDF preview to see your book come to life
// • Order a proof copy to see your book in print
```

## Automated Computation

### Cron Job

Features are automatically computed daily for all recently active users:

```typescript
// app/api/cron/compute-features/route.ts
POST /api/cron/compute-features

// Computes for all persons active in last 30 days
// Schedule: Daily at 2 AM UTC (Vercel Cron: 0 2 * * *)
```

### Trigger on Events

You can also trigger feature computation when specific events occur:

```typescript
import { computePersonFeatures } from '@/lib/features/person-features';

// After important event
await trackEvent('pdf_generated', properties);

// Recompute features (async, don't block)
computePersonFeatures(personId).catch(err =>
  console.error('Failed to compute features:', err)
);
```

## Segmentation Examples

### High-Value Users

```sql
SELECT * FROM person_features
WHERE engagement_score >= 70
  AND books_created >= 2
  AND is_subscriber = true;
```

### Activation Campaign Targets

```sql
SELECT * FROM person_features
WHERE books_created >= 1
  AND words_written < 300
  AND active_days_7d = 0;
```

### Churn Risk Cohort

```sql
SELECT * FROM person_features
WHERE is_subscriber = true
  AND churn_risk_score >= 60;
```

### Email Re-engagement

```sql
SELECT * FROM person_features
WHERE email_open_rate < 20
  AND emails_sent >= 5
  AND active_days_30d < 5;
```

## Performance

### Database Function

The `compute_person_features()` function runs multiple aggregation queries:

- Average execution time: **~50-100ms** per person
- Indexed queries on `person_id` and `event_timestamp`
- Uses `UPSERT` to update or insert features

### Caching Strategy

Features are cached in the `person_features` table with `computed_at` timestamp:

- **Fresh**: < 24 hours old
- **Stale**: ≥ 24 hours old
- Use `ensureFreshFeatures()` to recompute if stale

## Testing

### Unit Tests

```bash
npm test lib/features/person-features.test.ts
```

### E2E Tests

```bash
npx playwright test e2e/person-features.spec.ts
```

Tests verify:
- ✅ Features are computed and stored
- ✅ All metrics are present and valid
- ✅ Engagement scores reflect user behavior
- ✅ Email metrics calculated correctly
- ✅ Subscriber status tracked
- ✅ Features have fresh timestamps

## Monitoring

### Cron Job Monitoring

Check cron job logs to ensure features are computing:

```bash
# Vercel logs
vercel logs --production --function=api/cron/compute-features
```

Expected output:
```
[Cron] Computed features for 1,234 persons in 45,678ms
```

### Stale Features Alert

Set up monitoring to detect stale features:

```sql
SELECT COUNT(*) as stale_count
FROM person_features
WHERE computed_at < NOW() - INTERVAL '48 hours';
```

Alert if `stale_count > 100`.

## Related Features

- **GDP-001**: Growth Data Plane Schema
- **GDP-003**: Unified Events Table
- **GDP-012**: Segment Engine (uses person features)
- **BS-701**: Event Collection Pipeline

## References

- [Database Migration: 20260126000001_add_growth_data_plane.sql](../../supabase/migrations/20260126000001_add_growth_data_plane.sql)
- [Segment Definitions](../../supabase/migrations/20260126000001_add_growth_data_plane.sql#L870-L901)
- [compute_person_features Function](../../supabase/migrations/20260126000001_add_growth_data_plane.sql#L718-L821)
