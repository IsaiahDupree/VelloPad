# PRD: Growth Data Plane for VelloPad

**Status:** Active  
**Created:** 2026-01-25  
**Priority:** P0  
**Reference:** `autonomous-coding-dashboard/harness/prompts/PRD_GROWTH_DATA_PLANE.md`

## Overview

Implement the Growth Data Plane for VelloPad: unified event tracking for book creation and publishing funnels.

## VelloPad-Specific Events

| Event | Source | Segment Trigger |
|-------|--------|-----------------|
| `landing_view` | web | - |
| `template_preview` | web | warm_lead |
| `signup_completed` | web | new_signup |
| `book_created` | app | activated |
| `chapter_written` | app | - |
| `word_count_1000` | app | first_milestone |
| `word_count_10000` | app | committed_writer |
| `pdf_generated` | app | first_value |
| `cover_designed` | app | - |
| `checkout_started` | web | checkout_started |
| `order_placed` | stripe | aha_moment |
| `email.clicked` | resend | newsletter_clicker |

## Segments for VelloPad

1. **signup_no_book_48h** → email: "Start your book in 5 minutes"
2. **book_created_no_words_72h** → email: "Write your first 500 words"
3. **writing_streak_broken** → email: "Don't lose your writing momentum"
4. **10k_words_no_pdf** → email: "Preview your book as PDF"
5. **pdf_generated_no_order** → email: "Order your first printed copy"
6. **first_order_placed** → email: "Share your book + order more"

## Features

| ID | Name | Priority |
|----|------|----------|
| GDP-001 | Supabase Schema Setup | P0 |
| GDP-002 | Person & Identity Tables | P0 |
| GDP-003 | Unified Events Table | P0 |
| GDP-004 | Resend Webhook Edge Function | P0 |
| GDP-005 | Email Event Tracking | P0 |
| GDP-006 | Click Redirect Tracker | P1 |
| GDP-007 | Stripe Webhook Integration | P1 |
| GDP-008 | Subscription Snapshot | P1 |
| GDP-009 | PostHog Identity Stitching | P1 |
| GDP-010 | Meta Pixel + CAPI Dedup | P1 |
| GDP-011 | Person Features Computation | P1 |
| GDP-012 | Segment Engine | P1 |
