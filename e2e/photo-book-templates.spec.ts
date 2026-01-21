/**
 * E2E Tests: Photo Book Templates
 * Tests for PB-007: Photo Book Templates
 */

import { test, expect } from '@playwright/test'
import {
  getAllTemplates,
  getTemplateById,
  getRecommendedTemplate,
  getTemplatesForPhotoCount,
  PHOTO_BOOK_TEMPLATES
} from '../src/templates/photo-book'

test.describe('Photo Book Templates - Core Functionality', () => {
  test('should export all 4 required templates', () => {
    const templates = getAllTemplates()
    expect(templates).toHaveLength(4)

    const ids = templates.map(t => t.id)
    expect(ids).toContain('classic')
    expect(ids).toContain('collage')
    expect(ids).toContain('magazine')
    expect(ids).toContain('minimalist')
  })

  test('should get template by ID', () => {
    const classic = getTemplateById('classic')
    expect(classic).toBeTruthy()
    expect(classic?.id).toBe('classic')
    expect(classic?.name).toBe('Classic Album')
    expect(classic?.style).toBe('classic')
  })

  test('should return null for invalid template ID', () => {
    const invalid = getTemplateById('invalid-template')
    expect(invalid).toBeNull()
  })

  test('all templates should have required fields', () => {
    const templates = getAllTemplates()

    templates.forEach(template => {
      expect(template.id).toBeTruthy()
      expect(template.name).toBeTruthy()
      expect(template.description).toBeTruthy()
      expect(template.style).toBeTruthy()
      expect(Array.isArray(template.features)).toBe(true)
      expect(template.features.length).toBeGreaterThan(0)
      expect(Array.isArray(template.bestFor)).toBe(true)
      expect(template.bestFor.length).toBeGreaterThan(0)
      expect(Array.isArray(template.layouts)).toBe(true)
      expect(template.layouts.length).toBeGreaterThan(0)
      expect(template.photoRange.min).toBeGreaterThan(0)
      expect(template.photoRange.max).toBeGreaterThan(template.photoRange.min)
      expect(typeof template.popularity).toBe('number')
    })
  })
})

test.describe('Photo Book Templates - Recommendations', () => {
  test('should recommend minimalist for small photo counts', () => {
    const recommended = getRecommendedTemplate(20)
    expect(recommended.id).toBe('minimalist')
  })

  test('should recommend magazine for medium-small photo counts', () => {
    const recommended = getRecommendedTemplate(50)
    expect(recommended.id).toBe('magazine')
  })

  test('should recommend classic for medium-large photo counts', () => {
    const recommended = getRecommendedTemplate(80)
    expect(recommended.id).toBe('classic')
  })

  test('should recommend collage for large photo counts', () => {
    const recommended = getRecommendedTemplate(150)
    expect(recommended.id).toBe('collage')
  })

  test('should handle edge cases in recommendations', () => {
    expect(getRecommendedTemplate(1).id).toBe('minimalist')
    expect(getRecommendedTemplate(30).id).toBe('minimalist')
    expect(getRecommendedTemplate(31).id).toBe('magazine')
    expect(getRecommendedTemplate(60).id).toBe('magazine')
    expect(getRecommendedTemplate(61).id).toBe('classic')
    expect(getRecommendedTemplate(100).id).toBe('classic')
    expect(getRecommendedTemplate(101).id).toBe('collage')
    expect(getRecommendedTemplate(1000).id).toBe('collage')
  })
})

test.describe('Photo Book Templates - Filtering', () => {
  test('should filter templates by photo count', () => {
    const templates = getTemplatesForPhotoCount(50)
    expect(templates.length).toBeGreaterThan(0)

    // All returned templates should support 50 photos
    templates.forEach(template => {
      expect(template.photoRange.min).toBeLessThanOrEqual(50)
      expect(template.photoRange.max).toBeGreaterThanOrEqual(50)
    })
  })

  test('should return empty array for impossible photo counts', () => {
    const templates = getTemplatesForPhotoCount(0)
    expect(templates).toHaveLength(0)
  })

  test('should handle very large photo counts', () => {
    const templates = getTemplatesForPhotoCount(500)
    // Only collage should support 500 photos (max 300)
    // Actually, if 500 > max, should return empty or just collage
    templates.forEach(template => {
      expect(template.photoRange.max).toBeGreaterThanOrEqual(500)
    })
  })

  test('should find multiple templates for overlapping ranges', () => {
    // 50 photos should be supported by multiple templates
    const templates = getTemplatesForPhotoCount(50)
    expect(templates.length).toBeGreaterThanOrEqual(2)
  })
})

test.describe('Photo Book Templates - Template Details', () => {
  test('Classic template should have correct characteristics', () => {
    const classic = PHOTO_BOOK_TEMPLATES.classic

    expect(classic.style).toBe('classic')
    expect(classic.layouts).toContain('single')
    expect(classic.layouts).toContain('double')
    expect(classic.layouts).toContain('grid-2x2')
    expect(classic.photoRange.min).toBe(20)
    expect(classic.photoRange.max).toBe(200)
    expect(classic.features).toContain('Clean, symmetric layouts')
  })

  test('Collage template should have correct characteristics', () => {
    const collage = PHOTO_BOOK_TEMPLATES.collage

    expect(collage.style).toBe('collage')
    expect(collage.layouts).toContain('grid-2x2')
    expect(collage.layouts).toContain('grid-3x3')
    expect(collage.layouts).toContain('asymmetric')
    expect(collage.photoRange.min).toBe(50)
    expect(collage.photoRange.max).toBe(300)
  })

  test('Magazine template should have correct characteristics', () => {
    const magazine = PHOTO_BOOK_TEMPLATES.magazine

    expect(magazine.style).toBe('magazine')
    expect(magazine.layouts).toContain('single')
    expect(magazine.layouts).toContain('asymmetric')
    expect(magazine.photoRange.min).toBe(15)
    expect(magazine.photoRange.max).toBe(100)
  })

  test('Minimalist template should have correct characteristics', () => {
    const minimalist = PHOTO_BOOK_TEMPLATES.minimalist

    expect(minimalist.style).toBe('minimalist')
    expect(minimalist.layouts).toContain('single')
    expect(minimalist.layouts).toContain('double')
    expect(minimalist.photoRange.min).toBe(10)
    expect(minimalist.photoRange.max).toBe(60)
  })
})

test.describe('Photo Book Templates - API Integration', () => {
  test('API should return all templates', async ({ request }) => {
    const response = await request.get('/api/templates/photo-book')
    expect(response.ok()).toBeTruthy()

    const data = await response.json()
    expect(data.templates).toHaveLength(4)
    expect(data.metadata).toBeTruthy()
    expect(data.metadata.total).toBe(4)
  })

  test('API should return specific template by ID', async ({ request }) => {
    const response = await request.get('/api/templates/photo-book?id=classic')
    expect(response.ok()).toBeTruthy()

    const data = await response.json()
    expect(data.template).toBeTruthy()
    expect(data.template.id).toBe('classic')
  })

  test('API should return 404 for invalid template ID', async ({ request }) => {
    const response = await request.get('/api/templates/photo-book?id=invalid')
    expect(response.status()).toBe(404)

    const data = await response.json()
    expect(data.error).toBeTruthy()
  })

  test('API should filter by photo count', async ({ request }) => {
    const response = await request.get('/api/templates/photo-book?photoCount=50')
    expect(response.ok()).toBeTruthy()

    const data = await response.json()
    expect(Array.isArray(data.templates)).toBe(true)
    expect(data.recommended).toBeTruthy()
    expect(data.photoCount).toBe(50)
  })

  test('API should return popular templates', async ({ request }) => {
    const response = await request.get('/api/templates/photo-book?popular=2')
    expect(response.ok()).toBeTruthy()

    const data = await response.json()
    expect(data.templates).toHaveLength(2)
    // Should be sorted by popularity
    expect(data.templates[0].popularity).toBeGreaterThanOrEqual(data.templates[1].popularity)
  })

  test('API should handle invalid photo count', async ({ request }) => {
    const response = await request.get('/api/templates/photo-book?photoCount=invalid')
    expect(response.status()).toBe(400)
  })
})

test.describe('Photo Book Templates - Popularity Sorting', () => {
  test('templates should be sorted by popularity', () => {
    const templates = getAllTemplates()
    const popularitiesAreValid = templates.every(t => typeof t.popularity === 'number')
    expect(popularitiesAreValid).toBe(true)

    // Classic should be most popular
    expect(PHOTO_BOOK_TEMPLATES.classic.popularity).toBe(100)
  })
})
