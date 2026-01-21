# VelloPad Development Guide

This guide provides detailed instructions for autonomous coding agents working on VelloPad.

## Quick Reference

- **Feature List**: `feature_list.json` (114 features)
- **Progress Log**: `claude-progress.txt`
- **PRD**: `docs/PRD-photo-book-platform.md`
- **Current Phase**: Foundation (Phase 1)

## Development Philosophy

### Feature-Driven Development

1. **All work is tracked in feature_list.json**
   - 114 features across 14 phases
   - Each feature has: ID, name, description, priority, effort, dependencies
   - Features start with `passes: false` and are marked `passes: true` when complete

2. **Respect Dependencies**
   - Never implement a feature until all its dependencies are complete
   - Dependencies are listed in the `dependencies` array of each feature
   - Use dependency graph to determine implementation order

3. **Test-Driven Approach**
   - Write tests alongside implementation
   - E2E tests for user-facing features (Playwright)
   - Unit tests for utility functions
   - Integration tests for API routes
   - Only mark `passes: true` when tests are passing

## Workflow for Coding Agents

### Starting a New Session

1. **Read claude-progress.txt**
   - Review previous session notes
   - Check what was in progress
   - Identify any blockers

2. **Check feature_list.json**
   - Find features with `passes: false`
   - Filter by priority (P0 first, then P1, then P2)
   - Verify dependencies are met

3. **Create session log entry**
   - Add new session to claude-progress.txt
   - Note session focus and features to work on

### Implementing a Feature

#### Step 1: Understand Requirements

```bash
# Example: Implementing BS-101 (Auth + Workspace Creation)
# Read the feature details from feature_list.json
{
  "id": "BS-101",
  "name": "Auth + Workspace Creation",
  "description": "User signup/login with default workspace creation",
  "priority": "P0",
  "phase": 1,
  "effort": "5pts",
  "files": ["src/app/auth/", "src/lib/auth/"],
  "dependencies": []
}
```

#### Step 2: Review Existing Code

- Check suggested files in the `files` array
- Review related features for context
- Look at existing patterns in the codebase

#### Step 3: Implement the Feature

**Code Organization Patterns:**

```
app/
  (app)/              # Authenticated routes (requires login)
    dashboard/
    books/
    orders/
  auth/               # Auth routes (login, signup)
  api/                # API routes
    webhooks/

lib/
  supabase/           # Database and auth clients
  print-orchestrator/ # Print provider abstraction
  queue/              # Job queue (BullMQ)

components/
  ui/                 # shadcn/ui primitives
  [feature]/          # Feature-specific components
```

**Database Schema:**
- Migrations go in `supabase/migrations/`
- Use Supabase SQL editor or CLI
- Name migrations: `YYYYMMDDHHMMSS_description.sql`

**API Routes:**
```typescript
// app/api/[feature]/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = createClient()
  // Implementation
  return NextResponse.json({ data })
}
```

**Component Structure:**
```typescript
// components/[feature]/component.tsx
'use client'

import { Button } from '@/components/ui/button'

export function FeatureComponent() {
  // Implementation
}
```

#### Step 4: Write Tests

**E2E Tests (Playwright):**
```typescript
// e2e/[feature].spec.ts
import { test, expect } from '@playwright/test'

test('feature works correctly', async ({ page }) => {
  await page.goto('/feature')
  // Test implementation
})
```

**Unit Tests:**
```typescript
// lib/[feature]/[module].test.ts
import { describe, it, expect } from 'vitest'

describe('Feature Module', () => {
  it('should work correctly', () => {
    // Test implementation
  })
})
```

#### Step 5: Update Feature Tracking

```json
// feature_list.json
{
  "id": "BS-101",
  "passes": true,  // ✅ Changed from false to true
  // ... rest of feature data
}
```

#### Step 6: Log Progress

```markdown
## Session #2 - 2026-01-21
**Focus Area:** Phase 1 - Auth
**Features Completed:** BS-101
**Features In Progress:** BS-102
**Notes:**
- Implemented Supabase auth with workspace creation
- Added RLS policies for workspace access
- E2E tests passing for signup/login flow
```

## Phase-by-Phase Implementation Guide

### Phase 1: Foundation & Auth (CURRENT)

**Priority Order:**
1. DB-001: Database Schema - Core
2. UI-001: Design System Setup
3. TEST-001: E2E Test Setup
4. BS-101: Auth + Workspace Creation
5. TEST-002: Auth E2E Tests
6. BS-102: Workspace Member Roles
7. BS-103: Settings Page

**Key Decisions:**
- Using Supabase Auth (no custom auth needed)
- Row Level Security (RLS) for multi-tenancy
- shadcn/ui for component library

**Database Tables:**
```sql
-- workspaces
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- workspace_members
CREATE TABLE workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id),
  user_id UUID REFERENCES auth.users(id),
  role TEXT NOT NULL, -- 'owner', 'admin', 'member'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- books
CREATE TABLE books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id),
  title TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- chapters
CREATE TABLE chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID REFERENCES books(id),
  title TEXT NOT NULL,
  content JSONB,
  sort_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Phase 2: Book Studio Core

**Priority Order:**
1. BS-201: Create Book Wizard
2. BS-202: Outline Builder
3. BS-203: Chapter Editor (TipTap integration)
4. TEST-003: Book Creation E2E
5. BS-204: Book Dashboard
6. BS-205: Version Snapshots

**Key Technologies:**
- TipTap for rich text editing
- DnD Kit for drag-and-drop
- Zustand or React Context for state

**Critical Path:**
BS-201 → BS-202 → BS-203 → BS-204

### Phase 3: Assets & Templates

**Priority Order:**
1. DB-002: Database Schema - Assets
2. BS-301: Asset Library
3. BS-302: Print Quality Warnings
4. BS-303: Template System
5. BS-304: Cover Basics

**Storage Integration:**
- Implement Cloudflare R2 or AWS S3
- Image upload with compression
- DPI calculation for print quality

### Phase 4: Rendition Pipeline

**Priority Order:**
1. DB-003: Database Schema - Renditions
2. BS-401: Rendition Request
3. BS-402: Preflight Engine
4. BS-403: Preview System

**PDF Generation:**
- Use PDFKit or Puppeteer
- Implement job queue with BullMQ
- Handle CMYK conversion, bleed, safe zones

### Phase 5: Commerce & Orders

**Priority Order:**
1. DB-004: Database Schema - Commerce
2. BS-501: Quote Flow
3. BS-502: Stripe Checkout
4. TEST-004: Checkout E2E Tests
5. BS-503: Order Detail Page
6. BS-504: Reorder Flow

**Stripe Integration:**
- Checkout sessions
- Webhook handling
- Payment intent flow

### Phase 6: Print Orchestrator

**Priority Order:**
1. BS-601: Print Orchestrator Service
2. BS-602: Provider Adapter v1 (choose Prodigi or Peecho)
3. BS-603: Webhook Ingestion
4. BS-604: Fallback Polling

**Adapter Pattern:**
```typescript
// lib/print-orchestrator/adapter.ts
export interface PrintAdapter {
  quote(request: QuoteRequest): Promise<Quote>
  createOrder(order: OrderRequest): Promise<OrderResponse>
  getOrderStatus(orderId: string): Promise<OrderStatus>
  handleWebhook(payload: any): Promise<WebhookEvent>
  preflight(assets: Asset[]): Promise<PreflightResult>
}

// lib/print-orchestrator/adapters/prodigi.ts
export class ProdigiAdapter implements PrintAdapter {
  // Implementation
}
```

## Testing Strategy

### E2E Tests (Primary)

Use Playwright for all user-facing features:

```bash
npm install -D @playwright/test
npx playwright install
```

**Test Structure:**
```
e2e/
  auth.spec.ts          # Login, signup, workspace creation
  book.spec.ts          # Book creation, editing, outline
  checkout.spec.ts      # Quote, payment, order tracking
  photo-book.spec.ts    # Photo upload, layout, preview
```

**Example:**
```typescript
test('user can create a book', async ({ page }) => {
  // Login
  await page.goto('/login')
  await page.fill('[name="email"]', 'test@example.com')
  await page.fill('[name="password"]', 'password')
  await page.click('button[type="submit"]')

  // Create book
  await page.goto('/books/new')
  await page.fill('[name="title"]', 'My First Book')
  await page.click('button:has-text("Create Book")')

  // Verify
  await expect(page).toHaveURL(/\/books\/[\w-]+/)
  await expect(page.locator('h1')).toContainText('My First Book')
})
```

### Unit Tests (Secondary)

Use Vitest for utility functions and business logic:

```bash
npm install -D vitest
```

**Test Structure:**
```
lib/
  pdf-generator/
    pdf-generator.ts
    pdf-generator.test.ts
  layout-engine/
    layout-engine.ts
    layout-engine.test.ts
```

## Print Provider API Reference

### Prodigi

**Endpoint:** `https://api.prodigi.com/v4.0/`

```typescript
// Quote
POST /quotes
{
  "merchantReference": "quote-123",
  "items": [{
    "sku": "GLOBAL-PHB-8X8-HC",
    "copies": 1
  }]
}

// Create Order
POST /orders
{
  "merchantReference": "order-123",
  "shippingMethod": "Standard",
  "recipient": { /* address */ },
  "items": [{
    "sku": "GLOBAL-PHB-8X8-HC",
    "copies": 1,
    "assets": [{
      "printArea": "default",
      "url": "https://storage.example.com/book.pdf"
    }]
  }]
}

// Webhook
{
  "event": "order.shipped",
  "orderId": "PRD-123456",
  "trackingNumber": "1Z999AA10123456784"
}
```

### Gelato

**Endpoint:** `https://order.gelatoapis.com/v4/`

PDF-based workflow (simpler API).

### Peecho

**Endpoint:** `https://api.peecho.com/v1/`

Full API with Book Creator integration.

## Code Style & Patterns

### TypeScript

- Strict mode enabled
- Explicit return types for functions
- Use interfaces for data structures
- Avoid `any`, use `unknown` if type is truly unknown

### React Components

```typescript
'use client' // Only for client components

import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface FeatureProps {
  title: string
  onAction: () => void
}

export function Feature({ title, onAction }: FeatureProps) {
  const [state, setState] = useState(false)

  return (
    <div>
      <h2>{title}</h2>
      <Button onClick={onAction}>Action</Button>
    </div>
  )
}
```

### API Routes

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    // Implementation

    return NextResponse.json({ data })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
```

### Database Queries

```typescript
// Good: Use RLS policies
const { data, error } = await supabase
  .from('books')
  .select('*')
  .eq('workspace_id', workspaceId)

// Bad: Don't bypass RLS without reason
const { data, error } = await supabase
  .from('books')
  .select('*') // Returns all books across all workspaces!
```

## Environment Setup

### Required Services

1. **Supabase Project**
   - Create project at supabase.com
   - Get URL and anon key
   - Configure auth providers

2. **Stripe Account**
   - Test mode for development
   - Set up products and prices
   - Configure webhook endpoint

3. **Redis Instance**
   - Local: `docker run -p 6379:6379 redis`
   - Cloud: Upstash, Redis Cloud

4. **Storage**
   - Supabase Storage (easiest)
   - OR Cloudflare R2 (recommended for production)
   - OR AWS S3

5. **Print Provider Accounts**
   - Start with one: Prodigi or Peecho
   - Get API keys from dashboard

### Local Development

```bash
# Install dependencies
npm install

# Start Supabase (if using local)
npx supabase start

# Start Redis (if using local)
docker run -p 6379:6379 redis

# Start dev server
npm run dev
```

## Common Tasks

### Adding a Database Migration

```bash
# Create migration
npx supabase migration new feature_name

# Write SQL in supabase/migrations/[timestamp]_feature_name.sql

# Apply migration (local)
npx supabase db reset

# Apply migration (remote)
npx supabase db push
```

### Adding a New shadcn/ui Component

```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add form
```

### Debugging Print Provider Issues

```typescript
// Enable detailed logging
const adapter = new ProdigiAdapter({
  apiKey: process.env.PRODIGI_API_KEY,
  debug: true // Logs all requests/responses
})
```

## Troubleshooting

### Database Connection Issues

```typescript
// Check Supabase connection
const { data, error } = await supabase.from('workspaces').select('count')
console.log('Connection test:', data, error)
```

### Auth Not Working

1. Check `.env.local` has correct Supabase keys
2. Verify auth providers enabled in Supabase dashboard
3. Check RLS policies allow read/write

### PDF Generation Fails

1. Check image URLs are accessible
2. Verify DPI calculations
3. Test with minimal PDF first
4. Check queue is running

### Print Provider Errors

1. Verify API keys
2. Check asset URLs are publicly accessible
3. Review print specs (DPI, bleed, size)
4. Test with provider's sandbox/test mode

## Session Checklist

Before ending a session:

- [ ] Update feature_list.json with completed features
- [ ] Log session notes in claude-progress.txt
- [ ] Commit code changes (if working with git)
- [ ] Run tests to ensure nothing broke
- [ ] Document any blockers or decisions
- [ ] Note next steps for future agents

## Questions?

- Review `feature_list.json` for feature details
- Check `claude-progress.txt` for historical context
- Consult `docs/PRD-photo-book-platform.md` for product requirements
- Look at existing code for patterns and examples

---

**Remember**: Work incrementally, respect dependencies, write tests, and keep feature_list.json updated!
