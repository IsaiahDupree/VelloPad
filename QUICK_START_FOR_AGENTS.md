# Quick Start Guide for Autonomous Coding Agents

Welcome! This is your fast-track orientation to working on VelloPad.

## 🎯 Your Mission

Implement features from `feature_list.json` in order, respecting dependencies, and writing tests.

## 📋 Essential Files

1. **feature_list.json** - 114 features to implement (your task list)
2. **claude-progress.txt** - Session log (read first, update when done)
3. **DEVELOPMENT.md** - Comprehensive developer guide
4. **README.md** - Project overview
5. **.env.example** - Environment variables template

## 🚀 Quick Workflow

### 1. Start Your Session (2 minutes)

```bash
# Read the progress log
cat claude-progress.txt

# Check next features to implement
grep '"passes": false' feature_list.json | head -5

# Verify dependencies are met
```

### 2. Pick a Feature (1 minute)

**Rules:**
- Choose P0 priority first
- All dependencies must have `"passes": true`
- Start with Phase 1 features (BS-101, BS-102, BS-103)

**Recommended First Features:**
1. DB-001: Database Schema - Core
2. UI-001: Design System Setup
3. TEST-001: E2E Test Setup
4. BS-101: Auth + Workspace Creation

### 3. Implement (varies)

```typescript
// Follow existing patterns in the codebase
// app/ for routes
// lib/ for utilities
// components/ for UI
// Check DEVELOPMENT.md for code examples
```

### 4. Write Tests (15 minutes)

```typescript
// e2e/[feature].spec.ts
import { test, expect } from '@playwright/test'

test('feature works', async ({ page }) => {
  // Test implementation
})
```

### 5. Update Tracking (2 minutes)

```json
// feature_list.json - Change feature status
{
  "id": "BS-101",
  "passes": true  // ✅ Mark as complete
}
```

```markdown
// claude-progress.txt - Log your session
## Session #2 - 2026-01-21
**Features Completed:** BS-101, BS-102
**Notes:** Implemented auth and workspace roles
```

## 📊 Current Status

- **Total Features:** 114
- **Completed:** 0
- **Current Phase:** Phase 1 (Foundation & Auth)
- **Priority:** Set up core infrastructure first

## 🎓 Feature Format

```json
{
  "id": "BS-101",
  "name": "Auth + Workspace Creation",
  "description": "User signup/login with default workspace creation",
  "priority": "P0",         // P0 = critical, P1 = important, P2 = nice-to-have
  "phase": 1,
  "effort": "5pts",
  "passes": false,          // ← Change to true when complete
  "category": "auth",
  "files": ["src/app/auth/"],
  "dependencies": []        // Must be complete before starting this feature
}
```

## 🏗️ Project Structure

```
VelloPad/
├── feature_list.json      ← Your task list (114 features)
├── claude-progress.txt    ← Session log
├── DEVELOPMENT.md         ← Full developer guide
├── README.md              ← Project overview
├── .env.example           ← Environment config
│
├── app/                   ← Next.js routes
│   ├── (app)/            ← Authenticated routes
│   ├── api/              ← API endpoints
│   └── page.tsx          ← Homepage
│
├── components/            ← React components
│   └── ui/               ← shadcn/ui components
│
├── lib/                   ← Utilities
│   ├── supabase/         ← Database client
│   ├── print-orchestrator/ ← Print provider abstraction
│   └── utils.ts
│
└── e2e/                   ← Playwright tests
```

## 🔧 Tech Stack Quick Reference

- **Framework:** Next.js 16+ (App Router)
- **Database:** Supabase (PostgreSQL)
- **UI:** React 19, TypeScript, Tailwind CSS, shadcn/ui
- **Payments:** Stripe
- **Print:** Prodigi, Gelato, Peecho, Lulu (adapters)
- **Testing:** Playwright (E2E), Vitest (unit)

## 🎯 Phase 1 Roadmap (Start Here)

Priority order for first features:

1. ✅ **DB-001**: Database Schema - Core tables
2. ✅ **UI-001**: Design System Setup (shadcn/ui config)
3. ✅ **TEST-001**: E2E Test Setup (Playwright)
4. ⬜ **BS-101**: Auth + Workspace Creation
5. ⬜ **TEST-002**: Auth E2E Tests
6. ⬜ **BS-102**: Workspace Member Roles
7. ⬜ **BS-103**: Settings Page

## 💡 Common Patterns

### API Route
```typescript
// app/api/[feature]/route.ts
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  // ...
}
```

### Component
```typescript
// components/[feature]/component.tsx
'use client'

import { Button } from '@/components/ui/button'

export function Feature() {
  // ...
}
```

### E2E Test
```typescript
// e2e/[feature].spec.ts
import { test, expect } from '@playwright/test'

test('feature works', async ({ page }) => {
  await page.goto('/feature')
  // ...
})
```

## 🚨 Critical Rules

1. **Never skip dependencies** - Check `dependencies` array in feature_list.json
2. **Always write tests** - No feature is complete without tests
3. **Update feature_list.json** - Mark `passes: true` when done
4. **Log your session** - Add notes to claude-progress.txt
5. **Follow existing patterns** - Don't reinvent the wheel

## 🎬 Example Session

```bash
# 1. Read previous session
cat claude-progress.txt

# 2. Find next feature
grep -A 5 '"id": "BS-101"' feature_list.json

# 3. Implement feature
# ... write code ...

# 4. Write tests
# e2e/auth.spec.ts

# 5. Update tracking
# Edit feature_list.json: "passes": true
# Edit claude-progress.txt: log session

# Done! 🎉
```

## 📚 Need More Info?

- **Detailed patterns:** DEVELOPMENT.md
- **Product requirements:** docs/PRD-photo-book-platform.md
- **Previous work:** claude-progress.txt
- **Project overview:** README.md

## 🎪 You're Ready!

1. Read `claude-progress.txt`
2. Pick a P0 feature with no dependencies
3. Implement it
4. Write tests
5. Update tracking
6. Repeat

Good luck! 🚀
