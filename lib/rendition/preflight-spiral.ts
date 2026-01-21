/**
 * Spiral Binding Preflight Checks
 * Feature: PM-007
 *
 * Validates margins near spiral edge, bleed zones, and DPI for spiral-bound notebooks
 * Spiral binding has specific requirements due to the holes punched along the binding edge
 */

import type { PreflightCheck, PreflightWarning } from './preflight'

/**
 * Spiral binding configuration
 */
export interface SpiralBindingConfig {
  // Binding specifications
  bindingType: 'spiral' | 'coil' | 'wire-o'
  wireSize: '3:1' | '2:1'  // Wire pitch (holes per inch)
  bindingEdge: 'left' | 'right' | 'top'

  // Page specifications
  pageSize: string  // e.g., '6x9', '8.5x11'
  pageCount: number
  orientation: 'portrait' | 'landscape'

  // Margin requirements (in inches)
  minimumBindingMargin: number  // Minimum margin on binding edge
  minimumSafeZone: number       // Safe zone for content away from holes
  recommendedMargin: number     // Recommended margin for best results

  // Quality requirements
  minimumDPI: number
  requiresBleed: boolean
  bleedSize: string  // e.g., '0.125in'
}

/**
 * Default spiral binding configuration
 */
export const DEFAULT_SPIRAL_CONFIG: SpiralBindingConfig = {
  bindingType: 'spiral',
  wireSize: '3:1',
  bindingEdge: 'left',
  pageSize: '6x9',
  pageCount: 100,
  orientation: 'portrait',
  minimumBindingMargin: 0.5,    // 0.5" minimum
  minimumSafeZone: 0.625,       // 0.625" safe zone
  recommendedMargin: 0.75,      // 0.75" recommended
  minimumDPI: 300,
  requiresBleed: true,
  bleedSize: '0.125in'
}

/**
 * Get spiral binding configuration for page size
 */
export function getSpiralConfigForPageSize(
  pageSize: string,
  bindingType: 'spiral' | 'coil' | 'wire-o' = 'spiral'
): SpiralBindingConfig {
  const config = { ...DEFAULT_SPIRAL_CONFIG, bindingType, pageSize }

  // Adjust margins based on page size
  switch (pageSize) {
    case '5.5x8.5':
      config.minimumBindingMargin = 0.5
      config.recommendedMargin = 0.625
      break
    case '6x9':
      config.minimumBindingMargin = 0.5
      config.recommendedMargin = 0.75
      break
    case '8.5x11':
      config.minimumBindingMargin = 0.625
      config.recommendedMargin = 0.875
      break
    case 'A4':
      config.minimumBindingMargin = 15  // mm
      config.recommendedMargin = 20     // mm
      break
    case 'A5':
      config.minimumBindingMargin = 12  // mm
      config.recommendedMargin = 16     // mm
      break
  }

  return config
}

/**
 * Parse page size to dimensions (in inches)
 */
function parsePageSize(pageSize: string): { width: number; height: number } {
  const parts = pageSize.toLowerCase().split('x')

  if (parts.length === 2) {
    return {
      width: parseFloat(parts[0]),
      height: parseFloat(parts[1])
    }
  }

  // Standard sizes
  const standardSizes: Record<string, { width: number; height: number }> = {
    'a4': { width: 8.27, height: 11.69 },
    'a5': { width: 5.83, height: 8.27 },
    'letter': { width: 8.5, height: 11 },
    'legal': { width: 8.5, height: 14 }
  }

  return standardSizes[pageSize.toLowerCase()] || { width: 6, height: 9 }
}

/**
 * Check binding margin requirements
 */
export function checkBindingMargin(config: SpiralBindingConfig): PreflightCheck {
  const warnings: PreflightWarning[] = []
  const errors: PreflightWarning[] = []

  const dimensions = parsePageSize(config.pageSize)
  const bindingEdgeDimension = config.bindingEdge === 'top' || config.bindingEdge === 'bottom'
    ? dimensions.height
    : dimensions.width

  // Check if page size is suitable for spiral binding
  if (bindingEdgeDimension < 5) {
    warnings.push({
      type: 'margins',
      message: `Page size ${config.pageSize} may be too small for spiral binding`,
      severity: 'medium',
      details: {
        pageSize: config.pageSize,
        bindingEdge: config.bindingEdge,
        dimension: bindingEdgeDimension
      }
    })
  }

  // Warning if minimum margin is less than recommended
  if (config.minimumBindingMargin < config.recommendedMargin) {
    warnings.push({
      type: 'margins',
      message: `Binding margin (${config.minimumBindingMargin}") is less than recommended (${config.recommendedMargin}")`,
      severity: 'low',
      details: {
        minimum: config.minimumBindingMargin,
        recommended: config.recommendedMargin,
        bindingEdge: config.bindingEdge
      }
    })
  }

  // Error if margin is critically small
  if (config.minimumBindingMargin < 0.375) {
    errors.push({
      type: 'margins',
      message: `Binding margin (${config.minimumBindingMargin}") is too small, content will be obscured by spiral holes`,
      severity: 'high',
      location: `${config.bindingEdge} edge`,
      details: {
        minimum: config.minimumBindingMargin,
        required: 0.375
      }
    })
  }

  return {
    name: 'Binding Margin Check',
    passed: errors.length === 0,
    warnings,
    errors
  }
}

/**
 * Check bleed requirements for spiral binding
 */
export function checkBleedZones(config: SpiralBindingConfig): PreflightCheck {
  const warnings: PreflightWarning[] = []
  const errors: PreflightWarning[] = []

  if (!config.requiresBleed) {
    warnings.push({
      type: 'bleed',
      message: 'Bleed is not configured but recommended for spiral binding',
      severity: 'low',
      details: {
        recommendedBleed: '0.125in'
      }
    })
  }

  // Check bleed size
  const bleedSize = parseFloat(config.bleedSize)
  if (bleedSize < 0.125) {
    warnings.push({
      type: 'bleed',
      message: `Bleed size (${config.bleedSize}) is less than recommended (0.125")`,
      severity: 'medium',
      details: {
        current: config.bleedSize,
        recommended: '0.125in'
      }
    })
  }

  // Bleed is critical on binding edge for spiral
  if (config.bindingEdge && bleedSize === 0) {
    errors.push({
      type: 'bleed',
      message: `Bleed is required on ${config.bindingEdge} edge for spiral binding`,
      severity: 'high',
      location: `${config.bindingEdge} edge`,
      details: {
        bindingEdge: config.bindingEdge,
        required: '0.125in'
      }
    })
  }

  return {
    name: 'Bleed Zone Check',
    passed: errors.length === 0,
    warnings,
    errors
  }
}

/**
 * Check DPI requirements for spiral binding
 */
export function checkDPIRequirements(
  config: SpiralBindingConfig,
  imageDPI: number
): PreflightCheck {
  const warnings: PreflightWarning[] = []
  const errors: PreflightWarning[] = []

  // Check if DPI meets minimum
  if (imageDPI < config.minimumDPI) {
    if (imageDPI < 150) {
      errors.push({
        type: 'image_dpi',
        message: `Image DPI (${imageDPI}) is critically low, print quality will be very poor`,
        severity: 'high',
        details: {
          currentDPI: imageDPI,
          minimumDPI: config.minimumDPI,
          recommended: 300
        }
      })
    } else {
      warnings.push({
        type: 'image_dpi',
        message: `Image DPI (${imageDPI}) is below recommended (${config.minimumDPI})`,
        severity: 'medium',
        details: {
          currentDPI: imageDPI,
          minimumDPI: config.minimumDPI
        }
      })
    }
  }

  return {
    name: 'DPI Requirements Check',
    passed: errors.length === 0,
    warnings,
    errors
  }
}

/**
 * Check wire size compatibility with page count
 */
export function checkWireSizeCompatibility(config: SpiralBindingConfig): PreflightCheck {
  const warnings: PreflightWarning[] = []
  const errors: PreflightWarning[] = []

  // Wire size recommendations based on page count
  const wireSizeRecommendations: Record<string, { min: number, max: number, diameter: string }> = {
    '3:1': { min: 20, max: 120, diameter: '0.25"-0.5"' },
    '2:1': { min: 80, max: 250, diameter: '0.5"-1"' }
  }

  const recommendation = wireSizeRecommendations[config.wireSize]

  if (config.pageCount < recommendation.min) {
    warnings.push({
      type: 'margins',
      message: `Page count (${config.pageCount}) is low for ${config.wireSize} wire, consider smaller wire`,
      severity: 'low',
      details: {
        pageCount: config.pageCount,
        wireSize: config.wireSize,
        recommended: recommendation
      }
    })
  }

  if (config.pageCount > recommendation.max) {
    errors.push({
      type: 'margins',
      message: `Page count (${config.pageCount}) exceeds maximum for ${config.wireSize} wire (${recommendation.max})`,
      severity: 'high',
      details: {
        pageCount: config.pageCount,
        wireSize: config.wireSize,
        maximum: recommendation.max,
        suggestion: 'Use larger wire size or reduce page count'
      }
    })
  }

  return {
    name: 'Wire Size Compatibility Check',
    passed: errors.length === 0,
    warnings,
    errors
  }
}

/**
 * Check content positioning in safe zone
 */
export function checkSafeZone(
  config: SpiralBindingConfig,
  contentMargins: { top: number, bottom: number, left: number, right: number }
): PreflightCheck {
  const warnings: PreflightWarning[] = []
  const errors: PreflightWarning[] = []

  // Determine which margin to check based on binding edge
  let relevantMargin: number
  let edge: string

  switch (config.bindingEdge) {
    case 'left':
      relevantMargin = contentMargins.left
      edge = 'left'
      break
    case 'right':
      relevantMargin = contentMargins.right
      edge = 'right'
      break
    case 'top':
      relevantMargin = contentMargins.top
      edge = 'top'
      break
    default:
      relevantMargin = contentMargins.left
      edge = 'left'
  }

  // Check if content is in safe zone
  if (relevantMargin < config.minimumSafeZone) {
    if (relevantMargin < config.minimumBindingMargin) {
      errors.push({
        type: 'margins',
        message: `Content is too close to ${edge} edge (${relevantMargin}"), will be obscured by spiral holes`,
        severity: 'high',
        location: `${edge} margin`,
        details: {
          currentMargin: relevantMargin,
          minimumRequired: config.minimumBindingMargin,
          safeZone: config.minimumSafeZone
        }
      })
    } else {
      warnings.push({
        type: 'margins',
        message: `Content is close to ${edge} edge (${relevantMargin}"), recommend ${config.minimumSafeZone}" for safe zone`,
        severity: 'medium',
        location: `${edge} margin`,
        details: {
          currentMargin: relevantMargin,
          recommendedSafeZone: config.minimumSafeZone
        }
      })
    }
  }

  return {
    name: 'Safe Zone Check',
    passed: errors.length === 0,
    warnings,
    errors
  }
}

/**
 * Run all spiral binding preflight checks
 */
export function runSpiralPreflightChecks(params: {
  config: SpiralBindingConfig
  imageDPI?: number
  contentMargins?: { top: number, bottom: number, left: number, right: number }
}): PreflightCheck[] {
  const checks: PreflightCheck[] = []

  // Run all checks
  checks.push(checkBindingMargin(params.config))
  checks.push(checkBleedZones(params.config))
  checks.push(checkWireSizeCompatibility(params.config))

  if (params.imageDPI) {
    checks.push(checkDPIRequirements(params.config, params.imageDPI))
  }

  if (params.contentMargins) {
    checks.push(checkSafeZone(params.config, params.contentMargins))
  }

  return checks
}

/**
 * Get preflight summary from checks
 */
export function getSpiralPreflightSummary(checks: PreflightCheck[]): {
  passed: boolean
  totalErrors: number
  totalWarnings: number
  criticalIssues: string[]
} {
  let totalErrors = 0
  let totalWarnings = 0
  const criticalIssues: string[] = []

  for (const check of checks) {
    totalErrors += check.errors.length
    totalWarnings += check.warnings.length

    // Collect critical issues (high severity errors)
    for (const error of check.errors) {
      if (error.severity === 'high') {
        criticalIssues.push(error.message)
      }
    }
  }

  return {
    passed: totalErrors === 0,
    totalErrors,
    totalWarnings,
    criticalIssues
  }
}

/**
 * Validate spiral binding configuration
 */
export function validateSpiralConfig(config: Partial<SpiralBindingConfig>): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!config.bindingType) {
    errors.push('Binding type is required')
  }

  if (!config.pageSize) {
    errors.push('Page size is required')
  }

  if (!config.pageCount || config.pageCount < 1) {
    errors.push('Valid page count is required')
  }

  if (!config.bindingEdge) {
    errors.push('Binding edge is required')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}
