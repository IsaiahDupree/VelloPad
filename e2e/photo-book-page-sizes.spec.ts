/**
 * E2E Tests for Photo Book Page Sizes
 * @see PB-011: Multiple Page Sizes
 */

import { test, expect } from '@playwright/test'
import {
  PHOTO_BOOK_SIZES,
  getAvailablePageSizes,
  getPageSize,
  isSupportedSize,
  getDefaultPageSize,
  formatPageSize
} from '../src/lib/pdf-generator/sizes'

test.describe('PB-011: Multiple Page Sizes', () => {
  test('should support all required page sizes', () => {
    const sizes = getAvailablePageSizes()

    expect(sizes.length).toBe(4)

    // Verify all required sizes exist
    const sizeNames = sizes.map(s => s.name)
    expect(sizeNames).toContain('8x8 Square')
    expect(sizeNames).toContain('10x10 Square')
    expect(sizeNames).toContain('12x12 Square')
    expect(sizeNames).toContain('8x11 Portrait')
  })

  test('should have correct dimensions for 8x8', () => {
    const size = getPageSize('8x8')

    expect(size).toBeDefined()
    expect(size?.width).toBe(8)
    expect(size?.height).toBe(8)
    expect(size?.name).toBe('8x8 Square')
  })

  test('should have correct dimensions for 10x10', () => {
    const size = getPageSize('10x10')

    expect(size).toBeDefined()
    expect(size?.width).toBe(10)
    expect(size?.height).toBe(10)
    expect(size?.name).toBe('10x10 Square')
  })

  test('should have correct dimensions for 12x12', () => {
    const size = getPageSize('12x12')

    expect(size).toBeDefined()
    expect(size?.width).toBe(12)
    expect(size?.height).toBe(12)
    expect(size?.name).toBe('12x12 Square')
  })

  test('should have correct dimensions for 8x11', () => {
    const size = getPageSize('8x11')

    expect(size).toBeDefined()
    expect(size?.width).toBe(8)
    expect(size?.height).toBe(11)
    expect(size?.name).toBe('8x11 Portrait')
  })

  test('should validate supported sizes', () => {
    expect(isSupportedSize('8x8')).toBe(true)
    expect(isSupportedSize('10x10')).toBe(true)
    expect(isSupportedSize('12x12')).toBe(true)
    expect(isSupportedSize('8x11')).toBe(true)
    expect(isSupportedSize('invalid')).toBe(false)
  })

  test('should return default page size', () => {
    const defaultSize = getDefaultPageSize()

    expect(defaultSize).toBeDefined()
    expect(defaultSize.width).toBe(8)
    expect(defaultSize.height).toBe(8)
  })

  test('should format page sizes correctly', () => {
    const size8x8 = getPageSize('8x8')
    expect(formatPageSize(size8x8!)).toBe('8" × 8" (8x8 Square)')

    const size10x10 = getPageSize('10x10')
    expect(formatPageSize(size10x10!)).toBe('10" × 10" (10x10 Square)')

    const size12x12 = getPageSize('12x12')
    expect(formatPageSize(size12x12!)).toBe('12" × 12" (12x12 Square)')

    const size8x11 = getPageSize('8x11')
    expect(formatPageSize(size8x11!)).toBe('8" × 11" (8x11 Portrait)')
  })

  test('should export PHOTO_BOOK_SIZES constant', () => {
    expect(PHOTO_BOOK_SIZES).toBeDefined()
    expect(Object.keys(PHOTO_BOOK_SIZES)).toHaveLength(4)
    expect(PHOTO_BOOK_SIZES['8x8']).toBeDefined()
    expect(PHOTO_BOOK_SIZES['10x10']).toBeDefined()
    expect(PHOTO_BOOK_SIZES['12x12']).toBeDefined()
    expect(PHOTO_BOOK_SIZES['8x11']).toBeDefined()
  })
})
