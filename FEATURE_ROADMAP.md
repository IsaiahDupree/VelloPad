# VelloPad Feature Implementation Roadmap

This document provides a visual roadmap for implementing VelloPad's 114 features in dependency order.

## Critical Path Overview

```
Phase 1: Foundation (8 features)
   ↓
Phase 2: Book Studio (5 features)
   ↓
Phase 3: Assets & Templates (4 features)
   ↓
Phase 4: Rendition Pipeline (3 features)
   ↓
Phase 5: Commerce (4 features)
   ↓
Phase 6: Print Integration (4 features)
   ↓
Phases 7-9: Marketing & Analytics (6 features)
   ↓
Phases 10-14: Advanced Features (76 features)
```

## Phase 1: Foundation & Auth (CRITICAL - Start Here)

### No Dependencies (Start Immediately)
- **DB-001**: Database Schema - Core ⚡ P0
- **UI-001**: Design System Setup ⚡ P0
- **TEST-001**: E2E Test Setup ⚡ P0

### Depends on DB-001
- **BS-101**: Auth + Workspace Creation ⚡ P0

### Depends on BS-101
- **TEST-002**: Auth E2E Tests ⚡ P0
- **BS-102**: Workspace Member Roles (P1)
- **BS-103**: Settings Page (P1)

### Depends on UI-001
- **UI-002**: Dashboard Layout ⚡ P0

**Phase 1 Completion Criteria:**
- [ ] Users can sign up and log in
- [ ] Workspaces are created automatically
- [ ] Settings page accessible
- [ ] Design system configured
- [ ] Tests running

---

## Phase 2: Book Studio Core

### Critical Path
```
BS-101 (Auth)
   ↓
BS-201 (Create Book Wizard) ⚡ P0
   ↓
BS-202 (Outline Builder) ⚡ P0
   ↓
BS-203 (Chapter Editor) ⚡ P0
   ├─→ BS-204 (Book Dashboard) (P1)
   ├─→ BS-205 (Version Snapshots) (P1)
   ├─→ UI-003 (Editor Layout Mode) (P1)
   ├─→ AI-001 (Prompt Sidekick) (P1)
   └─→ TEST-003 (Book Creation E2E) ⚡ P0
```

### Dependencies
- **BS-201**: Requires BS-101
- **BS-202**: Requires BS-201
- **BS-203**: Requires BS-202
- **BS-204**: Requires BS-201, BS-203
- **BS-205**: Requires BS-203
- **UI-003**: Requires BS-203
- **AI-001**: Requires BS-203
- **AI-002**: Requires BS-204
- **TEST-003**: Requires BS-203, TEST-001

**Phase 2 Completion Criteria:**
- [ ] Users can create books
- [ ] Chapter outline works with drag-drop
- [ ] Rich text editor functional
- [ ] Auto-save implemented
- [ ] Version snapshots working

---

## Phase 3: Assets & Templates

### Critical Path
```
DB-001 (Core Schema)
   ↓
DB-002 (Assets Schema) ⚡ P0
   ├─→ BS-301 (Asset Library) ⚡ P0
   │      ↓
   │   BS-302 (Print Quality Warnings) (P1)
   │
   ├─→ BS-303 (Template System) (P1)
   │      ↓
   │   BS-304 (Cover Basics) (P1)
   │
   └─→ ... (continues)
```

### Dependencies
- **DB-002**: Requires DB-001
- **BS-301**: Requires BS-101, BS-201, DB-002
- **BS-302**: Requires BS-301
- **BS-303**: Requires BS-201
- **BS-304**: Requires BS-201

**Phase 3 Completion Criteria:**
- [ ] Image upload working
- [ ] Asset library functional
- [ ] Print quality detection
- [ ] Templates available
- [ ] Cover designer working

---

## Phase 4: Rendition Pipeline

### Critical Path
```
DB-003 (Renditions Schema) ⚡ P0
   ↓
BS-401 (Rendition Request) ⚡ P0
   ├─→ BS-402 (Preflight Engine) ⚡ P0
   └─→ BS-403 (Preview System) (P1)
```

### Dependencies
- **DB-003**: Requires DB-001
- **BS-401**: Requires BS-203, BS-205
- **BS-402**: Requires BS-401, BS-302
- **BS-403**: Requires BS-203

**Phase 4 Completion Criteria:**
- [ ] PDF generation queue working
- [ ] Preflight checks implemented
- [ ] Preview system functional
- [ ] Print-ready PDFs generated

---

## Phase 5: Commerce & Orders

### Critical Path
```
DB-004 (Commerce Schema) ⚡ P0
   ↓
BS-601 (Print Orchestrator) ⚡ P0
   ↓
BS-602 (Provider Adapter v1) ⚡ P0
   ↓
BS-501 (Quote Flow) ⚡ P0
   ↓
BS-502 (Stripe Checkout) ⚡ P0
   ├─→ BS-503 (Order Detail Page) ⚡ P0
   │      ↓
   │   BS-504 (Reorder Flow) (P1)
   │
   └─→ BS-603 (Webhook Ingestion) ⚡ P0
          ↓
       BS-604 (Fallback Polling) (P1)
```

### Dependencies
- **BS-501**: Requires BS-401, BS-402, BS-601
- **BS-502**: Requires BS-501
- **BS-503**: Requires BS-502, BS-602
- **BS-504**: Requires BS-503
- **TEST-004**: Requires BS-502, TEST-001

**Phase 5 Completion Criteria:**
- [ ] Users can get quotes
- [ ] Stripe checkout working
- [ ] Orders tracked
- [ ] Webhooks handled
- [ ] Reordering possible

---

## Phase 6: Print Integration

### Critical Path
```
BS-401 (Rendition)
   ↓
BS-601 (Print Orchestrator) ⚡ P0
   ├─→ BS-602 (Provider Adapter v1) ⚡ P0
   │      ├─→ BS-603 (Webhook Ingestion) ⚡ P0
   │      └─→ BS-604 (Fallback Polling) (P1)
   │
   └─→ BS-901 (Job Observability) ⚡ P0
```

### Provider Adapter Options (Pick One First)
1. **Prodigi** - Best API, global shipping (recommended)
2. **Peecho** - Full API, EU-focused
3. **Gelato** - PDF-based, good backup
4. **Lulu** - Book-focused, budget option

**Phase 6 Completion Criteria:**
- [ ] At least one print provider integrated
- [ ] Orders sent to provider
- [ ] Webhooks handled
- [ ] Status updates working
- [ ] Jobs observable

---

## Phases 7-9: Marketing & Analytics

### Critical Path
```
BS-101 (Auth)
   ↓
DB-005 (Events Schema) ⚡ P0
   ↓
BS-701 (Event Collection) ⚡ P0
   ├─→ BS-702 (Lifecycle Emails) ⚡ P0
   │      ↓
   │   BS-703 (Admin Broadcast) (P1)
   │
   └─→ BS-801 (CMS Integration) (P1)
          ↓
       BS-802 (Marketing Hub) (P1)
```

**Completion Criteria:**
- [ ] Events tracked
- [ ] Lifecycle emails sent
- [ ] Admin campaigns working
- [ ] Blog integrated
- [ ] Marketing hub functional

---

## Phase 10: Multi-Tenant Architecture

### Critical Path
```
MT-001 (Tenant Hostname Resolution) ⚡ P0
   ↓
MT-002 (Tenants Database Schema) ⚡ P0
   ├─→ MT-003 (Brand Kit System) ⚡ P0
   │      ↓
   │   MT-004 (Tenant Homepage) ⚡ P0
   │
   ├─→ MT-007 (Row Level Security) ⚡ P0
   │
   └─→ MT-008 (Tenant Email Branding) ⚡ P0
          ↓
       MT-009 (Sending Domains) (P1)
          ↓
       MT-010 (Email Sequences) (P1)
```

**Completion Criteria:**
- [ ] Subdomain routing works
- [ ] Brand kits per tenant
- [ ] Custom homepages
- [ ] Data isolation via RLS
- [ ] Branded emails

---

## Phase 11: Product Mode Adapters

### Critical Path
```
BS-601 (Print Orchestrator)
   ↓
PM-001 (Notebook Adapter Interface) ⚡ P0
   ├─→ PM-002 (Cover-Only Adapter) ⚡ P0
   │      └─→ PM-004 (Stock Interior Library) ⚡ P0
   │
   └─→ PM-003 (Custom Interior Adapter) (P1)
          ├─→ PM-005 (Interior PDF Render) (P1)
          └─→ PM-006 (Template Versioning) (P1)
```

**Completion Criteria:**
- [ ] Cover-only mode works
- [ ] Stock interiors available
- [ ] Custom interior mode works
- [ ] Spiral binding supported
- [ ] Niche templates available

---

## Phases 12-14: Photo Book Platform

### Phase 12: MVP (18 features)
```
PB-001 (Photo Upload) ⚡ P0
   ├─→ PB-003 (Auto-Organization) (P1)
   ├─→ PB-004 (Optimization) ⚡ P0
   └─→ PB-006 (Auto-Layout) ⚡ P0
          ├─→ PB-007 (Templates) ⚡ P0
          │      ↓
          │   PB-009 (Cover Editor) ⚡ P0
          │
          ├─→ PB-010 (PDF Generation) ⚡ P0
          │      ├─→ PB-011 (Page Sizes) ⚡ P0
          │      ├─→ PB-012 (Binding Options) ⚡ P0
          │      └─→ PB-013 (Prodigi Integration) ⚡ P0
          │             ├─→ PB-014 (Shipping) ⚡ P0
          │             ├─→ PB-015 (Webhooks) ⚡ P0
          │             └─→ PB-016 (Dashboard) ⚡ P0
          │
          └─→ PB-017 (Preview Mode) ⚡ P0
```

### Phase 13: Enhanced (16 features)
- AI features (PB-024 to PB-027)
- Advanced editor (PB-019 to PB-023)
- Collaboration (PB-028 to PB-031)
- Multi-provider (PB-032 to PB-034)

### Phase 14: Premium (11 features)
- Template marketplace (PB-035 to PB-037)
- White-label (PB-039)
- Business features (PB-040 to PB-043)
- API & analytics (PB-044, PB-045)

---

## Quick Start Priority Queue

### Week 1: Foundation
1. DB-001 ⚡
2. UI-001 ⚡
3. TEST-001 ⚡
4. BS-101 ⚡
5. TEST-002 ⚡

### Week 2-3: Book Studio
6. DB-002 ⚡
7. BS-201 ⚡
8. BS-202 ⚡
9. BS-203 ⚡
10. TEST-003 ⚡

### Week 4: Assets
11. BS-301 ⚡
12. BS-303
13. BS-304

### Week 5: Rendition
14. DB-003 ⚡
15. BS-401 ⚡
16. BS-402 ⚡

### Week 6: Commerce
17. DB-004 ⚡
18. BS-601 ⚡
19. BS-602 ⚡

### Week 7: Orders
20. BS-501 ⚡
21. BS-502 ⚡
22. BS-503 ⚡

### Week 8+: Continue phases...

---

## Feature Count by Phase

- **Phase 1**: 8 features (4 P0, 4 P1)
- **Phase 2**: 7 features (4 P0, 3 P1)
- **Phase 3**: 4 features (1 P0, 3 P1)
- **Phase 4**: 3 features (2 P0, 1 P1)
- **Phase 5**: 4 features (3 P0, 1 P1)
- **Phase 6**: 4 features (3 P0, 1 P1)
- **Phase 7**: 3 features (2 P0, 1 P1)
- **Phase 8**: 2 features (0 P0, 2 P1)
- **Phase 9**: 2 features (1 P0, 1 P1)
- **Phase 10**: 13 features (5 P0, 6 P1, 2 P2)
- **Phase 11**: 12 features (5 P0, 6 P1, 1 P2)
- **Phase 12**: 18 features (12 P0, 4 P1, 2 P2)
- **Phase 13**: 16 features (1 P0, 8 P1, 7 P2)
- **Phase 14**: 11 features (0 P0, 5 P1, 6 P2)

**Total**: 114 features (43 P0, 48 P1, 23 P2)

---

## Legend

- ⚡ = P0 (Critical path, must implement)
- (P1) = Important but can defer
- (P2) = Nice to have, implement last

## Notes

- Always check `feature_list.json` for current status
- Dependencies must be completed before starting a feature
- Mark features as `passes: true` only after tests pass
- Update `claude-progress.txt` after each session
