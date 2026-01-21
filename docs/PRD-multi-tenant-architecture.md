# Multi-Tenant Notebook Platform Architecture PRD

## Overview

Build **one platform** with adapters for **(A) custom inside pages** vs **(B) just a custom cover**, plus **multiple branded storefronts** on subdomains/custom domains that all share the **same DB + same integrations**, and **subdomain-specific email branding**.

---

## 1) "A vs B" as real product modes via adapters

Think of each notebook product as: **a print spec + an asset pipeline**.

### Mode A: Custom inside pages (true personalization)

User can edit pages (planner layouts, prompts, scripture study pages, class notes format, etc.) → you generate a **print-ready interior PDF** every time.

**Pipeline**

1. User edits in your editor (blocks, templates, page settings)
2. You render:
   * `interior.pdf` (multi-page)
   * `cover.pdf` (front/back/spine if needed)
3. You submit to print provider API
4. Store the "print job" + order status

**What changes vs cover-only**

* You must own a **PDF render service**
* You need **template/versioning** (so reprints reproduce exactly)
* You need **preflight checks** (margins near spiral edge, bleed, DPI)

### Mode B: Custom cover only (fast, low compute)

Inside pages are a fixed "stock interior" (lined/dotted/blank/planner v1), and user uploads/edits only the cover.

**Pipeline**

1. User customizes `cover` (image/text)
2. You use a **pre-approved interior PDF** for that SKU
3. Submit to print provider API

**What changes**

* No heavy page rendering needed
* Much cheaper + faster
* Great for "merch-style" stores

---

## 2) The "Notebook Adapter" pattern (so both modes feel identical in your app)

Make one internal interface that all notebooks go through:

### Adapter responsibilities

* **Capabilities**
  * `supportsCoverOnly` 
  * `supportsCustomInterior` 
  * `supportsSpiralBinding` 
  * `allowedSizes`, `paperTypes`, `pageCounts` 
* **Asset requirements**
  * what files are needed (cover PDF, interior PDF, separate back cover, etc.)
* **Quote + order**
  * `quote(orderDraft)` 
  * `createOrder(orderDraft, assets)` 
  * `getStatus(orderId)` 
* **Preflight**
  * validate bleed/safe zones esp. spiral edge
  * validate page count rules

### Two layers of adapters

1. **Product Mode Adapter**
   * `CoverOnlyNotebookAdapter` 
   * `CustomInteriorNotebookAdapter` 
2. **Print Provider Adapter** (Prodigi/Peecho/Printful/etc.)
   * `ProdigiAdapter` 
   * `PeechoAdapter` 
   * etc.

Then you compose them:

> "CustomInteriorNotebookAdapter + ProdigiAdapter"
> "CoverOnlyNotebookAdapter + PrintfulAdapter"

This gives you one UI/checkout flow regardless of mode/provider.

---

## 3) Multi-storefront branding: main store + niche subdomain stores

You're describing a **multi-tenant storefront** model:

* **Main store**: shows top products + broad positioning
* **Sub-stores** (subdomains or custom domains): niche positioning (e.g., faith-based, teachers, fitness, entrepreneurs), culture-matching visuals, tailored copy, curated collections — but same backend.

### How routing works

**Tenant is resolved by the hostname**:

* `vellopad.com` → tenant = "main"
* `faith.vellopad.com` → tenant = "faith"
* `teachers.vellopad.com` → tenant = "teachers"
* `examplebrand.com` (custom domain) → tenant = "examplebrand"

In Next.js this is typically done with middleware reading the `Host` header and setting a `tenantId`.

### What tenants control (Brand Kit)

Store a "brand kit" per tenant:

* colors, fonts, logo, favicon
* homepage layout choice (hero variants)
* tone of voice + vocabulary rules
* featured collections
* social proof blocks (testimonials specific to that niche)
* default product templates for that niche

The important part: **it's not a separate app**. It's the same app with theming and content selected by tenant.

---

## 4) Single DB, shared products, tenant-specific storefront configuration

Use a shared DB with a **tenant_id** on anything that's tenant-specific.

### Core tables (simple model)

* `tenants` (id, name, domains[], brand_kit_json, email_branding_id, enabled)
* `products` (global catalog entries)
* `product_variants` (size/binding/pagecount/provider sku)
* `collections` (can be global or tenant-specific)
* `tenant_collections` (tenant_id, collection_id, sort order)
* `templates` (interior templates, cover templates; can be global + tenant overrides)
* `orders` (tenant_id, user_id, order data, provider refs)
* `customers` (global identity, but can store tenant preferences)
* `email_campaigns` (tenant_id, sequences, templates)

If using Supabase/Postgres: enable Row Level Security so tenant views are safe by default.

---

## 5) Email campaigns with subdomain-specific branding (and great deliverability)

You can do this cleanly, but deliverability requires doing it "the right way."

### Recommended setup

* Use ONE ESP (SendGrid/Mailgun/Postmark/etc.)
* Create **separate sending domains** per tenant (or per cluster of tenants):
  * `mail.vellopad.com` (main)
  * `mail.faith.vellopad.com` OR `mail.faithnotebooks.com` (faith store)
* Configure SPF/DKIM/DMARC for each sending domain
* Optionally separate IPs later if you scale big

### In your app

* Each tenant has:
  * `from_name`, `from_email` 
  * header/footer templates
  * typography/colors for emails
  * sequence templates (welcome, abandoned cart, post-purchase, upsell)
* When you trigger emails, you choose templates by `(tenant_id, lifecycle_event)`.

### List segmentation (important)

Don't "guess" someone's group. Let the storefront they sign up on (or a preference choice) define:

* `signup_tenant_id` 
* `interests[]` (self-declared)

That way it's culture-matching without being creepy or stereotyping.

---

## 6) Culture-matching signals without making it weird

You want "people feel like it's for them." The safest + highest-converting way:

### Do

* Curate templates and imagery that match the niche **store's mission**
* Use niche-relevant product naming + collections
* Use landing pages tailored to niche use-cases (e.g., "prayer journal", "bible study notes", "sermon notes")
* Offer niche bundles (templates + covers + accessories)
* Let users self-select preferences ("What are you using this for?")

### Avoid

* Inferring sensitive attributes from behavior
* Over-indexing stereotypes
* Targeting that could be seen as exclusionary

---

## 7) The operational checklist (so this is real, not theory)

### Phase 1 (fast win)

* Implement tenants by hostname
* Brand kits + themed homepages
* Mode B (cover-only) first (cheapest compute)
* Email: one sending domain for main + brand-styled templates per tenant

### Phase 2 (power feature)

* Add Mode A interior editor + PDF generation service
* Template marketplace by tenant (faith templates, teacher templates, etc.)
* Add print preflight + versioning

### Phase 3 (scale)

* Add custom domains self-serve
* Tenant-level analytics dashboards
* Tenant-level deliverability controls (separate sending domains / IP pools)

---

## Next Steps

This can be expanded into:

1. a **DB schema** (Supabase/Postgres) with tenant-aware RLS,
2. a **Next.js tenant routing + theming blueprint**, and
3. the **adapter interfaces** for print providers + asset generation (A vs B).
