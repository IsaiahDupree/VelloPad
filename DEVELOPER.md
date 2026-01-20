# VelloPad Developer Documentation

> **Handoff Guide** — Everything you need to continue development on VelloPad.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Quick Start](#quick-start)
3. [Architecture](#architecture)
4. [Folder Structure](#folder-structure)
5. [Tech Stack](#tech-stack)
6. [Development Workflow](#development-workflow)
7. [Key Modules](#key-modules)
8. [API Routes](#api-routes)
9. [Database Schema](#database-schema)
10. [Infrastructure](#infrastructure)
11. [Testing Strategy](#testing-strategy)
12. [Deployment](#deployment)
13. [Environment Variables](#environment-variables)
14. [Common Tasks](#common-tasks)
15. [Troubleshooting](#troubleshooting)

---

## Project Overview

**VelloPad** is a book creation and print-on-demand platform that allows users to:
- Write and edit books with a rich text editor
- Run preflight checks for print readiness
- Order physical copies through multiple POD providers (Peecho, Lulu, Prodigi, Bookvault)
- Access marketing tools and launch guidance
- Track orders and shipping

**Key Differentiator:** AI-assisted writing with prompt sidekick, multi-provider POD routing with automatic fallback, and integrated marketing hub.

### Business Model
- **Free tier:** Up to 3 books, basic features
- **Pro tier ($9/mo):** Unlimited books, AI tools, priority support
- **Revenue share:** Margin on print orders

---

## Quick Start

### Prerequisites
- Node.js 18+ (recommend 20 LTS)
- npm or pnpm
- Git
- Supabase account (for database + auth)
- Stripe account (for payments)

### Setup

```bash
# Clone and install
git clone <repo-url>
cd VelloPad
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your API keys

# Start development server
npm run dev
```

The app runs at `http://localhost:3000` (or next available port).

### First-Time Setup Checklist

1. [ ] Create Supabase project and run migrations (see [Database Schema](#database-schema))
2. [ ] Set up Stripe products/prices
3. [ ] Configure at least one POD provider API key
4. [ ] Set up Resend or SendGrid for transactional emails
5. [ ] (Optional) Configure PostHog for analytics

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Next.js)                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │ App Shell│  │  Editor  │  │ Marketing│  │  Order Tracking  │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘ │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     API LAYER (Next.js App Router)              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │  Auth    │  │  Books   │  │  Orders  │  │    Webhooks      │ │
│  │ (Supabase│  │   CRUD   │  │  + Print │  │ (Stripe, POD)    │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘ │
└───────────────────────────┬─────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────────────────┐
│   Supabase   │   │    Stripe    │   │    Print Orchestrator    │
│  - Postgres  │   │  - Payments  │   │  - Peecho  - Lulu        │
│  - Auth      │   │  - Subscript.│   │  - Prodigi - Bookvault   │
│  - Storage   │   │  - Webhooks  │   └──────────────────────────┘
└──────────────┘   └──────────────┘
                            │
                            ▼
                   ┌──────────────┐
                   │  Job Queue   │
                   │  (BullMQ)    │
                   │  - PDF Render│
                   │  - Emails    │
                   └──────────────┘
```

### Request Flow (Print Order Example)

1. User clicks "Order Proof Copy" in book editor
2. Frontend calls `/api/orders/create`
3. API validates book, runs preflight checks
4. Print Orchestrator gets quotes from available providers
5. Stripe Checkout session created
6. User completes payment
7. Stripe webhook triggers order submission to POD provider
8. Background job polls for status updates
9. User receives email notifications at each stage

---

## Folder Structure

```
VelloPad/
├── app/                      # Next.js App Router
│   ├── (app)/               # Authenticated app routes (dashboard layout)
│   │   ├── dashboard/       # Main dashboard
│   │   ├── books/           # Book list and editor
│   │   │   └── [bookId]/    # Individual book page
│   │   ├── orders/          # Order tracking
│   │   ├── marketing/       # Marketing hub
│   │   └── settings/        # User settings
│   ├── api/                 # API routes
│   │   └── webhooks/        # External webhooks (Stripe, POD)
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Landing page
│   └── globals.css          # Global styles + Tailwind
│
├── components/              # React components
│   ├── ui/                  # shadcn/ui primitives
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   └── ...
│   ├── app-shell.tsx        # Main app layout
│   ├── sidebar-nav.tsx      # Navigation sidebar
│   ├── topbar.tsx           # Top header
│   └── theme-provider.tsx   # Dark/light mode
│
├── lib/                     # Core utilities and services
│   ├── supabase/            # Supabase client setup
│   │   ├── client.ts        # Browser client
│   │   ├── server.ts        # Server client
│   │   └── middleware.ts    # Auth middleware
│   ├── stripe.ts            # Stripe utilities
│   ├── queue/               # Job queue (BullMQ stubs)
│   │   └── index.ts
│   ├── print-orchestrator/  # POD provider integration
│   │   ├── types.ts         # Canonical data models
│   │   ├── adapter.ts       # Provider adapter interface
│   │   ├── index.ts         # Orchestrator logic
│   │   └── adapters/        # Provider implementations
│   │       ├── peecho.ts
│   │       └── lulu.ts
│   └── utils.ts             # General utilities (cn, etc.)
│
├── middleware.ts            # Next.js middleware (auth)
├── tailwind.config.ts       # Tailwind + theme config
├── tsconfig.json
├── package.json
├── PRD.md                   # Product Requirements Document
├── DEVELOPER.md             # This file
└── .env.example             # Environment template
```

---

## Tech Stack

| Category | Technology | Purpose |
|----------|------------|---------|
| **Framework** | Next.js 16 (App Router) | React SSR/SSG, API routes |
| **Language** | TypeScript | Type safety |
| **Styling** | Tailwind CSS + shadcn/ui | Utility-first CSS, components |
| **Database** | Supabase (Postgres) | Data persistence, RLS |
| **Auth** | Supabase Auth | User authentication |
| **Storage** | Supabase Storage | PDF, asset storage |
| **Payments** | Stripe | Subscriptions, checkout |
| **Queue** | BullMQ + Redis | Background jobs |
| **Email** | Resend / SendGrid | Transactional emails |
| **Analytics** | PostHog | Product analytics |
| **POD** | Peecho, Lulu, Prodigi, Bookvault | Print fulfillment |

---

## Development Workflow

### Branch Strategy

```
main           # Production-ready code
  └── develop  # Integration branch
       ├── feature/book-editor-v2
       ├── feature/print-provider-prodigi
       └── fix/order-status-webhook
```

### Commit Convention

```
feat: add chapter reordering
fix: correct PDF bleed calculation
docs: update API documentation
refactor: extract print adapter base class
chore: upgrade dependencies
```

### Code Style

- **ESLint** + **Prettier** for formatting
- Run `npm run lint` before committing
- Components use PascalCase, utilities use camelCase
- API routes return consistent JSON: `{ data, error, message }`

### Testing

```bash
npm run test        # Run unit tests
npm run test:e2e    # Run Playwright E2E tests (not yet implemented)
```

---

## Key Modules

### 1. Book Editor (`app/(app)/books/[bookId]/`)

The editor is a tabbed interface with:
- **Write tab** — Chapter sidebar + text area + AI sidekick
- **Preview tab** — Rendered PDF preview
- **Publish tab** — Preflight checklist + print settings

**Current Status:** Stub implementation with static data. Needs:
- [ ] Rich text editor integration (recommend Tiptap or Lexical)
- [ ] Real-time autosave to Supabase
- [ ] PDF preview generation
- [ ] AI prompt integration

### 2. Print Orchestrator (`lib/print-orchestrator/`)

Multi-provider routing system:

```typescript
// Get quotes from all providers
const quotes = await orchestrator.getAllQuotes(request);

// Get best quote by cost or speed
const bestQuote = await orchestrator.getBestQuote(request, "cost");

// Submit order with automatic fallback
const result = await orchestrator.submitOrder(order);
```

**Adapter Interface:**
```typescript
interface PrintProviderAdapter {
  providerId: string;
  providerName: string;
  supportsSpec(spec: BookSpec): boolean;
  getQuote(request: QuoteRequest): Promise<Quote>;
  preflight(spec: BookSpec): Promise<PreflightResult>;
  submitOrder(order: PrintOrder): Promise<{ externalId: string; status: string }>;
  getOrderStatus(externalId: string): Promise<{ status: string; trackingInfo?: TrackingInfo }>;
  cancelOrder(externalId: string): Promise<{ success: boolean; message?: string }>;
  handleWebhook(payload: unknown): Promise<{ orderId: string; status: string }>;
}
```

**Current Status:** Stub implementations. To complete:
- [ ] Implement actual API calls for each provider
- [ ] Add authentication handling
- [ ] Implement webhook handlers
- [ ] Add retry logic and error handling

### 3. Queue System (`lib/queue/`)

Background job processing for:
- PDF rendering
- Print order submission
- Email sending
- Webhook retries

**Current Status:** Stub. Production implementation needs:
- [ ] Redis connection
- [ ] BullMQ setup
- [ ] Worker processes
- [ ] Dead letter queue handling

### 4. Supabase Integration (`lib/supabase/`)

Three client types:
- **Browser client** — For client components
- **Server client** — For server components and API routes
- **Middleware client** — For auth middleware

---

## API Routes

### Planned Routes (To Implement)

| Route | Method | Description |
|-------|--------|-------------|
| `/api/books` | GET | List user's books |
| `/api/books` | POST | Create new book |
| `/api/books/[id]` | GET | Get book details |
| `/api/books/[id]` | PATCH | Update book |
| `/api/books/[id]` | DELETE | Delete book |
| `/api/books/[id]/chapters` | GET/POST | Chapter CRUD |
| `/api/books/[id]/preflight` | POST | Run preflight checks |
| `/api/books/[id]/render` | POST | Generate PDF |
| `/api/orders` | GET | List user's orders |
| `/api/orders` | POST | Create order (starts Stripe flow) |
| `/api/orders/[id]` | GET | Order details + tracking |
| `/api/quotes` | POST | Get print quotes |
| `/api/webhooks/stripe` | POST | Stripe webhook (implemented) |
| `/api/webhooks/[provider]` | POST | POD provider webhooks |

---

## Database Schema

Full schema is in `PRD.md`. Key tables:

```sql
-- Users (managed by Supabase Auth, extended with profile)
users (id, email, full_name, avatar_url, stripe_customer_id, plan, ...)

-- Workspaces for multi-user collaboration
workspaces (id, name, owner_id, plan, ...)
workspace_members (workspace_id, user_id, role, ...)

-- Books and content
books (id, workspace_id, title, slug, stage, cover_url, trim_size, ...)
chapters (id, book_id, title, position, content_json, word_count, ...)
versions (id, book_id, version_number, interior_pdf_url, cover_pdf_url, ...)

-- Assets (images, fonts)
assets (id, book_id, name, file_url, type, ...)

-- Orders and fulfillment
orders (id, user_id, book_id, provider_id, status, ...)
shipments (id, order_id, carrier, tracking_number, ...)

-- Analytics events
events (id, user_id, event_name, properties, ...)
```

### Running Migrations

```bash
# Using Supabase CLI
supabase db push

# Or apply migrations manually in Supabase dashboard
```

---

## Infrastructure

### Production Stack

```
┌─────────────────┐      ┌─────────────────┐
│     Vercel      │      │    Supabase     │
│  (Next.js app)  │◄────►│  (DB + Auth)    │
└────────┬────────┘      └─────────────────┘
         │
         ▼
┌─────────────────┐      ┌─────────────────┐
│     Stripe      │      │   Redis Cloud   │
│   (Payments)    │      │   (Job Queue)   │
└─────────────────┘      └─────────────────┘
```

### Redis Setup (for BullMQ)

Options:
- **Upstash** — Serverless Redis, free tier available
- **Redis Cloud** — Managed Redis
- **Railway/Render** — Redis add-on

---

## Environment Variables

See `.env.example` for full list. Critical variables:

```bash
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe (required for payments)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# POD Providers (at least one required)
PEECHO_API_KEY=
LULU_API_KEY=

# Email (required for notifications)
RESEND_API_KEY=

# Queue (required for production)
REDIS_URL=
```

---

## Common Tasks

### Adding a New UI Component

```bash
# Using shadcn/ui CLI
npx shadcn@latest add [component-name]

# Example
npx shadcn@latest add toast
```

### Adding a New POD Provider

1. Create adapter in `lib/print-orchestrator/adapters/[provider].ts`
2. Implement `PrintProviderAdapter` interface
3. Register in orchestrator config
4. Add webhook handler in `app/api/webhooks/[provider]/route.ts`
5. Add environment variables

### Adding a New API Route

```typescript
// app/api/[resource]/route.ts
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Your logic here
  return NextResponse.json({ data: result });
}
```

### Running Background Jobs (Production)

```typescript
// Enqueue a job
await pdfRenderQueue.add("render-book", {
  bookId: "bk_123",
  userId: "usr_456",
  version: 1,
  outputFormat: "print",
});

// Worker process (separate service)
pdfRenderQueue.process(async (job) => {
  const { bookId, version } = job.data;
  // Render PDF logic
});
```

---

## Troubleshooting

### Common Issues

**"Cannot find module '@supabase/ssr'"**
```bash
npm install @supabase/ssr
```

**Port already in use**
```bash
# Find process using port
lsof -i :3000
# Kill it or use different port
npm run dev -- -p 3001
```

**Stripe webhook not receiving events locally**
```bash
# Use Stripe CLI for local testing
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

**Supabase RLS blocking queries**
- Check RLS policies in Supabase dashboard
- Ensure user is authenticated
- Verify JWT token is being passed

### Debug Mode

```typescript
// Enable verbose logging
const DEBUG = process.env.NODE_ENV === "development";

if (DEBUG) {
  console.log("[Module] Action:", data);
}
```

---

## Next Steps / Roadmap

### Phase 1: Core MVP (Current)
- [x] Project scaffold
- [x] UI components
- [x] Dashboard pages
- [x] Infrastructure stubs
- [ ] Supabase schema + RLS policies
- [ ] Auth flow (sign up, login, password reset)
- [ ] Book CRUD operations
- [ ] Rich text editor integration

### Phase 2: Print Pipeline
- [ ] PDF rendering service
- [ ] Preflight validation
- [ ] Complete POD provider integrations
- [ ] Order management

### Phase 3: Monetization
- [ ] Stripe subscription flow
- [ ] Usage-based billing
- [ ] Pro feature gating

### Phase 4: Growth
- [ ] AI writing assistant
- [ ] Marketing automation
- [ ] Team/collaboration features
- [ ] Public book pages

---

## Contact & Resources

- **PRD:** `PRD.md` — Full product requirements
- **Design System:** shadcn/ui — https://ui.shadcn.com
- **Supabase Docs:** https://supabase.com/docs
- **Next.js Docs:** https://nextjs.org/docs
- **Stripe Docs:** https://stripe.com/docs

---

*Last updated: January 2026*
