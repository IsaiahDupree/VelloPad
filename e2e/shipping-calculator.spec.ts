/**
 * E2E Tests for Shipping Calculator
 * @see PB-014: Shipping Calculator
 */

import { test, expect } from '@playwright/test'
import {
  getDomesticShippingMethods,
  getInternationalShippingMethods,
  isDomestic,
  getAvailableShippingMethods,
  formatShippingQuote,
  getShippingMethodName
} from '../src/lib/providers/prodigi/shipping'
import type { ShippingQuote } from '../src/lib/providers/prodigi/shipping'

test.describe('PB-014: Shipping Calculator', () => {
  test('should export shipping calculator functions', () => {
    expect(getDomesticShippingMethods).toBeDefined()
    expect(getInternationalShippingMethods).toBeDefined()
    expect(isDomestic).toBeDefined()
    expect(getAvailableShippingMethods).toBeDefined()
    expect(formatShippingQuote).toBeDefined()
    expect(getShippingMethodName).toBeDefined()
  })

  test('should return domestic shipping methods', () => {
    const methods = getDomesticShippingMethods()

    expect(methods).toBeDefined()
    expect(Array.isArray(methods)).toBe(true)
    expect(methods.length).toBeGreaterThan(0)
    expect(methods).toContain('Standard')
    expect(methods).toContain('Express')
    expect(methods).toContain('Overnight')
  })

  test('should return international shipping methods', () => {
    const methods = getInternationalShippingMethods()

    expect(methods).toBeDefined()
    expect(Array.isArray(methods)).toBe(true)
    expect(methods.length).toBeGreaterThan(0)
    expect(methods).toContain('Budget')
    expect(methods).toContain('Standard')
    expect(methods).toContain('Express')
  })

  test('should identify US as domestic', () => {
    expect(isDomestic('US')).toBe(true)
    expect(isDomestic('us')).toBe(true)
  })

  test('should identify non-US as international', () => {
    expect(isDomestic('GB')).toBe(false)
    expect(isDomestic('CA')).toBe(false)
    expect(isDomestic('DE')).toBe(false)
    expect(isDomestic('FR')).toBe(false)
  })

  test('should get available methods for US', () => {
    const methods = getAvailableShippingMethods('US')

    expect(methods).toEqual(getDomesticShippingMethods())
    expect(methods).toContain('Standard')
    expect(methods).toContain('Express')
    expect(methods).toContain('Overnight')
  })

  test('should get available methods for international', () => {
    const methods = getAvailableShippingMethods('GB')

    expect(methods).toEqual(getInternationalShippingMethods())
    expect(methods).toContain('Budget')
    expect(methods).toContain('Standard')
    expect(methods).toContain('Express')
  })

  test('should format shipping quote correctly', () => {
    const quote: ShippingQuote = {
      method: 'Standard',
      cost: 12.99,
      currency: 'USD',
      estimatedDays: 4,
      description: 'Standard shipping (3-5 business days)'
    }

    const formatted = formatShippingQuote(quote)

    expect(formatted).toContain('Standard')
    expect(formatted).toContain('12.99')
    expect(formatted).toContain('USD')
    expect(formatted).toContain('4 days')
  })

  test('should get shipping method display names', () => {
    expect(getShippingMethodName('Budget')).toContain('Budget')
    expect(getShippingMethodName('Standard')).toContain('Standard')
    expect(getShippingMethodName('Express')).toContain('Express')
    expect(getShippingMethodName('Overnight')).toContain('Overnight')

    expect(getShippingMethodName('Budget')).toContain('5-10 business days')
    expect(getShippingMethodName('Standard')).toContain('3-5 business days')
    expect(getShippingMethodName('Express')).toContain('1-3 business days')
    expect(getShippingMethodName('Overnight')).toContain('next business day')
  })

  test('should support all shipping methods', () => {
    const methods = ['Budget', 'Standard', 'Express', 'Overnight'] as const

    methods.forEach(method => {
      const name = getShippingMethodName(method)
      expect(name).toBeDefined()
      expect(name.length).toBeGreaterThan(0)
    })
  })

  test('shipping quote should have required fields', () => {
    const quote: ShippingQuote = {
      method: 'Standard',
      cost: 12.99,
      currency: 'USD',
      estimatedDays: 4,
      description: 'Standard shipping'
    }

    expect(quote.method).toBe('Standard')
    expect(quote.cost).toBe(12.99)
    expect(quote.currency).toBe('USD')
    expect(quote.estimatedDays).toBe(4)
    expect(quote.description).toBe('Standard shipping')
  })

  test('should handle different currencies', () => {
    const usdQuote: ShippingQuote = {
      method: 'Standard',
      cost: 12.99,
      currency: 'USD',
      description: 'Standard shipping'
    }

    const gbpQuote: ShippingQuote = {
      method: 'Standard',
      cost: 9.99,
      currency: 'GBP',
      description: 'Standard shipping'
    }

    const eurQuote: ShippingQuote = {
      method: 'Standard',
      cost: 11.49,
      currency: 'EUR',
      description: 'Standard shipping'
    }

    expect(formatShippingQuote(usdQuote)).toContain('USD')
    expect(formatShippingQuote(gbpQuote)).toContain('GBP')
    expect(formatShippingQuote(eurQuote)).toContain('EUR')
  })
})
