# PRD: Meta Pixel & CAPI Integration for VelloPad

**Status:** Active  
**Created:** 2026-01-25  
**Priority:** P1

## Overview

Implement Facebook Meta Pixel and Conversions API for VelloPad to optimize book creation sign-ups and print orders.

## Standard Events Mapping

| VelloPad Event | Meta Standard Event | Parameters |
|----------------|---------------------|------------|
| `landing_view` | `PageView` | - |
| `template_preview` | `ViewContent` | `content_type: 'template'` |
| `signup_complete` | `CompleteRegistration` | `content_name`, `status` |
| `book_created` | `AddToCart` | `content_type: 'book'` |
| `pdf_generated` | `ViewContent` | `content_ids` |
| `checkout_started` | `InitiateCheckout` | `value`, `currency` |
| `order_placed` | `Purchase` | `value`, `currency`, `num_items` |
| `subscription_started` | `Subscribe` | `value`, `currency` |

## Features

| ID | Name | Priority |
|----|------|----------|
| META-001 | Meta Pixel Installation | P1 |
| META-002 | PageView Tracking | P1 |
| META-003 | Standard Events Mapping | P1 |
| META-004 | CAPI Server-Side Events | P1 |
| META-005 | Event Deduplication | P1 |
| META-006 | User Data Hashing (PII) | P1 |
| META-007 | Custom Audiences Setup | P2 |
| META-008 | Conversion Optimization | P2 |
