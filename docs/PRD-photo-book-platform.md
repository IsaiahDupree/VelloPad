# Product Requirements Document: Photo Book Creation Platform

## Executive Summary

A web-based platform that enables users to create custom photo books from their uploaded images with automated layout generation, professional design templates, and seamless print-on-demand fulfillment.

---

## Product Vision

**Mission:** Democratize professional photo book creation by making it as simple as uploading photos and clicking "Create."

**Target Users:**
- Families preserving memories
- Event photographers delivering client albums
- Travel enthusiasts documenting trips
- Small businesses creating portfolios/lookbooks

**Core Value Proposition:** Transform a folder of photos into a professionally designed, print-ready photo book in minutes, not hours.

---

## Market Context

### Print-on-Demand Landscape

**Available APIs:**
1. **Prodigi** - Full REST API + Photobook Maker SDK
2. **Gelato** - Multi-page PDF support for photobooks
3. **Lulu** - Book printing + shipping API
4. **Blurb** - Custom API options (US shipping)
5. **Peecho** - REST API + Book Creator checkout

**Gap in Market:** Most providers offer print APIs but require users to generate print-ready PDFs. Few offer true "upload photos → auto-create book" experiences.

---

## Product Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Photo Book Platform                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Upload     │    │   Layout     │    │   PDF        │  │
│  │   Manager    │───►│   Engine     │───►│   Renderer   │  │
│  │   (R2/S3)    │    │   (Auto)     │    │   (Print)    │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                   │                   │           │
│         ▼                   ▼                   ▼           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Print-on-Demand API                     │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐          │   │
│  │  │ Prodigi  │  │ Gelato   │  │ Peecho   │          │   │
│  │  │ (Primary)│  │ (Backup) │  │ (EU)     │          │   │
│  │  └──────────┘  └──────────┘  └──────────┘          │   │
│  └─────────────────────────────────────────────────────┘   │
│         │                                                   │
│         ▼                                                   │
│  ┌──────────────┐                                          │
│  │   Order      │                                          │
│  │   Tracking   │                                          │
│  │   (Status)   │                                          │
│  └──────────────┘                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Core Features

### Phase 1: MVP (Months 1-2)

#### 1.1 Image Upload & Management
- **Drag-and-drop upload** (up to 100 images)
- **Bulk upload** from cloud storage (Google Photos, Dropbox)
- **Auto-organize** by date/EXIF data
- **Image optimization** (compression, format conversion)
- **Storage:** Cloudflare R2 or AWS S3

#### 1.2 Automated Layout Engine
- **Smart auto-layout** based on image count
- **Pre-built templates:**
  - Classic (1-2 photos per page)
  - Collage (3-6 photos per page)
  - Magazine (mixed layouts)
  - Minimalist (1 photo per page, lots of whitespace)
- **Auto-caption generation** from EXIF metadata
- **Cover design** with title/subtitle customization

#### 1.3 PDF Generation
- **Print-ready specs:**
  - Bleed: 0.125" (3mm)
  - Safe zone: 0.25" (6mm) from trim
  - Resolution: 300 DPI minimum
  - Color space: CMYK
  - Embedded fonts
- **Page sizes:** 8x8", 10x10", 12x12", 8x11"
- **Binding options:** Hardcover, softcover, layflat

#### 1.4 Print Integration (Prodigi)
- **Order creation** via REST API
- **Shipping calculation** (domestic + international)
- **Order tracking** with webhooks
- **Status updates** (processing, printing, shipped, delivered)

#### 1.5 User Dashboard
- **Project management** (save/edit/duplicate)
- **Order history** with tracking
- **Preview mode** (flip through pages)
- **Download PDF** (for self-printing)

### Phase 2: Enhanced Features (Months 3-4)

#### 2.1 Advanced Editor
- **Manual layout adjustment**
- **Drag-and-drop page reordering**
- **Text overlay** (captions, dates, quotes)
- **Filters & effects** (B&W, vintage, etc.)
- **Crop & rotate** individual images

#### 2.2 AI-Powered Features
- **Smart photo selection** (remove duplicates/blurry)
- **Auto-enhance** (brightness, contrast, color)
- **Face detection** for optimal cropping
- **Caption suggestions** using image recognition

#### 2.3 Collaboration
- **Shareable preview links**
- **Collaborative editing** (multiple users)
- **Approval workflow** (for photographers/clients)
- **Comments & feedback** on specific pages

#### 2.4 Multi-Provider Support
- **Gelato integration** (EU fulfillment)
- **Peecho integration** (additional options)
- **Price comparison** across providers
- **Automatic failover** if primary provider unavailable

### Phase 3: Premium Features (Months 5-6)

#### 3.1 Template Marketplace
- **Professional templates** (wedding, travel, baby, etc.)
- **User-created templates** (share/sell)
- **Seasonal collections** (holiday, graduation)
- **Brand kits** (logos, colors, fonts)

#### 3.2 Advanced Customization
- **Custom page sizes**
- **Mixed media** (text pages, full-bleed images)
- **Chapter dividers**
- **Index/table of contents**
- **Dust jacket design** (hardcover)

#### 3.3 Business Features
- **White-label** for photographers/agencies
- **Bulk ordering** with discounts
- **Client portals** (upload photos, approve designs)
- **Invoice generation**
- **Reseller pricing**

---

## User Flows

### Primary Flow: Create Photo Book

```
1. Upload Photos
   ├─ Drag & drop files
   ├─ Connect cloud storage
   └─ Auto-organize by date

2. Choose Template
   ├─ Preview template styles
   ├─ Select page count (20-100 pages)
   └─ Choose size & binding

3. Auto-Generate Layout
   ├─ AI arranges photos
   ├─ Adds captions (optional)
   └─ Designs cover

4. Review & Edit
   ├─ Flip through preview
   ├─ Adjust layouts (optional)
   └─ Edit text/captions

5. Checkout
   ├─ Select quantity
   ├─ Enter shipping address
   ├─ Choose shipping speed
   └─ Payment

6. Track Order
   ├─ Receive confirmation email
   ├─ Check status in dashboard
   └─ Get shipping notifications
```

### Secondary Flow: Edit Existing Project

```
1. Dashboard → Select Project
2. Edit Mode
   ├─ Add/remove photos
   ├─ Change template
   ├─ Adjust layouts
   └─ Update text
3. Save Changes
4. Re-order or Download PDF
```

---

## Technical Specifications

### Frontend Stack
- **Framework:** Next.js 14+ (App Router)
- **UI Library:** React + TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **State Management:** Zustand or React Context
- **Image Handling:** Sharp (server-side), Canvas API (client-side)

### Backend Stack
- **API:** Next.js API Routes (serverless)
- **Database:** Supabase (PostgreSQL)
- **File Storage:** Cloudflare R2 or AWS S3
- **PDF Generation:** PDFKit or Puppeteer
- **Queue System:** BullMQ + Redis (for long-running tasks)

### Print Provider Integration

#### Prodigi API (Primary)
```typescript
// Order creation
POST https://api.prodigi.com/v4.0/Orders
{
  "merchantReference": "order-123",
  "shippingMethod": "Standard",
  "recipient": {
    "name": "John Doe",
    "address": { ... }
  },
  "items": [{
    "sku": "GLOBAL-PHB-8X8-HC",
    "copies": 1,
    "assets": [{
      "printArea": "default",
      "url": "https://storage.example.com/book.pdf"
    }]
  }]
}
```

#### Webhook Handling
```typescript
// Order status updates
POST /api/webhooks/prodigi
{
  "event": "order.shipped",
  "orderId": "PRD-123456",
  "trackingNumber": "1Z999AA10123456784",
  "carrier": "UPS"
}
```

### Database Schema

```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Projects
CREATE TABLE projects (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  name TEXT NOT NULL,
  template_id UUID REFERENCES templates(id),
  status TEXT DEFAULT 'draft', -- draft, processing, completed
  settings JSONB, -- size, binding, page_count, etc.
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Images
CREATE TABLE images (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  storage_url TEXT NOT NULL,
  filename TEXT,
  file_size INTEGER,
  width INTEGER,
  height INTEGER,
  exif_data JSONB,
  sort_order INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Pages
CREATE TABLE pages (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  page_number INTEGER NOT NULL,
  layout_type TEXT, -- single, double, collage, etc.
  content JSONB, -- images, text, positions
  created_at TIMESTAMP DEFAULT NOW()
);

-- Orders
CREATE TABLE orders (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  user_id UUID REFERENCES users(id),
  provider TEXT, -- prodigi, gelato, peecho
  provider_order_id TEXT,
  status TEXT, -- pending, processing, printing, shipped, delivered
  tracking_number TEXT,
  carrier TEXT,
  shipping_address JSONB,
  total_amount DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Templates
CREATE TABLE templates (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  layout_rules JSONB,
  is_premium BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## PDF Generation Pipeline

### Requirements
- **Resolution:** 300 DPI minimum
- **Color Space:** CMYK (convert from RGB)
- **Bleed:** 0.125" (3mm) on all sides
- **Safe Zone:** 0.25" (6mm) from trim edge
- **Fonts:** Embed all fonts
- **File Size:** Optimize to <50MB per book

### Implementation (PDFKit)

```typescript
import PDFDocument from 'pdfkit';

async function generatePhotoBook(project: Project) {
  const doc = new PDFDocument({
    size: [8 * 72, 8 * 72], // 8x8 inches at 72 DPI
    margins: { top: 18, bottom: 18, left: 18, right: 18 }, // 0.25" safe zone
  });

  // Add cover
  doc.image(project.coverImage, 0, 0, {
    width: 8 * 72,
    height: 8 * 72,
  });

  // Add pages
  for (const page of project.pages) {
    doc.addPage();
    
    for (const image of page.images) {
      doc.image(image.url, image.x, image.y, {
        width: image.width,
        height: image.height,
      });
    }

    if (page.caption) {
      doc.font('Helvetica')
         .fontSize(12)
         .text(page.caption, page.captionX, page.captionY);
    }
  }

  doc.end();
  return doc;
}
```

---

## Pricing Strategy

### User Pricing (B2C)

| Size | Softcover | Hardcover | Layflat |
|------|-----------|-----------|---------|
| 8x8" (20 pages) | $19.99 | $29.99 | $39.99 |
| 10x10" (20 pages) | $24.99 | $34.99 | $44.99 |
| 12x12" (20 pages) | $29.99 | $39.99 | $49.99 |

**Additional Pages:** $0.50/page (softcover), $0.75/page (hardcover)

**Shipping:**
- Standard (7-10 days): $4.99
- Express (3-5 days): $9.99
- International: $14.99+

### Business Pricing (B2B)

- **Volume Discounts:** 10+ books: 15% off, 50+ books: 25% off
- **White-Label:** $99/month + 10% per order
- **API Access:** $199/month + $0.10/API call

---

## Success Metrics

### Phase 1 (MVP)
- **User Acquisition:** 1,000 signups in first 3 months
- **Conversion Rate:** 10% of signups create a book
- **Order Completion:** 80% of started books are ordered
- **Customer Satisfaction:** 4.5+ star rating

### Phase 2 (Growth)
- **Monthly Active Users:** 5,000+
- **Repeat Purchase Rate:** 30%
- **Average Order Value:** $35+
- **Net Promoter Score:** 50+

### Phase 3 (Scale)
- **Revenue:** $50k MRR
- **B2B Customers:** 50+ photographers/agencies
- **Template Marketplace:** 100+ templates
- **International Orders:** 20% of total

---

## Competitive Analysis

### Direct Competitors
- **Shutterfly:** Large catalog, slow editor, expensive
- **Mixbook:** Good editor, limited automation
- **Chatbooks:** Mobile-first, subscription model
- **Artifact Uprising:** Premium quality, high price

### Our Differentiators
1. **Speed:** Auto-generate books in seconds, not hours
2. **AI-Powered:** Smart photo selection and layout
3. **Flexibility:** Edit as much or as little as you want
4. **Price:** Competitive pricing with transparent costs
5. **Quality:** Professional print quality via Prodigi

---

## Go-to-Market Strategy

### Launch (Month 1)
- **Beta Program:** 100 early users (free first book)
- **Product Hunt Launch**
- **Social Media:** Instagram/Pinterest ads (visual platforms)
- **Content Marketing:** "How to create a photo book" guides

### Growth (Months 2-6)
- **Referral Program:** Give $10, Get $10
- **Partnerships:** Wedding photographers, event planners
- **SEO:** Target "photo book online", "custom photo album"
- **Influencer Marketing:** Family/lifestyle influencers

### Scale (Months 7-12)
- **B2B Outreach:** Photography studios, schools
- **White-Label Offering:** Partner with print shops
- **International Expansion:** EU via Gelato
- **Mobile App:** iOS/Android native apps

---

## Risk Mitigation

### Technical Risks
- **PDF Generation Failures:** Implement retry logic + manual review queue
- **Print Quality Issues:** Pre-flight checks before sending to printer
- **Provider Downtime:** Multi-provider failover system

### Business Risks
- **Low Conversion:** A/B test pricing, templates, onboarding flow
- **High CAC:** Focus on organic/referral growth, optimize ads
- **Print Defects:** Quality guarantee + free reprints policy

### Operational Risks
- **Customer Support Load:** Comprehensive FAQ, chatbot, video tutorials
- **Shipping Delays:** Set realistic expectations, proactive communication
- **Returns/Refunds:** Clear policy, easy process, track reasons

---

## Development Roadmap

### Month 1-2: MVP
- [ ] User authentication (Supabase Auth)
- [ ] Image upload + storage (R2/S3)
- [ ] Basic layout engine (3 templates)
- [ ] PDF generation (PDFKit)
- [ ] Prodigi API integration
- [ ] Checkout + payment (Stripe)
- [ ] Order tracking dashboard

### Month 3-4: Enhanced Features
- [ ] Advanced editor (drag-and-drop)
- [ ] AI photo enhancement
- [ ] Gelato integration (backup)
- [ ] Collaborative editing
- [ ] Mobile-responsive design

### Month 5-6: Premium Features
- [ ] Template marketplace
- [ ] White-label solution
- [ ] Bulk ordering
- [ ] Analytics dashboard
- [ ] API for developers

---

## Appendix

### API Providers Comparison

| Provider | API Quality | Photobook Support | Shipping | Pricing |
|----------|-------------|-------------------|----------|---------|
| **Prodigi** | ⭐⭐⭐⭐⭐ | ✅ Full | Global | $$$ |
| **Gelato** | ⭐⭐⭐⭐ | ✅ PDF-based | Global | $$ |
| **Peecho** | ⭐⭐⭐⭐ | ✅ Full | EU-focused | $$ |
| **Lulu** | ⭐⭐⭐ | ⚠️ Book-focused | Global | $ |
| **Blurb** | ⭐⭐⭐ | ⚠️ Limited API | US only | $$$ |

### Recommended Stack
- **Primary:** Prodigi (best API, global shipping)
- **Backup:** Gelato (EU fulfillment, cost-effective)
- **Future:** Peecho (additional options)

---

## Next Steps

1. **Validate Assumptions:** User interviews with target customers
2. **Design Mockups:** High-fidelity designs for key flows
3. **Technical Spike:** Test PDF generation + Prodigi API
4. **Build MVP:** 8-week sprint to launch beta
5. **Beta Testing:** 100 users, gather feedback, iterate
6. **Public Launch:** Product Hunt + marketing campaign

---

**Document Version:** 1.0  
**Last Updated:** January 20, 2026  
**Owner:** Product Team  
**Status:** Draft → Review → Approved
