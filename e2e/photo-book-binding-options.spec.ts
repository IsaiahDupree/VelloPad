/**
 * E2E Tests for Photo Book Binding Options
 * @see PB-012: Binding Options
 */

import { test, expect } from '@playwright/test'
import {
  BINDING_OPTIONS,
  getAvailableBindings,
  getBindingOption,
  getBindingsForPageCount,
  isBindingValidForPages,
  getDefaultBinding,
  compareBindingPrice,
  formatBindingOption
} from '../src/lib/print-options'

test.describe('PB-012: Binding Options', () => {
  test('should support all required binding types', () => {
    const bindings = getAvailableBindings()

    expect(bindings.length).toBe(3)

    // Verify all required bindings exist
    const bindingTypes = bindings.map(b => b.type)
    expect(bindingTypes).toContain('softcover')
    expect(bindingTypes).toContain('hardcover')
    expect(bindingTypes).toContain('layflat')
  })

  test('should have correct softcover configuration', () => {
    const softcover = getBindingOption('softcover')

    expect(softcover).toBeDefined()
    expect(softcover.name).toBe('Softcover')
    expect(softcover.type).toBe('softcover')
    expect(softcover.minPages).toBe(20)
    expect(softcover.maxPages).toBe(200)
    expect(softcover.priceMultiplier).toBe(1.0)
    expect(softcover.availability).toBe('standard')
    expect(softcover.features.length).toBeGreaterThan(0)
  })

  test('should have correct hardcover configuration', () => {
    const hardcover = getBindingOption('hardcover')

    expect(hardcover).toBeDefined()
    expect(hardcover.name).toBe('Hardcover')
    expect(hardcover.type).toBe('hardcover')
    expect(hardcover.minPages).toBe(20)
    expect(hardcover.maxPages).toBe(200)
    expect(hardcover.priceMultiplier).toBe(1.8)
    expect(hardcover.availability).toBe('standard')
    expect(hardcover.features.length).toBeGreaterThan(0)
  })

  test('should have correct layflat configuration', () => {
    const layflat = getBindingOption('layflat')

    expect(layflat).toBeDefined()
    expect(layflat.name).toBe('Layflat')
    expect(layflat.type).toBe('layflat')
    expect(layflat.minPages).toBe(20)
    expect(layflat.maxPages).toBe(120)
    expect(layflat.priceMultiplier).toBe(2.5)
    expect(layflat.availability).toBe('premium')
    expect(layflat.features.length).toBeGreaterThan(0)
  })

  test('should filter bindings by page count', () => {
    // 50 pages - all bindings should be available
    const bindings50 = getBindingsForPageCount(50)
    expect(bindings50.length).toBe(3)

    // 150 pages - layflat should not be available (max 120)
    const bindings150 = getBindingsForPageCount(150)
    expect(bindings150.length).toBe(2)
    expect(bindings150.map(b => b.type)).toContain('softcover')
    expect(bindings150.map(b => b.type)).toContain('hardcover')
    expect(bindings150.map(b => b.type)).not.toContain('layflat')

    // 10 pages - no bindings (below minimum)
    const bindings10 = getBindingsForPageCount(10)
    expect(bindings10.length).toBe(0)
  })

  test('should validate binding for page count', () => {
    // Valid combinations
    expect(isBindingValidForPages('softcover', 50)).toBe(true)
    expect(isBindingValidForPages('hardcover', 50)).toBe(true)
    expect(isBindingValidForPages('layflat', 50)).toBe(true)

    // Invalid - layflat with 150 pages (max 120)
    expect(isBindingValidForPages('layflat', 150)).toBe(false)

    // Invalid - below minimum
    expect(isBindingValidForPages('softcover', 10)).toBe(false)
    expect(isBindingValidForPages('hardcover', 10)).toBe(false)
    expect(isBindingValidForPages('layflat', 10)).toBe(false)

    // Invalid - above maximum
    expect(isBindingValidForPages('softcover', 250)).toBe(false)
    expect(isBindingValidForPages('hardcover', 250)).toBe(false)
  })

  test('should return default binding', () => {
    const defaultBinding = getDefaultBinding()

    expect(defaultBinding).toBeDefined()
    expect(defaultBinding.type).toBe('softcover')
  })

  test('should compare binding prices correctly', () => {
    // Softcover should be cheapest
    expect(compareBindingPrice('softcover', 'hardcover')).toBeLessThan(0)
    expect(compareBindingPrice('softcover', 'layflat')).toBeLessThan(0)

    // Hardcover should be more expensive than softcover
    expect(compareBindingPrice('hardcover', 'softcover')).toBeGreaterThan(0)

    // Layflat should be most expensive
    expect(compareBindingPrice('layflat', 'softcover')).toBeGreaterThan(0)
    expect(compareBindingPrice('layflat', 'hardcover')).toBeGreaterThan(0)
  })

  test('should format binding options correctly', () => {
    const softcover = getBindingOption('softcover')
    const formatted = formatBindingOption(softcover)

    expect(formatted).toContain('Softcover')
    expect(formatted).toContain(softcover.description)
  })

  test('should export BINDING_OPTIONS constant', () => {
    expect(BINDING_OPTIONS).toBeDefined()
    expect(Object.keys(BINDING_OPTIONS)).toHaveLength(3)
    expect(BINDING_OPTIONS.softcover).toBeDefined()
    expect(BINDING_OPTIONS.hardcover).toBeDefined()
    expect(BINDING_OPTIONS.layflat).toBeDefined()
  })

  test('should have premium features for layflat', () => {
    const layflat = getBindingOption('layflat')

    expect(layflat.features).toContain('Pages lay completely flat')
    expect(layflat.features).toContain('No center gutter')
  })

  test('should have affordable softcover', () => {
    const softcover = getBindingOption('softcover')

    expect(softcover.priceMultiplier).toBe(1.0)
    expect(softcover.features.some(f => f.includes('affordable'))).toBe(true)
  })
})
