# PRD: Event Tracking System for VelloPad

**Status:** Active  
**Created:** 2026-01-25  
**Based On:** BlankLogo Event Tracking Pattern

## Overview

Implement sophisticated user event tracking for VelloPad to optimize the book creation and publishing funnels.

## Event Categories

| Category | Events |
|----------|--------|
| **Acquisition** | `landing_view`, `cta_click`, `pricing_view`, `template_preview` |
| **Activation** | `signup_start`, `login_success`, `activation_complete`, `first_book_created` |
| **Core Value** | `book_created`, `chapter_written`, `word_count_milestone`, `pdf_generated`, `cover_designed`, `order_placed` |
| **Monetization** | `checkout_started`, `purchase_completed`, `print_order_completed`, `subscription_started` |
| **Retention** | `return_session`, `writing_streak`, `books_completed` |
| **Reliability** | `error_shown`, `pdf_generation_failed`, `print_order_failed` |

## Core Value Event Properties

### book_created
```json
{
  "book_id": "string",
  "title": "string",
  "template_id": "string",
  "target_word_count": "number"
}
```

### word_count_milestone
```json
{
  "book_id": "string",
  "milestone": "1000 | 5000 | 10000 | 25000 | 50000",
  "current_word_count": "number",
  "days_writing": "number"
}
```

### order_placed
```json
{
  "book_id": "string",
  "order_id": "string",
  "quantity": "number",
  "format": "paperback | hardcover",
  "total": "number"
}
```

## 4 North Star Milestones

1. **Activated** = `first_book_created`
2. **First Value** = first `word_count_milestone` (1000 words)
3. **Aha Moment** = first `pdf_generated`
4. **Monetized** = `order_placed`

## Features

| ID | Name | Priority |
|----|------|----------|
| TRACK-001 | Tracking SDK Integration | P1 |
| TRACK-002 | Acquisition Event Tracking | P1 |
| TRACK-003 | Activation Event Tracking | P1 |
| TRACK-004 | Core Value Event Tracking | P1 |
| TRACK-005 | Monetization Event Tracking | P1 |
| TRACK-006 | Writing Streak Tracking | P2 |
| TRACK-007 | Error & Performance Tracking | P2 |
| TRACK-008 | User Identification | P1 |
