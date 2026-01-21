# Lifecycle Email Automations (BS-702)

Automated email campaigns for key user lifecycle events.

## Features

### Email Types

1. **Activation Email** (`activation_nudge`)
   - Trigger: 24h after signup with no activity
   - Goal: Get users to create their first book
   - Personalization: First name, workspace name

2. **Stalled Writer Email** (`stalled_writer`)
   - Trigger: 7 days inactive (no book updates)
   - Goal: Re-engage writers who have started but stopped
   - Personalization: Book title, current word count

3. **Proof Push Email** (`proof_push`)
   - Trigger: 3 days after PDF generation, no order placed
   - Goal: Convert PDF generation to purchase
   - Personalization: Book title, days since PDF ready

4. **Post-Delivery Email** (`post_delivery`)
   - Trigger: 7 days after order delivery
   - Goal: Collect feedback and encourage reorders
   - Personalization: Book title, order number

5. **First Draft Complete Email** (`first_draft_complete`)
   - Trigger: Book reaches 10,000 words
   - Goal: Celebrate milestone and push toward completion
   - Personalization: Book title, word count

6. **Order Confirmation Email** (`order_confirmation`)
   - Trigger: Immediately after order placed
   - Goal: Confirm order and set expectations
   - Personalization: Order details, shipping address

7. **Order Shipped Email** (`order_shipped`)
   - Trigger: Order status changes to 'shipped'
   - Goal: Provide tracking information
   - Personalization: Tracking number, carrier

## Usage

### Manual Trigger (API)

```typescript
// Send activation email
const response = await fetch('/api/emails/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    emailType: 'activation',
    userId: 'user-id',
  }),
});

// Send proof push email
const response = await fetch('/api/emails/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    emailType: 'proof_push',
    userId: 'user-id',
    bookId: 'book-id',
  }),
});
```

### Automated Trigger (Cron)

Set up a cron job to hit the `/api/cron/emails` endpoint:

**Vercel Cron (vercel.json):**
```json
{
  "crons": [
    {
      "path": "/api/cron/emails",
      "schedule": "0 * * * *"
    }
  ]
}
```

**GitHub Actions:**
```yaml
name: Lifecycle Emails
on:
  schedule:
    - cron: '0 * * * *'  # Every hour
jobs:
  send-emails:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger lifecycle emails
        run: |
          curl -X GET https://vellopad.com/api/cron/emails \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

**External Cron Service (e.g., cron-job.org):**
- URL: `https://vellopad.com/api/cron/emails`
- Method: GET
- Header: `Authorization: Bearer YOUR_CRON_SECRET`
- Schedule: Every hour

## Email Template Variables

### Common Variables
- `{{first_name}}` - User's first name
- `{{workspace_name}}` - Workspace name

### Email-Specific Variables

**Activation:**
- `{{first_name}}`
- `{{workspace_name}}`

**Stalled Writer:**
- `{{first_name}}`
- `{{book_title}}`
- `{{word_count}}`

**Proof Push:**
- `{{first_name}}`
- `{{book_title}}`
- `{{pdf_ready_days}}`

**Post-Delivery:**
- `{{first_name}}`
- `{{book_title}}`
- `{{order_number}}`

**First Draft Complete:**
- `{{first_name}}`
- `{{book_title}}`
- `{{word_count}}`

**Order Confirmation:**
- `{{first_name}}`
- `{{order_number}}`
- `{{book_title}}`
- `{{total_amount}}`
- `{{shipping_address}}`

**Order Shipped:**
- `{{first_name}}`
- `{{order_number}}`
- `{{book_title}}`
- `{{tracking_number}}`
- `{{carrier}}`

## Email Template Management

Templates are stored in the `email_templates` table. Default templates are seeded via migration `20260121000007_add_events_schema.sql`.

### Updating Templates

Update templates via Supabase Studio or API:

```sql
UPDATE email_templates
SET
  subject_line = 'Your book is waiting! 📚',
  html_body = '<p>Hey {{first_name}}, ...',
  updated_at = NOW()
WHERE template_key = 'activation_nudge';
```

## Monitoring

### Email Sends Tracking

All emails are logged in the `email_sends` table with:
- Status tracking (pending, sent, delivered, opened, clicked, bounced, failed)
- Engagement metrics (opened_at, clicked_at)
- Error logging
- Provider message IDs

### Analytics Queries

**Email engagement rate:**
```sql
SELECT
  template_id,
  COUNT(*) as total_sent,
  COUNT(CASE WHEN opened_at IS NOT NULL THEN 1 END) as opened,
  COUNT(CASE WHEN clicked_at IS NOT NULL THEN 1 END) as clicked,
  ROUND(100.0 * COUNT(CASE WHEN opened_at IS NOT NULL THEN 1 END) / COUNT(*), 2) as open_rate,
  ROUND(100.0 * COUNT(CASE WHEN clicked_at IS NOT NULL THEN 1 END) / COUNT(*), 2) as click_rate
FROM email_sends
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY template_id;
```

## Configuration

### Environment Variables

```bash
# Email provider (Resend)
RESEND_API_KEY=re_...

# From address
EMAIL_FROM=hello@vellopad.com

# Cron security
CRON_SECRET=your-random-secret
```

## Dependencies

- `resend` - Email delivery service
- Supabase tables: `email_templates`, `email_sends`
- Event system (BS-701)

## Testing

### Send Test Email

```bash
curl -X POST https://vellopad.com/api/emails/send \
  -H "Content-Type: application/json" \
  -d '{
    "emailType": "activation",
    "userId": "test-user-id"
  }'
```

### Run Cron Manually

```bash
curl -X GET https://vellopad.com/api/cron/emails \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Best Practices

1. **Test Templates:** Always test email templates before activating
2. **Monitor Bounce Rates:** High bounce rates indicate deliverability issues
3. **Respect Unsubscribes:** Implement unsubscribe mechanism (future feature)
4. **A/B Testing:** Test subject lines and content variations
5. **Send Time Optimization:** Consider user timezone for better engagement
6. **Frequency Capping:** Don't send too many emails to same user

## Future Enhancements

- [ ] Unsubscribe management
- [ ] Email preferences per user
- [ ] A/B testing framework
- [ ] Send time optimization
- [ ] Multi-language support
- [ ] SMS notifications
- [ ] Push notifications
