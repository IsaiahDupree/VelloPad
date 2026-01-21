# Photo Book Creation Platform

**Full PRD:** See [`docs/PRD-photo-book-platform.md`](docs/PRD-photo-book-platform.md)

## Quick Overview

A web-based platform for creating custom photo books with:
- **Automated layout generation** from uploaded photos
- **AI-powered photo enhancement** and smart selection
- **Print-on-demand fulfillment** via Prodigi/Gelato APIs
- **Professional templates** for various use cases

## Key Features

### Phase 1 (MVP)
- Drag-and-drop image upload
- Auto-layout with 3 template styles
- PDF generation (print-ready, 300 DPI)
- Prodigi API integration for printing
- Order tracking dashboard

### Phase 2 (Enhanced)
- Advanced drag-and-drop editor
- AI photo enhancement
- Collaborative editing
- Multi-provider support (Gelato backup)

### Phase 3 (Premium)
- Template marketplace
- White-label for photographers
- Bulk ordering with discounts
- Business features (client portals, invoicing)

## Tech Stack

- **Frontend:** Next.js 14, React, TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes, Supabase (PostgreSQL)
- **Storage:** Cloudflare R2 or AWS S3
- **PDF Generation:** PDFKit or Puppeteer
- **Print APIs:** Prodigi (primary), Gelato (backup)

## Print Provider APIs

| Provider | Support | Shipping | Pricing |
|----------|---------|----------|---------|
| **Prodigi** | Full REST API + SDK | Global | $$$ |
| **Gelato** | PDF-based | Global | $$ |
| **Peecho** | Full API + Creator | EU-focused | $$ |
| **Lulu** | Book-focused | Global | $ |

## Pricing Strategy

- **8x8" Softcover (20 pages):** $19.99
- **10x10" Hardcover (20 pages):** $34.99
- **Additional pages:** $0.50-$0.75/page
- **Shipping:** $4.99 (standard) - $14.99+ (international)

## Development Roadmap

- **Months 1-2:** MVP (upload, auto-layout, PDF, Prodigi, checkout)
- **Months 3-4:** Enhanced editor, AI features, Gelato integration
- **Months 5-6:** Template marketplace, white-label, bulk ordering

---

**Status:** Planning Phase  
**Target Launch:** Q2 2026  
**Full Documentation:** [`docs/PRD-photo-book-platform.md`](docs/PRD-photo-book-platform.md)
