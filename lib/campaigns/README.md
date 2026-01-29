# Admin Broadcast Campaigns (BS-703)

## Overview

The Admin Broadcast Tool allows workspace owners and admins to create and send targeted email campaigns to user segments. This feature integrates with the Growth Data Plane segments and email infrastructure to enable personalized mass communications.

## Architecture

### Database Schema

**Tables Created:**
- `campaign_segments` - Links campaigns to target segments (many-to-many)
- `email_sends` - Tracks individual email sends for analytics and deduplication

**Campaigns Table Extensions:**
- `email_subject` - Email subject line
- `email_content` - Email body with template variables
- `preview_text` - Preview text for email clients
- `segment_ids` - Array of target segment UUIDs
- `send_count`, `delivered_count`, `opened_count`, `clicked_count` - Analytics counters

### Components

**Backend:**
- `lib/campaigns/broadcast-service.ts` - Core business logic
- `app/api/campaigns/` - REST API endpoints
- `supabase/migrations/20260129000002_add_broadcast_campaigns.sql` - Database migration

**Frontend:**
- `app/(app)/admin/campaigns/page.tsx` - Campaigns list page
- `app/(app)/admin/campaigns/new/page.tsx` - Create campaign wizard
- `app/(app)/admin/campaigns/[campaignId]/page.tsx` - Campaign detail page
- `components/campaigns/CampaignsList.tsx` - List component
- `components/campaigns/CampaignWizard.tsx` - Multi-step creation wizard
- `components/campaigns/CampaignDetail.tsx` - Detail view with send controls

**Testing:**
- `e2e/admin-campaigns.spec.ts` - Comprehensive E2E test suite

## API Endpoints

### List Campaigns
```
GET /api/campaigns?workspace_id={id}&status={draft|sent|failed}
```

### Create Campaign
```
POST /api/campaigns
{
  "workspace_id": "uuid",
  "name": "Campaign Name",
  "description": "Optional description",
  "email_subject": "Subject Line",
  "email_content": "Hi {{first_name}}, ...",
  "preview_text": "Preview text",
  "segment_ids": ["segment-uuid-1", "segment-uuid-2"]
}
```

### Get Campaign
```
GET /api/campaigns/{campaignId}
```

### Update Campaign
```
PATCH /api/campaigns/{campaignId}
{
  "name": "Updated Name",
  "email_subject": "New Subject",
  ...
}
```

### Delete Campaign
```
DELETE /api/campaigns/{campaignId}
```

### Send Campaign
```
POST /api/campaigns/{campaignId}/send
```

### Get Audience Preview
```
GET /api/campaigns/{campaignId}/audience
```

### Get Campaign Stats
```
GET /api/campaigns/{campaignId}/stats
```

## Template Variables

The email content supports the following template variables:

- `{{first_name}}` - User's first name
- `{{last_name}}` - User's last name
- `{{email}}` - User's email address
- `{{book_title}}` - User's book title (if applicable)

Example:
```
Hi {{first_name}},

Your book "{{book_title}}" is ready to print!

Best regards,
The VelloPad Team
```

## Features

### Campaign Creation Wizard
1. **Campaign Details** - Name and description
2. **Select Segments** - Choose target user segments
3. **Compose Email** - Write subject, preview text, and content
4. **Review & Create** - Confirm details before creating

### Campaign Management
- View all campaigns with status badges (Draft, Sending, Sent, Failed)
- Filter campaigns by status
- Edit draft campaigns
- Delete draft campaigns
- Send campaigns to segments
- View campaign statistics

### Email Tracking
- Total sent count
- Delivered count
- Opened count (via Resend webhooks)
- Clicked count (via click tracking)
- Bounce and failure tracking

### Deduplication
- Automatic deduplication across segments (users appear only once)
- Prevents duplicate sends with UNIQUE constraint on (campaign_id, person_id)
- Checks for existing sends before dispatching

## Security

### Row Level Security (RLS)
- All campaign operations require owner/admin role
- Campaigns are scoped to workspaces
- Email sends are protected by campaign ownership

### Permissions
- Only workspace **owners** and **admins** can:
  - View campaigns
  - Create campaigns
  - Send campaigns
  - View campaign statistics

### API Protection
- All endpoints verify user authentication
- Workspace membership and role checks on every request
- Campaign status validation (e.g., can't send already-sent campaigns)

## Database Triggers

### `update_campaign_stats()`
Automatically updates campaign statistics when email_sends records change:
- Increments `send_count` on new sends
- Updates `delivered_count`, `opened_count`, `clicked_count` based on email events

## Integration Points

### Growth Data Plane
- Uses `segment` and `segment_membership` tables for targeting
- Links to `person` table for recipient data
- Stores events in unified events pipeline

### Email Infrastructure
- Integrates with `lib/email/resend-client.ts` for sending
- Creates `email_message` records for tracking
- Webhooks update `email_sends` status from Resend events

## Usage Example

```typescript
import {
  createBroadcastCampaign,
  sendBroadcastCampaign,
  getCampaignStats
} from '@/lib/campaigns/broadcast-service';

// Create campaign
const { campaign, error } = await createBroadcastCampaign({
  workspace_id: 'workspace-uuid',
  name: 'Summer Launch 2024',
  email_subject: 'Your book is ready!',
  email_content: 'Hi {{first_name}},\n\nGreat news...',
  segment_ids: ['segment-uuid-1', 'segment-uuid-2']
});

// Send campaign
const result = await sendBroadcastCampaign(campaign.id);
console.log(`Sent to ${result.sent_count} recipients`);

// Get stats
const { stats } = await getCampaignStats(campaign.id);
console.log(`Open rate: ${stats.open_rate}%`);
```

## Testing

Run E2E tests:
```bash
npx playwright test e2e/admin-campaigns.spec.ts
```

Test coverage includes:
- Campaign list access control
- Campaign creation flow
- Audience preview
- Campaign sending
- Statistics display
- Empty segment warnings
- Duplicate send prevention
- Non-admin access denial

## Future Enhancements

- [ ] A/B testing for subject lines
- [ ] Scheduled sends
- [ ] Campaign templates library
- [ ] Rich text editor (WYSIWYG)
- [ ] Image uploads and inline images
- [ ] Dynamic content blocks
- [ ] Send time optimization
- [ ] Unsubscribe link injection
- [ ] Spam score checking
- [ ] Send rate limiting/throttling

## Dependencies

- BS-701: Event Collection Pipeline
- GDP-001: Growth Data Plane schema
- GDP-002: Person & Identity tables
- GDP-004: Resend webhook integration
- Email infrastructure (Resend)
- Segment engine

## Status

✅ **Complete** - Feature is implemented and ready for testing

Completion: Phase 7 (BS-EP07: Admin Campaigns)
