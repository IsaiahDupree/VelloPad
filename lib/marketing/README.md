# Marketing Hub (BS-802)

The Marketing Hub is a comprehensive marketing management system for VelloPad, providing daily task management, AI-powered weekly plan generation, and performance metrics tracking.

## Features

### 1. Daily Task Management
- Create, assign, and track marketing tasks
- Task types: email, content, social, seo, analytics, campaign
- Priority levels: low, medium, high, urgent
- Status tracking: pending, in_progress, completed, blocked, cancelled
- Result metrics tracking for completed tasks

### 2. AI-Powered Weekly Plan Generation
- Analyzes previous week's performance metrics
- Generates strategic goals and recommended actions
- Creates 10-15 daily tasks across different marketing channels
- Supports both AI (Claude/OpenAI) and fallback mock generation

### 3. Metrics Dashboard
- Real-time metrics: signups, activations, PDFs, orders, revenue
- 30-day trend analysis with change percentages
- Conversion funnel tracking (signup → activation → order)
- Email performance metrics (sent, opened, clicked)
- UTM source breakdown

## Architecture

### Database Schema
- `marketing_tasks` - Daily marketing tasks
- `marketing_weekly_plans` - AI-generated weekly plans
- `marketing_metrics_snapshot` - Daily/weekly/monthly metrics aggregations
- `marketing_content_ideas` - SEO-driven content ideas (for future expansion)

### Service Layer
- `task-service.ts` - Task CRUD operations
- `plan-service.ts` - Weekly plan management
- `metrics-service.ts` - Metrics aggregation and computation
- `plan-generator.ts` - AI-powered plan generation
- `types.ts` - TypeScript type definitions

### API Routes
- `/api/marketing/tasks` - Task management
- `/api/marketing/plans` - Weekly plan management
- `/api/marketing/plans/generate` - AI plan generation
- `/api/marketing/metrics/dashboard` - Dashboard metrics

## Setup

### 1. Database Migration
Run the migration to create necessary tables:
```bash
# Migration already applied: 20260202000002_add_marketing_hub_schema.sql
```

### 2. Environment Variables (Optional)
For AI-powered plan generation, add one of these to `.env.local`:
```bash
# Option 1: Claude (Anthropic) - Recommended
ANTHROPIC_API_KEY=sk-ant-...

# Option 2: OpenAI (not yet implemented)
OPENAI_API_KEY=sk-...
```

Without API keys, the system will use a mock plan generator that creates functional plans based on templates.

## Usage

### Accessing the Marketing Hub
Navigate to `/admin/marketing` in the app. The dashboard shows:
- Today's marketing tasks
- Current week's plan
- Key performance metrics
- 30-day trend charts

### Generating a Weekly Plan
1. Click "Generate Weekly Plan" button
2. The AI analyzes:
   - Previous week's performance metrics
   - Current goals and targets
   - Historical trends
3. A new plan is created with:
   - Strategic summary
   - 3-5 measurable goals
   - 3-5 recommended strategies
   - 10-15 daily tasks distributed across the week

### Managing Tasks
**Create a Task:**
```typescript
POST /api/marketing/tasks
{
  "title": "Send activation email campaign",
  "description": "Target new signups from last 48 hours",
  "task_type": "email",
  "priority": "high",
  "due_date": "2026-02-03",
  "workspace_id": "workspace-uuid"
}
```

**Complete a Task:**
```typescript
POST /api/marketing/tasks/{taskId}/complete
{
  "metrics": {
    "emails_sent": 150,
    "open_rate": 0.24,
    "click_rate": 0.08
  },
  "notes": "Campaign performed well, 24% open rate"
}
```

**Get Today's Tasks:**
```typescript
GET /api/marketing/tasks/daily?workspace_id={workspace_id}
```

### Viewing Metrics
**Dashboard Metrics:**
```typescript
GET /api/marketing/metrics/dashboard?workspace_id={workspace_id}
```

Returns:
- Today's metrics
- Yesterday's metrics
- This week's metrics
- Last week's metrics
- 30-day trends (signups, activations, revenue)

## AI Plan Generation

### How It Works
1. **Context Building**: Aggregates previous week's metrics, current goals, recent campaigns
2. **AI Prompting**: Sends context to Claude/OpenAI with strategic marketing instructions
3. **Plan Parsing**: Extracts summary, goals, strategies, and tasks from AI response
4. **Database Storage**: Saves plan and creates linked tasks
5. **Fallback**: If AI unavailable, uses template-based mock generator

### Prompt Engineering
The AI is instructed to:
- Analyze performance trends
- Identify growth opportunities
- Recommend specific, actionable strategies
- Generate realistic daily tasks across channels
- Set measurable goals with targets

### Example AI-Generated Plan
```json
{
  "plan_summary": "Focus on user acquisition and activation. Double down on email campaigns, content marketing, and social engagement.",
  "goals": [
    {
      "metric": "signups",
      "target": 50,
      "current": 25,
      "description": "Increase new user signups by 20%"
    }
  ],
  "strategies": [
    {
      "name": "Activation Email Series",
      "description": "Launch 3-part email series for new signups",
      "priority": 1
    }
  ],
  "tasks": [
    {
      "title": "Send activation email to new signups",
      "task_type": "email",
      "priority": "high",
      "due_date": "2026-02-03"
    }
  ]
}
```

## Metrics Computation

### Daily Metrics
Computed automatically from:
- `event` table (signups, activations, actions)
- `orders` table (revenue, order count)
- `email_event` table (sent, opened, clicked)

### Aggregation Schedule
For production deployment, set up cron jobs:
```typescript
// Daily at midnight
GET /api/cron/marketing/daily-snapshot

// Weekly on Mondays at 6am
GET /api/cron/marketing/generate-weekly-plan
```

## Testing

### E2E Tests
Comprehensive test suite in `e2e/marketing-hub.spec.ts`:
- Task creation, assignment, completion
- Weekly plan generation
- Metrics dashboard
- API validation and error handling

Run tests:
```bash
npm run test:e2e -- marketing-hub.spec.ts
```

## Integration Points

### Event Collection Pipeline (BS-701)
- Reads from `event` table to compute marketing metrics
- Tracks marketing-specific events: `pricing_viewed`, `template_previewed`

### Lifecycle Emails (BS-702)
- Marketing Hub can trigger new campaigns
- Views email performance metrics in dashboard
- Uses email engagement data for plan generation

### Segments (GDP-012)
- Create marketing campaigns targeting specific segments
- View segment growth trends in metrics
- Generate tasks to engage high-risk churn segments

### Admin Broadcast Tool (BS-703)
- Link marketing tasks to broadcast campaigns
- Track campaign results in task completion metrics
- Use campaign performance for weekly plan insights

## Future Enhancements

### Content Ideas Generator (Partially Implemented)
Database schema exists for `marketing_content_ideas` table. Future work:
- SEO keyword research integration
- AI-powered content idea generation
- Priority scoring based on search volume
- Promote ideas to tasks workflow

### Advanced Features
- Multi-provider support (OpenAI, Claude, Gemini)
- Custom goal templates per workspace
- Task templates library
- Calendar view of tasks and campaigns
- Team member workload balancing
- A/B test tracking integration
- Advanced attribution modeling

## Performance Considerations

### Metrics Caching
- Daily snapshots cached in `marketing_metrics_snapshot` table
- Dashboard queries hit cached data, not raw events
- Reduces load on event collection pipeline

### Async Plan Generation
- Plan generation runs asynchronously
- Long-running AI requests don't block UI
- Progress feedback via loading states

### Database Indexes
- Optimized indexes on:
  - `due_date` for task queries
  - `snapshot_date` for metrics queries
  - `week_start_date` for plan queries
- RLS policies ensure workspace data isolation

## Troubleshooting

### AI Plan Generation Fails
- Check API key configuration in environment variables
- Verify API key has sufficient credits/quota
- System automatically falls back to mock generator
- Check logs for detailed error messages

### Metrics Not Computing
- Ensure event collection pipeline (BS-701) is running
- Check that events are being written to `event` table
- Verify workspace_id is correct
- Run manual metrics computation via API

### Tasks Not Appearing
- Verify task `due_date` matches today's date
- Check task `status` (should not be completed/cancelled)
- Confirm correct `workspace_id` filter
- Check RLS policies for user permissions

## API Reference

See inline documentation in API route files:
- `app/api/marketing/tasks/route.ts`
- `app/api/marketing/plans/route.ts`
- `app/api/marketing/metrics/dashboard/route.ts`

## Contributing

When extending the Marketing Hub:
1. Add new task types to `TaskType` enum in `types.ts`
2. Update metrics computation in `metrics-service.ts`
3. Enhance AI prompts in `plan-generator.ts`
4. Add E2E tests in `e2e/marketing-hub.spec.ts`
5. Update this README with new features

## License
Part of the VelloPad platform.
