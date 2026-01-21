# VelloPad

A comprehensive book creation platform supporting traditional authoring, photo books, and multi-tenant branded storefronts with print-on-demand fulfillment.

## Overview

VelloPad combines three powerful capabilities:

1. **Book Studio**: Full-featured book authoring with rich text editing, templates, and professional layout tools
2. **Photo Book Platform**: AI-powered photo book creation with automated layouts and print fulfillment
3. **Multi-Tenant Architecture**: White-label solution with branded subdomains for different niches (faith, fitness, education, etc.)

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Supabase account (for database and auth)
- Stripe account (for payments)
- Cloudflare R2 or AWS S3 (for file storage)
- Print provider accounts: Prodigi, Gelato, Peecho, or Lulu

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd VelloPad

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Configure your environment variables
# Edit .env.local with your API keys and configuration

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

### Environment Variables

See `.env.example` for all required environment variables. Key configurations:

- **Supabase**: Database, authentication, and storage
- **Stripe**: Payment processing and webhooks
- **Storage**: Cloudflare R2 or AWS S3 credentials
- **Print Providers**: API keys for Prodigi, Gelato, Peecho, Lulu
- **Email**: Service for lifecycle and marketing emails

## Project Structure

```
VelloPad/
├── app/                      # Next.js App Router
│   ├── (app)/               # Authenticated app routes
│   │   ├── dashboard/       # Main dashboard
│   │   ├── books/           # Book management
│   │   ├── orders/          # Order tracking
│   │   ├── settings/        # User settings
│   │   └── marketing/       # Marketing hub
│   ├── api/                 # API routes
│   │   └── webhooks/        # Webhook handlers (Stripe, print providers)
│   └── page.tsx             # Homepage
├── components/              # React components
│   ├── ui/                  # shadcn/ui components
│   ├── editor/              # Rich text editor
│   ├── outline/             # Outline builder
│   └── preview/             # Book preview
├── lib/                     # Utility libraries
│   ├── supabase/            # Supabase client config
│   ├── stripe.ts            # Stripe integration
│   ├── print-orchestrator/  # Print provider abstraction
│   │   ├── adapter.ts       # Base adapter interface
│   │   └── adapters/        # Provider implementations
│   ├── queue/               # Job queue system
│   └── utils.ts             # Utility functions
├── docs/                    # Documentation
│   └── PRD-photo-book-platform.md
├── tests/                   # Test files
├── feature_list.json        # Feature tracking (114 features)
├── claude-progress.txt      # Development session log
└── middleware.ts            # Next.js middleware (tenant resolution)
```

## Development

### Available Scripts

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run start      # Start production server
npm run lint       # Run ESLint
```

### Feature Development Workflow

1. **Check feature_list.json**: Find the next feature to implement (ordered by dependencies)
2. **Review dependencies**: Ensure all dependent features are completed (`passes: true`)
3. **Implement the feature**: Write code following existing patterns
4. **Write tests**: E2E tests using Playwright or unit tests as appropriate
5. **Update feature_list.json**: Mark feature as `passes: true` when tests pass
6. **Log progress**: Update claude-progress.txt with session notes

### Database Migrations

```bash
# Migrations are in supabase/migrations/
# Apply migrations through Supabase CLI or dashboard
```

### Testing

E2E tests will be configured with Playwright (see feature TEST-001).

```bash
npm run test:e2e   # Run E2E tests (once configured)
```

## Features

VelloPad includes 114 features across 14 development phases. See `feature_list.json` for the complete list.

### Phase 1: Foundation & Auth (P0)
- User authentication with Supabase
- Workspace creation and management
- Role-based access control (owner, admin, member)
- Settings pages

### Phase 2: Book Studio Core (P0)
- Create book wizard
- Chapter outline builder with drag-drop
- Rich text editor (TipTap-based)
- Version snapshots and restore
- Book dashboard with progress tracking

### Phase 3: Assets & Templates (P0-P1)
- Asset library for images
- Print quality warnings
- Interior template system
- Cover design with safe zones

### Phase 4: Rendition Pipeline (P0)
- PDF generation queue
- Preflight checks (fonts, margins, bleed, DPI)
- Preview system (fast + print simulation)

### Phase 5: Commerce & Orders (P0)
- Quote generation
- Stripe checkout integration
- Order tracking with status timeline
- Reorder flow

### Phase 6: Print Orchestrator (P0)
- Print provider abstraction layer
- Adapters for Prodigi, Gelato, Peecho, Lulu
- Webhook ingestion
- Fallback polling for unreliable webhooks

### Phase 7-9: Marketing & Analytics (P0-P1)
- Event collection pipeline
- Lifecycle email automations
- Admin broadcast campaigns
- CMS integration for blog
- Job observability and audit logs

### Phase 10: Multi-Tenant Architecture (P0-P2)
- Subdomain tenant resolution
- Brand kit system (colors, fonts, logos)
- Tenant-specific homepages
- Email branding per tenant
- Custom domain support

### Phase 11: Product Mode Adapters (P0-P2)
- Cover-only notebooks (stock interior)
- Custom interior notebooks (user edits pages)
- Spiral binding support
- Niche template marketplace

### Phase 12-14: Photo Book Platform (P0-P2)
- Drag-and-drop photo upload
- AI-powered auto-layout
- Print-ready PDF generation (300 DPI, CMYK, bleed)
- Prodigi integration
- Advanced editor with manual adjustments
- AI photo enhancement and smart selection
- Collaborative editing
- Multi-provider support (Gelato failover)
- Template marketplace
- White-label solution
- Bulk ordering
- Client portals
- Analytics dashboard

## Tech Stack

### Frontend
- **Framework**: Next.js 16.1.4 (App Router)
- **UI Library**: React 19, TypeScript
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui, Radix UI
- **Icons**: Lucide React

### Backend
- **API**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Storage**: Cloudflare R2 or AWS S3
- **Queue**: BullMQ + Redis (for PDF generation)

### Integrations
- **Payments**: Stripe
- **Print**: Prodigi, Gelato, Peecho, Lulu
- **PDF**: PDFKit or Puppeteer
- **Email**: TBD (Resend, SendGrid, or similar)
- **Analytics**: TBD

## Print Provider Integration

VelloPad supports multiple print-on-demand providers through an adapter pattern:

### Supported Providers

| Provider | API Quality | Photo Books | Notebooks | Shipping | Pricing |
|----------|-------------|-------------|-----------|----------|---------|
| **Prodigi** | ⭐⭐⭐⭐⭐ | ✅ Full | ✅ Full | Global | $$$ |
| **Gelato** | ⭐⭐⭐⭐ | ✅ PDF | ✅ PDF | Global | $$ |
| **Peecho** | ⭐⭐⭐⭐ | ✅ Full | ✅ Full | EU-focused | $$ |
| **Lulu** | ⭐⭐⭐ | ⚠️ Books only | ✅ Full | Global | $ |

### Adapter Implementation

All print providers implement the base `PrintAdapter` interface in `lib/print-orchestrator/adapter.ts`:

```typescript
interface PrintAdapter {
  quote(request: QuoteRequest): Promise<Quote>
  createOrder(order: OrderRequest): Promise<OrderResponse>
  getOrderStatus(orderId: string): Promise<OrderStatus>
  handleWebhook(payload: any): Promise<WebhookEvent>
  preflight(assets: Asset[]): Promise<PreflightResult>
}
```

## Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy

### Other Platforms

VelloPad can be deployed on any platform supporting Next.js:
- Netlify
- AWS Amplify
- Self-hosted with Node.js

## Contributing

This project follows a structured development approach:

1. Features are tracked in `feature_list.json`
2. Development sessions are logged in `claude-progress.txt`
3. All features have explicit dependencies
4. Tests are required before marking features complete

See `DEVELOPMENT.md` (to be created) for detailed development guidelines.

## Documentation

- **PRD**: Full product requirements in `docs/PRD-photo-book-platform.md`
- **Developer Guide**: `DEVELOPER.md`
- **Feature List**: `feature_list.json` (114 features with dependencies)
- **Progress Log**: `claude-progress.txt`

## Roadmap

### Current Phase: Foundation
- [ ] Phase 1: Foundation & Auth
- [ ] Database schema setup
- [ ] Design system configuration
- [ ] E2E test framework

### Upcoming
- [ ] Phase 2: Book Studio Core
- [ ] Phase 3: Assets & Templates
- [ ] Phase 4: Rendition Pipeline
- [ ] Phase 5: Commerce & Orders
- [ ] Phase 6: Print Integration

### Future
- Multi-tenant architecture (Phase 10)
- Photo book platform (Phases 12-14)
- Template marketplace

## License

[To be determined]

## Support

For questions or issues:
- Check `claude-progress.txt` for development notes
- Review `feature_list.json` for feature status
- Consult `docs/PRD-photo-book-platform.md` for product details

---

**Status**: Planning Phase → Development Starting
**Version**: 0.1.0
**Last Updated**: 2026-01-20
**Total Features**: 114 (0 completed, 114 pending)
