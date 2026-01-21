/**
 * Brand Kit System
 *
 * Manages tenant-specific branding including:
 * - Colors, fonts, and typography
 * - Logo and visual assets
 * - Homepage layout configuration
 * - Voice and tone settings
 */

import { BrandKit, Tenant } from './resolver'

/**
 * Default brand kit for VelloPad
 * Used as fallback when tenant has no custom branding
 */
export const DEFAULT_BRAND_KIT: BrandKit = {
  // VelloPad brand colors (33/6 Master Teacher numerology)
  primary_color: '#8B5CF6', // Purple - wisdom, creativity
  secondary_color: '#10B981', // Green - growth, harmony
  accent_color: '#F59E0B', // Amber - inspiration, energy
  background_color: '#FFFFFF',
  text_color: '#1F2937',

  // Typography
  heading_font: 'Inter',
  body_font: 'Inter',

  // Homepage
  hero_variant: 'centered',
  homepage_sections: ['hero', 'features', 'testimonials', 'cta'],

  // Voice & Tone
  tone: 'professional',
}

/**
 * Get brand kit for tenant, with fallback to default
 */
export function getBrandKit(tenant: Tenant | null): BrandKit {
  if (!tenant || !tenant.brand_kit) {
    return DEFAULT_BRAND_KIT
  }

  // Merge tenant brand kit with defaults (fill in missing values)
  return {
    ...DEFAULT_BRAND_KIT,
    ...tenant.brand_kit,
  }
}

/**
 * Generate CSS variables from brand kit
 * Used in ThemeProvider to inject tenant-specific styles
 */
export function generateCSSVariables(brandKit: BrandKit): Record<string, string> {
  return {
    '--color-primary': brandKit.primary_color,
    '--color-secondary': brandKit.secondary_color,
    '--color-accent': brandKit.accent_color,
    '--color-background': brandKit.background_color,
    '--color-text': brandKit.text_color,
    '--font-heading': brandKit.heading_font,
    '--font-body': brandKit.body_font,
  }
}

/**
 * Generate CSS string from variables
 */
export function generateCSSString(brandKit: BrandKit): string {
  const variables = generateCSSVariables(brandKit)
  const entries = Object.entries(variables).map(([key, value]) => `${key}: ${value};`)

  return `:root {\n  ${entries.join('\n  ')}\n}`
}

/**
 * Convert brand kit colors to Tailwind config format
 * Useful for dynamic Tailwind configuration
 */
export function brandKitToTailwindColors(brandKit: BrandKit) {
  return {
    primary: brandKit.primary_color,
    secondary: brandKit.secondary_color,
    accent: brandKit.accent_color,
    background: brandKit.background_color,
    text: brandKit.text_color,
  }
}

/**
 * Validate brand kit configuration
 * Returns array of validation errors (empty if valid)
 */
export function validateBrandKit(brandKit: Partial<BrandKit>): string[] {
  const errors: string[] = []

  // Validate colors (hex format)
  const hexColorRegex = /^#[0-9A-Fa-f]{6}$/
  const colorFields = [
    'primary_color',
    'secondary_color',
    'accent_color',
    'background_color',
    'text_color',
  ] as const

  for (const field of colorFields) {
    const value = brandKit[field]
    if (value && !hexColorRegex.test(value)) {
      errors.push(`${field} must be a valid hex color (e.g., #8B5CF6)`)
    }
  }

  // Validate hero variant
  const validHeroVariants = ['centered', 'split', 'minimal', 'bold']
  if (brandKit.hero_variant && !validHeroVariants.includes(brandKit.hero_variant)) {
    errors.push(
      `hero_variant must be one of: ${validHeroVariants.join(', ')}`
    )
  }

  // Validate tone
  const validTones = ['professional', 'friendly', 'inspirational', 'educational']
  if (brandKit.tone && !validTones.includes(brandKit.tone)) {
    errors.push(`tone must be one of: ${validTones.join(', ')}`)
  }

  // Validate URLs
  if (brandKit.logo_url && !isValidURL(brandKit.logo_url)) {
    errors.push('logo_url must be a valid URL')
  }
  if (brandKit.logo_dark_url && !isValidURL(brandKit.logo_dark_url)) {
    errors.push('logo_dark_url must be a valid URL')
  }
  if (brandKit.favicon_url && !isValidURL(brandKit.favicon_url)) {
    errors.push('favicon_url must be a valid URL')
  }

  return errors
}

/**
 * Simple URL validation
 */
function isValidURL(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Get font family string for CSS
 * Handles system fonts and web fonts
 */
export function getFontFamily(fontName: string): string {
  // Common web-safe font stacks
  const fontStacks: Record<string, string> = {
    Inter: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    'Playfair Display': '"Playfair Display", Georgia, serif',
    Montserrat: 'Montserrat, -apple-system, BlinkMacSystemFont, sans-serif',
    Lora: 'Lora, Georgia, serif',
    'Open Sans': '"Open Sans", -apple-system, BlinkMacSystemFont, sans-serif',
    Merriweather: 'Merriweather, Georgia, serif',
    Raleway: 'Raleway, -apple-system, BlinkMacSystemFont, sans-serif',
    'PT Serif': '"PT Serif", Georgia, serif',
  }

  return fontStacks[fontName] || `${fontName}, sans-serif`
}

/**
 * Get available fonts for tenant selection
 */
export function getAvailableFonts() {
  return [
    { name: 'Inter', category: 'sans-serif', description: 'Modern, clean, and highly readable' },
    { name: 'Playfair Display', category: 'serif', description: 'Elegant and sophisticated' },
    { name: 'Montserrat', category: 'sans-serif', description: 'Geometric and contemporary' },
    { name: 'Lora', category: 'serif', description: 'Warm and friendly serif' },
    { name: 'Open Sans', category: 'sans-serif', description: 'Neutral and approachable' },
    { name: 'Merriweather', category: 'serif', description: 'Traditional and trustworthy' },
    { name: 'Raleway', category: 'sans-serif', description: 'Thin and elegant' },
    { name: 'PT Serif', category: 'serif', description: 'Classic and professional' },
  ]
}

/**
 * Get recommended font pairings
 * Returns heading/body combinations that work well together
 */
export function getRecommendedFontPairings() {
  return [
    {
      name: 'Classic Elegance',
      heading: 'Playfair Display',
      body: 'Lora',
    },
    {
      name: 'Modern Professional',
      heading: 'Montserrat',
      body: 'Open Sans',
    },
    {
      name: 'Clean & Minimal',
      heading: 'Inter',
      body: 'Inter',
    },
    {
      name: 'Traditional',
      heading: 'PT Serif',
      body: 'Merriweather',
    },
    {
      name: 'Contemporary',
      heading: 'Raleway',
      body: 'Open Sans',
    },
  ]
}

/**
 * Apply brand kit to document (client-side only)
 * Injects CSS variables and custom CSS
 */
export function applyBrandKitToDocument(brandKit: BrandKit) {
  if (typeof document === 'undefined') {
    return
  }

  // Create or update style element for brand kit variables
  let styleElement = document.getElementById('brand-kit-variables') as HTMLStyleElement
  if (!styleElement) {
    styleElement = document.createElement('style')
    styleElement.id = 'brand-kit-variables'
    document.head.appendChild(styleElement)
  }

  styleElement.textContent = generateCSSString(brandKit)

  // Apply custom CSS if provided
  if (brandKit.custom_css) {
    let customStyleElement = document.getElementById('brand-kit-custom') as HTMLStyleElement
    if (!customStyleElement) {
      customStyleElement = document.createElement('style')
      customStyleElement.id = 'brand-kit-custom'
      document.head.appendChild(customStyleElement)
    }
    customStyleElement.textContent = brandKit.custom_css
  }

  // Update favicon if provided
  if (brandKit.favicon_url) {
    let faviconLink = document.querySelector('link[rel="icon"]') as HTMLLinkElement
    if (!faviconLink) {
      faviconLink = document.createElement('link')
      faviconLink.rel = 'icon'
      document.head.appendChild(faviconLink)
    }
    faviconLink.href = brandKit.favicon_url
  }
}

/**
 * Get tone-based copy suggestions
 * Provides writing guidelines based on tenant's tone
 */
export function getToneCopyGuidelines(tone: BrandKit['tone']): {
  do: string[]
  dont: string[]
  example: string
} {
  const guidelines = {
    professional: {
      do: [
        'Use clear, direct language',
        'Focus on facts and results',
        'Maintain formal but approachable tone',
        'Use industry terminology appropriately',
      ],
      dont: [
        'Use slang or casual expressions',
        'Overuse exclamation points',
        'Make unsupported claims',
        'Use overly complex jargon',
      ],
      example: 'Create professional, print-ready books with our comprehensive publishing platform.',
    },
    friendly: {
      do: [
        'Use conversational language',
        'Address readers directly (you, your)',
        'Show warmth and empathy',
        'Use contractions naturally',
      ],
      dont: [
        'Be overly formal or stiff',
        'Use technical jargon',
        'Sound robotic or corporate',
        'Ignore emotional aspects',
      ],
      example: "You've got a story to tell—we'll help you share it with the world!",
    },
    inspirational: {
      do: [
        'Focus on possibilities and potential',
        'Use uplifting, motivating language',
        'Tell stories of transformation',
        'Emphasize dreams and goals',
      ],
      dont: [
        'Sound preachy or condescending',
        'Make unrealistic promises',
        'Ignore practical details',
        'Use clichés excessively',
      ],
      example: 'Turn your vision into reality. Your book is waiting to inspire the world.',
    },
    educational: {
      do: [
        'Break down complex concepts',
        'Provide clear explanations',
        'Use examples and analogies',
        'Guide readers step-by-step',
      ],
      dont: [
        'Assume too much knowledge',
        'Skip important details',
        'Use unexplained acronyms',
        'Patronize readers',
      ],
      example: 'Learn how to create print-ready PDFs that meet industry standards with our guided workflow.',
    },
  }

  return guidelines[tone]
}
