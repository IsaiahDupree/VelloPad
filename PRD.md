# VelloPad - Product Requirements Document

> **Product Name:** VelloPad  
> **Domain:** VelloPad.com  
> **Numerology:** 33 → 33 (Master Builder)  
> **Version:** 1.0  
> **Last Updated:** January 2026

---

## Product One-Liner

A modern, sleek web app where anyone can write + fully edit a book, get print-ready PDFs, and buy physical copies via print-on-demand APIs—while the platform drives completion with guided prompts, tutorials, email nudges, and SEO content.

---

## Table of Contents

1. [Vision & Goals](#1-vision--goals)
2. [Success Metrics](#2-success-metrics)
3. [User Personas](#3-user-personas)
4. [Product Surface Area](#4-product-surface-area)
5. [Print + Buy Flow (POD Infrastructure)](#5-print--buy-flow-pod-infrastructure)
6. [Admin Email Marketing](#6-admin-email-marketing)
7. [SEO/Blog Engine](#7-seoblog-engine)
8. [System Architecture](#8-system-architecture)
9. [Key Workflows](#9-key-workflows)
10. [Phased Roadmap](#10-phased-roadmap)
11. [Epic Breakdown](#11-epic-breakdown)
12. [User Stories & Acceptance Criteria](#12-user-stories--acceptance-criteria)
13. [Event Taxonomy](#13-event-taxonomy)
14. [Lifecycle Email System](#14-lifecycle-email-system)
15. [Print Provider Adapter Spec](#15-print-provider-adapter-spec)
16. [Database Schema](#16-database-schema)
17. [Brand & Design System](#17-brand--design-system)

---

## 1. Vision & Goals

### Primary Goals

1. **Make book creation feel as easy as Notion + Canva**, but output real print-ready files
2. **Convert users through:** Start → Progress → Proof Copy → Repeat Orders
3. **Build a growth loop:** tutorials + daily marketing tasks → user earns → prints more books

### Product Philosophy

- Modern, sleek UI with full editing tools
- Built-in prompt help, guides, and tutorials
- Infrastructure for users to buy their own books (POD API integration)
- Email marketing campaigns for encouragement
- SEO blog for tutorials, strategies, and daily marketing updates

---

## 2. Success Metrics

| Metric | Definition | Target (MVP) |
|--------|------------|--------------|
| **Activation** | % who create a book + write 300+ words in 24h | 40% |
| **Completion** | % who generate a print-ready PDF | 25% |
| **Revenue** | % who purchase a proof copy (first order rate) | 15% |
| **Repeat** | % who place a 2nd order within 30 days | 30% |
| **Content** | Organic signups from blog/help center | 20% of signups |

---

## 3. User Personas

### First-time Author
- Needs hand-holding, templates, prompts, motivation
- Goals: Finish their first book, see it in print
- Pain points: Gets stuck, doesn't know formatting, overwhelmed by process

### Creator/Coach
- Wants fast lead magnet books/journals and proof copies
- Goals: Quick turnaround, professional output
- Pain points: Time constraints, needs templates

### Small Publisher
- Wants consistent layout, versioning, bulk orders
- Goals: Multiple titles, team collaboration
- Pain points: Managing multiple projects, consistency

### Admin/Operator
- Wants campaigns, analytics, moderation, content ops
- Goals: Drive user engagement and revenue
- Pain points: Segmentation, automation

---

## 4. Product Surface Area

### A. Book Studio (Sleek UI, Full-Book Editing)

#### Core Screens

| Screen | Description |
|--------|-------------|
| **Dashboard** | Book cards, progress %, last edited, "next step" CTA |
| **Book Outline** | Drag/drop chapters + sections |
| **Editor - Write Mode** | Distraction-free chapter editor |
| **Editor - Layout Mode** | WYSIWYG page layout (margins, headers/footers, page numbers, styles) |
| **Assets** | Images, tables, cover art, fonts |
| **Preview** | Instant "print preview" + page thumbnails + PDF preview (PDF.js) |
| **Publish/Print** | Choose trim size, paper, binding, cover type → get quote → order |

#### Editor Tech Choice

- **Document model + rich editing:** ProseMirror/TipTap (or Lexical)
- **Layout rendering:** HTML/CSS templates → print-ready PDF via rendering service

### B. Built-in Prompt Help, Guides, Tutorials

#### Prompt Sidekick Panel (Context-Aware)

- "Rewrite this paragraph in X tone"
- "Generate chapter outline"
- "Suggest title/subtitle/back cover blurb"
- "Fix consistency (characters/voice)"

#### Inline Coach (Right Rail)

- Detects where user is stuck (empty chapter, no cover, no CTA)
- Suggests next actions

#### Interactive Tutorials

- Product tours
- "Write your first chapter in 10 minutes" checklist

#### Template Library

- **Genres:** Business, cookbook, kids book, journal, photo book
- **Interior styles:** Classic, modern, minimal
- **Cover styles:** Spine-aware

---

## 5. Print + Buy Flow (POD Infrastructure)

### A. Print Provider Abstraction

Create a **Print Orchestrator** service with clean interface:

```typescript
interface PrintOrchestrator {
  quote(bookSpec, shipTo): Promise<PricingOptions>
  validate(files, bookSpec): Promise<PreflightResult>
  createOrder(printFiles, recipient, shippingOption): Promise<OrderId>
  getOrderStatus(orderId): Promise<OrderStatus>
  webhookHandler(payload): Promise<void>
}
```

### B. Supported POD Vendors

| Provider | Strengths | Notes |
|----------|-----------|-------|
| **Peecho** | Free print API, global routing, low cost | Hardcover ~€5.20, softcover ~€4.00 |
| **Prodigi** | REST API, global network, no setup fees | Good docs, Postman collection |
| **Lulu** | Book-focused, dedicated API docs | Best for book-specific metadata |
| **Bookvault** | Publisher-centric, direct fulfillment | Good for catalog setup |

**Strategy:** Start with 1 provider, but build Orchestrator day 1 for easy addition of others.

### C. Print-Ready File Generation (Rendition Pipeline)

#### Outputs

- **Interior PDF** (print-ready)
- **Cover PDF** (front + spine + back, spine width computed from page count/paper)

#### Rendition Service (Background Worker)

- **Input:** Book document model + theme + trim size + paper + binding
- **Output:** PDFs stored in object storage + signed URLs

#### Preflight Checks

- Embedded fonts
- Image DPI warnings
- Bleed/safe margins
- Page count constraints
- Cover spine rules

---

## 6. Admin Email Marketing

### A. Event-Driven Lifecycle Messaging

Use Messaging Service (Customer.io / Braze / Klaviyo / SendGrid/Resend) triggered by product events.

#### Key Campaigns

| Campaign | Trigger | Content |
|----------|---------|---------|
| **Activation** | Signup | "Create your first chapter" + templates + 10-minute tutorial |
| **Progress Nudges** | Milestone reached | "You're 42% done—finish Chapter 3 today" |
| **Stuck Detection** | No edits in 3 days | Guided prompt + "resume where you left off" |
| **Pre-publish Checklist** | 90%+ complete | Cover, ISBN (optional), margins, preview approval |
| **First Order Push** | PDF generated | "Order a proof copy" + discount ladder |
| **Post-Delivery** | Order delivered | Review request + "how to market this week" plan |
| **Upsell** | Various | "New template drop" / "marketing pack" / "bundle discounts" |

### B. Daily Marketing Guidance System

Deliver a **Marketing Hub** inside the app + email digests:

- **Daily task:** "Post a 15s TikTok reading excerpt"
- **Weekly plan generator:** "3 posts, 1 email, 1 collab pitch"
- **Assets generator:** Captions, hooks, thumbnail copy, launch sequence
- **A/B testing suggestions:** "Try these 2 hooks"

#### The Flywheel

```
book progress → encouragement → publish → proof copy → marketing tasks → sales → more books printed
```

---

## 7. SEO/Blog Engine

### A. Architecture

**Headless CMS** (Sanity/Contentful/Strapi/MDX) feeds:

- Blog posts
- Tutorials
- Prompt libraries
- "How to market your book" playbooks

#### Programmatic SEO Pages

- "How to write a [genre] book"
- "Best trim size for [type]"
- "Hardcover vs softcover for [use case]"

**In-app help center** uses the same CMS content (single source of truth)

### B. Growth Analytics

Track which content leads to:

- Account creation
- First book created
- First PDF export
- First order

Use PostHog/GA4 + UTM tagging for attribution.

---

## 8. System Architecture

### A. High-Level Diagram

```
[Web App (Next.js)]
   |-- Auth (Supabase/Auth0)
   |-- Editor (TipTap) + Assets
   |-- Preview (PDF.js)
   |
[API Gateway / Backend]
   |-- Book Service (books/chapters/versions)
   |-- Asset Service (uploads, transforms)
   |-- Prompt/AI Service (assist, rewrite, outline)
   |-- Rendition Service (queue -> generate PDFs)
   |-- Commerce Service (cart, Stripe, invoices)
   |-- Print Orchestrator (Peecho/Prodigi/Lulu/Bookvault adapters)
   |-- Messaging Service (email, in-app, push)
   |-- CMS Delivery (blog/tutorial content)
   |
[Data + Infra]
   |-- Postgres (books, orders, events)
   |-- Object Storage (S3/R2) (images, PDFs)
   |-- Queue (Redis/BullMQ or managed queue)
   |-- Analytics (PostHog)
   |-- Observability (logs, traces, alerts)
```

### B. Core Tables

- `users`
- `workspaces` (optional for teams)
- `books` (status: draft / ready / published)
- `chapters`
- `book_versions` (snapshots)
- `assets` (images/fonts)
- `themes_templates`
- `renditions` (interior_pdf_url, cover_pdf_url, spec_hash, status)
- `orders` (stripe_payment_intent_id, provider, provider_order_id, status)
- `shipments` (tracking, ETA)
- `events` (product analytics + messaging triggers)
- `campaigns` (admin-authored messaging + automations)

---

## 9. Key Workflows

### Workflow 1: Create + Edit Book

1. User creates book → selects template + trim size
2. Editor saves changes as structured doc (blocks/marks)
3. Autosave + versioning
4. Preview renders HTML → "soft preview" instantly

### Workflow 2: Generate Print-Ready Files

1. User clicks "Generate Print PDF"
2. Backend enqueues `RenditionJob(bookId, spec)`
3. Worker renders interior + cover PDFs
4. Preflight results displayed (fix issues)
5. Store PDFs in object storage + attach to renditions

### Workflow 3: Buy a Proof Copy / Bulk Copies

1. User selects quantity + shipping address
2. `PrintOrchestrator.quote()` returns options
3. Stripe checkout
4. On payment success → `PrintOrchestrator.createOrder()`
5. Provider webhooks update order status → user sees tracking

### Workflow 4: Email Encouragement + Marketing Daily Plan

1. Events stream logs milestones (chapter completed, rendition created, order delivered)
2. Messaging engine triggers campaign steps
3. "Daily marketing plan" email pulls from:
   - User's genre + goal
   - Progress state
   - What they haven't done yet

---

## 10. Phased Roadmap

### Phase 1 (MVP)

- Book Studio (outline + editor + templates)
- Rendition pipeline (interior PDF first, cover second)
- Single POD provider via Orchestrator (start simple)
- Stripe checkout + order tracking
- Basic onboarding + 3–5 lifecycle emails
- Blog/help center (lightweight)

### Phase 2

- Multi-provider routing (cost/ETA optimization)
- Advanced layout tools (headers/footers, section styles, page rules)
- Marketing Hub + daily playbooks
- Programmatic SEO pages

### Phase 3

- Public storefronts for authors (sell to readers, not just "buy your own")
- Affiliate/referral system
- Team collaboration + commenting

---

## 11. Epic Breakdown

| Epic ID | Name | Priority |
|---------|------|----------|
| BS-EP01 | Foundation & Auth | P0 |
| BS-EP02 | Book Studio Core (outline + editor) | P0 |
| BS-EP03 | Assets, Templates, Cover | P0 |
| BS-EP04 | Rendition Pipeline (print-ready PDFs + preflight) | P0 |
| BS-EP05 | Commerce + Orders | P0 |
| BS-EP06 | Print Orchestrator (Peecho/Prodigi/Lulu/Bookvault adapters) | P0 |
| BS-EP07 | Admin Campaigns + Lifecycle Messaging | P1 |
| BS-EP08 | SEO Blog + In-app Tutorials + Marketing Hub | P1 |
| BS-EP09 | Analytics, Observability, Reliability | P1 |

---

## 12. User Stories & Acceptance Criteria

### Epic: BS-EP01 — Foundation & Auth

#### BS-101: Auth + workspace creation on signup
- **Priority:** P0
- **Points:** 5
- **Dependencies:** None
- **Acceptance Criteria:**
  - User can sign up/login
  - Default workspace is created on first login
  - User is added as workspace owner

#### BS-102: Workspace member roles (owner, admin, member)
- **Priority:** P1
- **Points:** 3
- **Dependencies:** BS-101
- **Acceptance Criteria:**
  - Owner can invite/remove members
  - Roles are stored and enforced by API
  - Member list is visible in settings

#### BS-103: Basic settings page (profile + workspace settings)
- **Priority:** P1
- **Points:** 3
- **Dependencies:** BS-101
- **Acceptance Criteria:**
  - User can update display name
  - Workspace name can be updated by owner/admin

---

### Epic: BS-EP02 — Book Studio Core

#### BS-201: Create book wizard (title, genre, trim, binding intent)
- **Priority:** P0
- **Points:** 5
- **Dependencies:** BS-101
- **Acceptance Criteria:**
  - User can create a book in <60s
  - Book has initial spec saved (trim/binding intent)
  - Book appears on dashboard

#### BS-202: Outline builder (chapters/sections drag-drop reorder)
- **Priority:** P0
- **Points:** 8
- **Dependencies:** BS-201
- **Acceptance Criteria:**
  - Create, rename, reorder chapters
  - Order persists and is reflected in editor
  - No duplicate order indexes per book

#### BS-203: Chapter editor (rich text) with autosave + word count
- **Priority:** P0
- **Points:** 13
- **Dependencies:** BS-202
- **Acceptance Criteria:**
  - Supports headings, lists, links, quotes, images, page breaks
  - Autosaves without data loss on refresh
  - Word count updates per chapter and book

#### BS-204: Book dashboard with progress percent + "next step" CTA
- **Priority:** P1
- **Points:** 5
- **Dependencies:** BS-201, BS-203
- **Acceptance Criteria:**
  - Progress percent displayed (heuristic acceptable)
  - Next step is stage-aware (write → preview → PDF → order)

#### BS-205: Version snapshots (manual + milestone auto-snapshots)
- **Priority:** P1
- **Points:** 8
- **Dependencies:** BS-203
- **Acceptance Criteria:**
  - User can create named snapshot
  - System auto-snapshots before rendition generation
  - Restore creates a new head version (non-destructive)

---

### Epic: BS-EP03 — Assets, Templates, Cover

#### BS-301: Asset library (upload images, store metadata, reuse across book)
- **Priority:** P0
- **Points:** 8
- **Dependencies:** BS-101, BS-201
- **Acceptance Criteria:**
  - Upload and select assets in editor
  - Metadata stored (size, mime, dimensions)
  - Delete asset removes from library with safety warning

#### BS-302: Print quality warnings for images (DPI estimate + safe/unsafe)
- **Priority:** P1
- **Points:** 5
- **Dependencies:** BS-301
- **Acceptance Criteria:**
  - System estimates DPI from rendered size
  - Flags low-res assets before rendition

#### BS-303: Template system (interior styles + spec defaults)
- **Priority:** P1
- **Points:** 8
- **Dependencies:** BS-201
- **Acceptance Criteria:**
  - Apply template at book creation and later
  - Template changes update preview without breaking content

#### BS-304: Cover basics (title/subtitle/author + safe zones overlay)
- **Priority:** P1
- **Points:** 8
- **Dependencies:** BS-201
- **Acceptance Criteria:**
  - Upload or generate a cover base
  - Show safe zones and bleed guides
  - Saves cover configuration to book settings

---

### Epic: BS-EP04 — Rendition Pipeline

#### BS-401: Rendition request (enqueue job for interior+cover PDFs)
- **Priority:** P0
- **Points:** 8
- **Dependencies:** BS-203, BS-205
- **Acceptance Criteria:**
  - User can request print-ready PDFs
  - Job runs async and updates status
  - Artifacts stored (interior PDF + cover PDF)

#### BS-402: Preflight engine (fonts, margins, bleed, low-res images)
- **Priority:** P0
- **Points:** 13
- **Dependencies:** BS-401, BS-302
- **Acceptance Criteria:**
  - Preflight produces structured report (errors/warnings)
  - Blocks checkout when errors exist
  - Links user to fix locations (chapter/asset/settings)

#### BS-403: Preview (fast preview + print simulation preview)
- **Priority:** P1
- **Points:** 8
- **Dependencies:** BS-203
- **Acceptance Criteria:**
  - Fast preview renders quickly for editing
  - Print simulation matches PDF pagination closely

---

### Epic: BS-EP05 — Commerce + Orders

#### BS-501: Quote flow (qty + address → price + shipping options)
- **Priority:** P0
- **Points:** 8
- **Dependencies:** BS-401, BS-402, BS-601
- **Acceptance Criteria:**
  - Returns total, shipping, tax (if available), ETA range
  - Stores quote snapshot for checkout

#### BS-502: Stripe checkout + webhook confirmation
- **Priority:** P0
- **Points:** 8
- **Dependencies:** BS-501
- **Acceptance Criteria:**
  - Checkout starts from quote
  - On webhook success: order marked paid and fulfillment triggered
  - Idempotency prevents duplicate orders

#### BS-503: Order detail page (status timeline + tracking)
- **Priority:** P0
- **Points:** 5
- **Dependencies:** BS-502, BS-602
- **Acceptance Criteria:**
  - Shows production/shipped/delivered states
  - Tracking link visible when available

#### BS-504: Reorder from a saved rendition
- **Priority:** P1
- **Points:** 3
- **Dependencies:** BS-503
- **Acceptance Criteria:**
  - User can reorder without regenerating PDFs
  - Uses latest valid print files for that rendition

---

### Epic: BS-EP06 — Print Orchestrator

#### BS-601: Print orchestrator service (canonical interface + adapter framework)
- **Priority:** P0
- **Points:** 8
- **Dependencies:** BS-401
- **Acceptance Criteria:**
  - Implements quote/createOrder/getStatus/handleWebhook
  - Provider config stored securely
  - Adapters can be swapped without changing commerce code

#### BS-602: Provider adapter v1 (choose ONE: Peecho OR Prodigi OR Lulu)
- **Priority:** P0
- **Points:** 13
- **Dependencies:** BS-601
- **Acceptance Criteria:**
  - Quote returns price + ship options
  - Create order sends interior+cover PDFs
  - Status updates mapped to canonical states

#### BS-603: Webhook ingestion (provider → order status updates)
- **Priority:** P0
- **Points:** 8
- **Dependencies:** BS-602
- **Acceptance Criteria:**
  - Validates signatures if provider supports it
  - Updates orders + triggers emails
  - Stores raw payload for audit (redacted)

#### BS-604: Fallback polling for providers without reliable webhooks
- **Priority:** P1
- **Points:** 5
- **Dependencies:** BS-602
- **Acceptance Criteria:**
  - Scheduled job polls open orders
  - Stops polling when delivered/failed

---

### Epic: BS-EP07 — Admin Campaigns + Lifecycle Messaging

#### BS-701: Event collection pipeline (product events stored + forwarded to analytics)
- **Priority:** P0
- **Points:** 5
- **Dependencies:** BS-101
- **Acceptance Criteria:**
  - Events captured with user/book context
  - Supports UTMs
  - Queryable for segmentation

#### BS-702: Lifecycle email automations (activation, stalled, proof push, post-delivery)
- **Priority:** P0
- **Points:** 8
- **Dependencies:** BS-701, BS-503
- **Acceptance Criteria:**
  - Sends based on event triggers + time delays
  - Has opt-out handling
  - Tracks send/open/click

#### BS-703: Admin broadcast tool (segment → send campaign)
- **Priority:** P1
- **Points:** 8
- **Dependencies:** BS-701
- **Acceptance Criteria:**
  - Segment filters (progress, last_edit, rendition, order status)
  - Preview audience count
  - Campaign performance dashboard

---

### Epic: BS-EP08 — SEO Blog + Marketing Hub

#### BS-801: Headless CMS integration for blog + tutorials
- **Priority:** P1
- **Points:** 8
- **Dependencies:** None
- **Acceptance Criteria:**
  - Public blog pages render from CMS
  - In-app tutorial pages reuse same content source

#### BS-802: Marketing Hub (daily tasks + weekly plan generator)
- **Priority:** P1
- **Points:** 13
- **Dependencies:** BS-701, BS-702
- **Acceptance Criteria:**
  - Stage-aware tasks (drafting vs launch)
  - Tasks can be marked done
  - Email digest links back to tasks

---

### Epic: BS-EP09 — Analytics & Reliability

#### BS-901: Job observability (render job logs, retries, alerting)
- **Priority:** P0
- **Points:** 5
- **Dependencies:** BS-401
- **Acceptance Criteria:**
  - Failed jobs are retried with backoff
  - Admins can view failure reason + logs
  - Alerts fire on repeated failures

#### BS-902: Commerce + provider audit logs (PII redaction)
- **Priority:** P1
- **Points:** 3
- **Dependencies:** BS-502, BS-602
- **Acceptance Criteria:**
  - Raw provider payloads stored with sensitive fields redacted
  - Access limited to admins

---

## 13. Event Taxonomy

### Event Naming Convention

`domain.action` (lowercase, dot-separated)

### Required Shared Event Properties

| Property | Description |
|----------|-------------|
| `user_id` | User identifier |
| `book_id` | Book identifier (if applicable) |
| `workspace_id` | Workspace identifier (optional) |
| `source` | web, email, blog, referral |
| `utm_*` | UTM parameters when present |
| `timestamp` | Event timestamp |
| `session_id` | Session identifier |
| `book_stage` | idea / drafting / editing / ready_to_print / ordered / delivered |
| `progress_pct` | 0–100 |

### Core Funnel Events

#### Acquisition
- `auth.signup_started`
- `auth.signup_completed`
- `marketing.blog_viewed`
- `marketing.tutorial_viewed`

#### Activation
- `book.created`
- `book.template_selected`
- `editor.first_words_written` (>= 100 words)
- `editor.session_completed` (>= X minutes editing)

#### Engagement / Completion
- `book.chapter_created`
- `book.chapter_completed`
- `book.outline_updated`
- `asset.uploaded`
- `cover.created_or_uploaded`
- `preview.opened`
- `rendition.requested`
- `rendition.completed`
- `rendition.preflight_failed`
- `rendition.preflight_passed`

#### Monetization
- `quote.requested`
- `quote.returned`
- `checkout.started`
- `checkout.completed`
- `order.created`
- `order.in_production`
- `order.shipped`
- `order.delivered`
- `order.reorder_created`

#### Retention
- `editor.returned_after_nudge`
- `marketing_plan.viewed`
- `marketing_task.completed`

---

## 14. Lifecycle Email System

### 1) Welcome + Activation (Day 0–2)

| Trigger | Condition | Action |
|---------|-----------|--------|
| `auth.signup_completed` | No `book.created` in 6h | Send "pick a template" email |
| `book.created` | No `editor.first_words_written` in 24h | Send "write first 10 minutes" + prompt pack |

### 2) Progress Nudges (Ongoing)

| Trigger | Segment | Action |
|---------|---------|--------|
| No `editor.session_completed` for 72h | 0–20% progress | Outline + Chapter 1 prompt |
| No `editor.session_completed` for 72h | 20–60% progress | Finish-the-next-chapter plan |
| No `editor.session_completed` for 72h | 60–90% progress | Polish + cover + preflight checklist |
| No `editor.session_completed` for 72h | 90–100% progress | "Generate print PDF" CTA |

### 3) Proof Copy Push

| Trigger | Condition | Action |
|---------|-----------|--------|
| `rendition.preflight_passed` | No `checkout.completed` in 48h | "Order a proof copy (recommended)" + benefits + quick reorder promise |

### 4) Order Status Updates

Triggered from provider webhooks:
- `order.in_production`
- `order.shipped`
- `order.delivered`

### 5) Marketing Flywheel

| Trigger | Day | Content |
|---------|-----|---------|
| `order.delivered` | Day 1 | "Launch checklist" |
| `order.delivered` | Day 3 | "3 short-form video prompts" |
| `order.delivered` | Day 7 | "Email launch sequence template" |
| `order.delivered` | Day 14 | "Bundle + upsell strategy" → "print more copies / new book idea" |

---

## 15. Print Provider Adapter Spec

### Why an Adapter Layer?

So your app talks to one internal API, and you can switch or multi-route providers later without rewriting checkout, order tracking, or support tooling.

### A) Common Internal Data Models (Canonical)

#### BookSpec
```typescript
interface BookSpec {
  trim_size: string        // e.g., "6x9"
  binding: "hardcover" | "softcover"
  paper_type: string       // white/cream, weight
  color_mode: "bw" | "color"
  finish: "matte" | "gloss"
  page_count: number
  has_bleed: boolean
}
```

#### PrintFiles
```typescript
interface PrintFiles {
  interior_pdf_url: string  // signed URL
  cover_pdf_url: string     // signed URL
  checksum: string          // sha256
}
```

#### ShippingAddress
```typescript
interface ShippingAddress {
  name: string
  line1: string
  line2?: string
  city: string
  region?: string
  postal: string
  country: string
  phone?: string
  email?: string
}
```

#### Quote
```typescript
interface Quote {
  total: number
  currency: string
  shipping_cost: number
  tax: number
  eta_min: number
  eta_max: number
  service_level: string
  provider: ProviderName
  provider_quote_id?: string
}
```

#### Order
```typescript
interface Order {
  order_id: string              // your system
  provider: ProviderName
  provider_order_id: string
  status: "created" | "paid" | "production" | "shipped" | "delivered" | "failed" | "canceled"
  tracking?: {
    carrier: string
    tracking_number: string
    tracking_url: string
  }
}
```

### B) Orchestrator Interface

```
GET  /print/providers/capabilities
POST /print/quote
POST /print/validate (optional preflight with provider rules)
POST /print/order
GET  /print/order/:id
POST /print/webhook/:provider
```

#### Rules

- Idempotency required on quote and order (idempotency key)
- Strict status mapping to canonical statuses
- Full request/response logging (redact PII)

### C) Provider Adapter Interface

```typescript
interface PrintAdapter {
  provider: ProviderName
  
  authenticate(): Promise<void>
  mapSpecToProvider(spec: BookSpec): ProviderSpec
  getQuote(spec: BookSpec, address: ShippingAddress, qty: number): Promise<Quote>
  createOrder(files: PrintFiles, spec: BookSpec, address: ShippingAddress, qty: number, shipping: string): Promise<string>
  getOrderStatus(providerOrderId: string): Promise<CanonicalStatus>
  handleWebhook(payload: unknown): Promise<CanonicalEvent>
}
```

### D) Routing Strategy

#### MVP Routing
- Pick a default provider per region (e.g., US/UK/EU) + fallback

#### Phase 2 Routing
- Cost/ETA optimizer:
  - Call `quote()` across providers in parallel
  - Choose lowest cost that meets ETA constraint
  - Store quote comparisons for analytics

### E) Webhooks + Status Normalization

Canonical events emitted internally:
- `order.in_production`
- `order.shipped`
- `order.delivered`
- `order.failed`

### F) Failure Modes + Support Tooling

| Failure | Resolution |
|---------|------------|
| PDF link expired | Refresh signed URL automatically |
| Provider timeout | Retry with exponential backoff + idempotency key |
| Preflight fail | Show user fix list and block checkout |
| Address validation errors | Inline fixes at checkout |
| Partial shipment updates | Keep polling fallback if webhook not received |

---

## 16. Database Schema

### Segment 1: Extensions, Enums, Workspaces

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
CREATE TYPE workspace_role AS ENUM ('owner', 'admin', 'member');
CREATE TYPE book_status AS ENUM ('draft', 'ready_to_print', 'published', 'archived');
CREATE TYPE rendition_status AS ENUM ('queued', 'running', 'succeeded', 'failed');
CREATE TYPE order_status AS ENUM ('created', 'paid', 'in_production', 'shipped', 'delivered', 'failed', 'canceled');

-- Workspaces
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE workspace_members (
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role workspace_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);

CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);
```

### Segment 2: Books, Chapters, Versions

```sql
CREATE TABLE books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  genre TEXT,
  status book_status NOT NULL DEFAULT 'draft',
  stage TEXT NOT NULL DEFAULT 'idea',
  progress_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  spec JSONB NOT NULL DEFAULT '{}'::jsonb,
  current_version_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_books_workspace ON books(workspace_id);
CREATE INDEX idx_books_author ON books(author_user_id);

CREATE TABLE book_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  version_num INT NOT NULL,
  label TEXT,
  snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (book_id, version_num)
);

CREATE TABLE chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  order_index INT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  word_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (book_id, order_index)
);

CREATE INDEX idx_chapters_book ON chapters(book_id);
```

### Segment 3: Assets, Templates

```sql
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  book_id UUID REFERENCES books(id) ON DELETE SET NULL,
  filename TEXT NOT NULL,
  mime TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  width INT,
  height INT,
  storage_bucket TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_assets_workspace ON assets(workspace_id);
CREATE INDEX idx_assets_book ON assets(book_id);

CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  spec JSONB NOT NULL DEFAULT '{}'::jsonb,
  styles JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Segment 4: Renditions, Render Jobs

```sql
CREATE TABLE renditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  version_id UUID REFERENCES book_versions(id) ON DELETE SET NULL,
  spec_hash TEXT NOT NULL,
  status rendition_status NOT NULL DEFAULT 'queued',
  interior_pdf_url TEXT,
  cover_pdf_url TEXT,
  preflight_report JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_renditions_book ON renditions(book_id);
CREATE INDEX idx_renditions_status ON renditions(status);

CREATE TABLE render_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rendition_id UUID NOT NULL REFERENCES renditions(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued',
  attempts INT NOT NULL DEFAULT 0,
  last_error TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  log_bucket TEXT,
  log_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_render_jobs_rendition ON render_jobs(rendition_id);
```

### Segment 5: Providers, Quotes, Orders, Shipments

```sql
CREATE TABLE print_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  environment TEXT NOT NULL DEFAULT 'prod',
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (name, environment)
);

CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  rendition_id UUID NOT NULL REFERENCES renditions(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES print_providers(id) ON DELETE RESTRICT,
  qty INT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  subtotal NUMERIC(12,2) NOT NULL,
  shipping NUMERIC(12,2) NOT NULL,
  tax NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL,
  eta_min_days INT,
  eta_max_days INT,
  service_level TEXT,
  provider_quote_id TEXT,
  raw_response JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_quotes_book ON quotes(book_id);

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  rendition_id UUID NOT NULL REFERENCES renditions(id) ON DELETE RESTRICT,
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  status order_status NOT NULL DEFAULT 'created',
  currency TEXT NOT NULL DEFAULT 'USD',
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  shipping NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_workspace ON orders(workspace_id);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);

CREATE TABLE order_shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  ship_to JSONB NOT NULL,
  carrier TEXT,
  tracking_number TEXT,
  tracking_url TEXT,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shipments_order ON order_shipments(order_id);

CREATE TABLE provider_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES print_providers(id) ON DELETE RESTRICT,
  provider_order_id TEXT,
  status TEXT,
  raw_request_redacted JSONB NOT NULL DEFAULT '{}'::jsonb,
  raw_response_redacted JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider_id, provider_order_id)
);
```

### Segment 6: Events, Campaigns, Content, Marketing Tasks

```sql
CREATE TABLE events (
  id BIGSERIAL PRIMARY KEY,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  props JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX idx_events_name_time ON events(event_name, occurred_at DESC);
CREATE INDEX idx_events_user_time ON events(user_id, occurred_at DESC);
CREATE INDEX idx_events_book_time ON events(book_id, occurred_at DESC);

CREATE TABLE email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  definition JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE email_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  provider_message_id TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, user_id, created_at)
);

CREATE INDEX idx_email_sends_campaign ON email_sends(campaign_id);
CREATE INDEX idx_email_sends_user ON email_sends(user_id);

CREATE TABLE content_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  body_md TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  tags TEXT[] NOT NULL DEFAULT '{}',
  seo JSONB NOT NULL DEFAULT '{}'::jsonb,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE marketing_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  task_date DATE NOT NULL,
  task_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'todo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, task_date, task_type)
);

CREATE INDEX idx_marketing_tasks_user_date ON marketing_tasks(user_id, task_date DESC);
```

---

## 17. Brand & Design System

### Numerology Alignment

- **Name:** VelloPad
- **Number:** 33 → 33 (Master Builder)
- **Energy:** Premium creator platform, teaching/guiding, building real physical books

### Color Palette (33/6 Aligned — "Master Teacher")

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| **Primary (Wisdom)** | Indigo `#2F2B4A` | Lavender `#9B8CDC` | Primary actions, brand |
| **Secondary (Growth)** | Sage `#4B6B4D` | Sage `#4B6B4D` | Secondary actions |
| **Accent (Clarity)** | Soft Gold `#D6B25E` | Soft Gold `#D6B25E` | CTAs, highlights |
| **Background (Paper)** | Cream `#F6F1E7` | Deep Night `#0B1220` | Page background |
| **Surface** | Light Cream `#F8F5EC` | Charcoal `#111827` | Cards, modals |
| **Text (Ink)** | Charcoal `#111827` | Cream `#F6F1E7` | Body text |
| **Muted** | Silver `#C7CBD6` | Dark Gray `#374151` | Secondary text, borders |

### CSS Variables (shadcn/ui Compatible)

```css
:root {
  /* surfaces */
  --background: 40 45% 94%;
  --foreground: 221 39% 11%;
  --card: 40 45% 96%;
  --card-foreground: 221 39% 11%;
  --popover: 40 45% 96%;
  --popover-foreground: 221 39% 11%;

  /* brand */
  --primary: 248 26% 23%;
  --primary-foreground: 40 45% 94%;
  --secondary: 124 18% 36%;
  --secondary-foreground: 40 45% 94%;
  --muted: 224 15% 92%;
  --muted-foreground: 221 18% 32%;
  --accent: 42 59% 60%;
  --accent-foreground: 221 39% 11%;
  --destructive: 0 84% 60%;
  --destructive-foreground: 0 0% 100%;

  --border: 224 15% 86%;
  --input: 224 15% 86%;
  --ring: 42 59% 60%;
  --radius: 1rem;
}

.dark {
  --background: 220 49% 8%;
  --foreground: 40 45% 94%;
  --card: 221 39% 11%;
  --card-foreground: 40 45% 94%;
  --popover: 221 39% 11%;
  --popover-foreground: 40 45% 94%;
  --primary: 251 53% 71%;
  --primary-foreground: 248 26% 23%;
  --secondary: 124 18% 36%;
  --secondary-foreground: 40 45% 94%;
  --muted: 224 15% 18%;
  --muted-foreground: 224 12% 70%;
  --accent: 42 59% 60%;
  --accent-foreground: 220 49% 8%;
  --destructive: 0 62% 40%;
  --destructive-foreground: 0 0% 100%;
  --border: 224 15% 20%;
  --input: 224 15% 20%;
  --ring: 42 59% 60%;
}
```

### UI Vibe

- Apple-clean, editorial, "bookish" without being old-school
- Modern creator tool (Notion-meets-Canva energy)
- Supportive, uplifting, "you can finish this book"

---

## Appendix: Technology Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js (App Router), React, TypeScript |
| **UI Components** | shadcn/ui, Tailwind CSS, Lucide Icons |
| **Editor** | TipTap (ProseMirror-based) |
| **Auth** | Supabase Auth |
| **Database** | Supabase (Postgres) |
| **Object Storage** | Supabase Storage / S3 / R2 |
| **Queue** | BullMQ + Redis (or Upstash) |
| **Payments** | Stripe |
| **Email** | Resend / SendGrid |
| **Analytics** | PostHog |
| **CMS** | Sanity / Contentful / MDX |
| **PDF Rendering** | Puppeteer / Prince / WeasyPrint |
| **POD Providers** | Peecho, Prodigi, Lulu, Bookvault |

---

*Document generated for VelloPad.com — Master Builder (33) Energy*
