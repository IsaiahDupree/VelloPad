/**
 * Print Options Module
 * Binding and finishing options for photo books
 *
 * @module print-options
 * @see PB-012: Binding Options
 */

import { BindingType } from '../pdf-generator/types'

/**
 * Binding option with metadata
 */
export interface BindingOption {
  type: BindingType
  name: string
  description: string
  features: string[]
  minPages: number
  maxPages: number
  priceMultiplier: number // Relative to softcover (1.0)
  availability: 'standard' | 'premium' | 'custom'
}

/**
 * All available binding options
 */
export const BINDING_OPTIONS: Record<BindingType, BindingOption> = {
  softcover: {
    type: 'softcover',
    name: 'Softcover',
    description: 'Durable perfect binding with flexible cover',
    features: [
      'Perfect binding',
      'Flexible cover',
      'Most affordable option',
      'Best for everyday use'
    ],
    minPages: 20,
    maxPages: 200,
    priceMultiplier: 1.0,
    availability: 'standard'
  },
  hardcover: {
    type: 'hardcover',
    name: 'Hardcover',
    description: 'Premium case-bound with rigid cover for lasting durability',
    features: [
      'Case-bound with rigid cover',
      'Premium quality',
      'Professional presentation',
      'Ideal for keepsakes and gifts'
    ],
    minPages: 20,
    maxPages: 200,
    priceMultiplier: 1.8,
    availability: 'standard'
  },
  layflat: {
    type: 'layflat',
    name: 'Layflat',
    description: 'Premium binding that lays completely flat when opened',
    features: [
      'Pages lay completely flat',
      'No center gutter',
      'Perfect for panoramic spreads',
      'Premium wedding and portfolio albums'
    ],
    minPages: 20,
    maxPages: 120,
    priceMultiplier: 2.5,
    availability: 'premium'
  }
}

/**
 * Get all available binding options
 */
export function getAvailableBindings(): BindingOption[] {
  return Object.values(BINDING_OPTIONS)
}

/**
 * Get binding option by type
 */
export function getBindingOption(type: BindingType): BindingOption {
  return BINDING_OPTIONS[type]
}

/**
 * Get binding options suitable for a given page count
 */
export function getBindingsForPageCount(pageCount: number): BindingOption[] {
  return Object.values(BINDING_OPTIONS).filter(
    option => pageCount >= option.minPages && pageCount <= option.maxPages
  )
}

/**
 * Validate if a binding type is supported for given page count
 */
export function isBindingValidForPages(
  binding: BindingType,
  pageCount: number
): boolean {
  const option = BINDING_OPTIONS[binding]
  return pageCount >= option.minPages && pageCount <= option.maxPages
}

/**
 * Get default binding option
 */
export function getDefaultBinding(): BindingOption {
  return BINDING_OPTIONS.softcover
}

/**
 * Compare binding options
 */
export function compareBindingPrice(a: BindingType, b: BindingType): number {
  return BINDING_OPTIONS[a].priceMultiplier - BINDING_OPTIONS[b].priceMultiplier
}

/**
 * Format binding option for display
 */
export function formatBindingOption(binding: BindingOption): string {
  return `${binding.name} - ${binding.description}`
}
