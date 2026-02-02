/**
 * Brand Kit System
 * Feature: PB-038
 *
 * Save and apply brand logos, colors, and fonts across photo books
 * Enables consistent branding for businesses, photographers, and agencies
 */

/**
 * Brand Kit Color
 */
export interface BrandColor {
  name: string
  hex: string
  role: 'primary' | 'secondary' | 'accent' | 'text' | 'background' | 'custom'
}

/**
 * Brand Kit Font
 */
export interface BrandFont {
  name: string
  family: string // Font family name (e.g., 'Roboto', 'Open Sans')
  variants: string[] // Available variants (e.g., ['400', '700', '400italic'])
  category: 'serif' | 'sans-serif' | 'monospace' | 'display' | 'handwriting'
  source: 'google' | 'custom' | 'system'
  url?: string // For custom fonts
}

/**
 * Brand Kit Logo
 */
export interface BrandLogo {
  id: string
  name: string
  type: 'primary' | 'secondary' | 'icon' | 'wordmark'
  url: string // Storage URL
  width: number
  height: number
  format: 'png' | 'svg' | 'jpg'
  backgroundColor?: string // For transparent logos
}

/**
 * Brand Kit
 */
export interface BrandKit {
  id: string
  userId: string
  workspaceId?: string
  name: string
  description?: string

  // Visual identity
  logos: BrandLogo[]
  colors: BrandColor[]
  fonts: BrandFont[]

  // Typography settings
  typography?: {
    headingFont: string // Font family name
    bodyFont: string
    defaultFontSize: number
    lineHeight: number
    letterSpacing?: number
  }

  // Layout preferences
  layout?: {
    defaultMargin: number // in mm or inches
    defaultPadding: number
    defaultSpacing: number
    preferredAlignment: 'left' | 'center' | 'right' | 'justify'
  }

  // Metadata
  isDefault: boolean
  isPublic: boolean // Allow sharing with team
  createdAt: string
  updatedAt: string
}

/**
 * Brand Kit Application Settings
 * Defines which elements to apply from a brand kit
 */
export interface BrandKitApplication {
  applyColors: boolean
  applyFonts: boolean
  applyLogos: boolean
  applyTypography: boolean
  applyLayout: boolean

  // Specific overrides
  colorMapping?: {
    [role: string]: string // Map role to hex color
  }
  fontMapping?: {
    heading?: string
    body?: string
    caption?: string
  }
  logoPlacement?: {
    position: 'header' | 'footer' | 'corner' | 'custom'
    size: 'small' | 'medium' | 'large'
    logoId: string
  }
}

/**
 * Default brand kit templates
 */
export const DEFAULT_BRAND_KITS: Partial<BrandKit>[] = [
  {
    name: 'Modern Minimal',
    colors: [
      { name: 'Black', hex: '#000000', role: 'text' },
      { name: 'White', hex: '#FFFFFF', role: 'background' },
      { name: 'Gray', hex: '#6B7280', role: 'secondary' },
    ],
    fonts: [
      {
        name: 'Helvetica',
        family: 'Helvetica, Arial, sans-serif',
        variants: ['400', '700'],
        category: 'sans-serif',
        source: 'system',
      },
    ],
    typography: {
      headingFont: 'Helvetica',
      bodyFont: 'Helvetica',
      defaultFontSize: 12,
      lineHeight: 1.5,
    },
  },
  {
    name: 'Elegant Classic',
    colors: [
      { name: 'Navy', hex: '#1E293B', role: 'primary' },
      { name: 'Gold', hex: '#D4AF37', role: 'accent' },
      { name: 'Cream', hex: '#F8F6F1', role: 'background' },
      { name: 'Charcoal', hex: '#374151', role: 'text' },
    ],
    fonts: [
      {
        name: 'Playfair Display',
        family: 'Playfair Display',
        variants: ['400', '700'],
        category: 'serif',
        source: 'google',
      },
      {
        name: 'Lato',
        family: 'Lato',
        variants: ['400', '700'],
        category: 'sans-serif',
        source: 'google',
      },
    ],
    typography: {
      headingFont: 'Playfair Display',
      bodyFont: 'Lato',
      defaultFontSize: 11,
      lineHeight: 1.6,
    },
  },
  {
    name: 'Bold & Vibrant',
    colors: [
      { name: 'Electric Blue', hex: '#3B82F6', role: 'primary' },
      { name: 'Hot Pink', hex: '#EC4899', role: 'accent' },
      { name: 'Deep Purple', hex: '#7C3AED', role: 'secondary' },
      { name: 'White', hex: '#FFFFFF', role: 'background' },
      { name: 'Black', hex: '#111827', role: 'text' },
    ],
    fonts: [
      {
        name: 'Montserrat',
        family: 'Montserrat',
        variants: ['400', '600', '700', '800'],
        category: 'sans-serif',
        source: 'google',
      },
    ],
    typography: {
      headingFont: 'Montserrat',
      bodyFont: 'Montserrat',
      defaultFontSize: 10,
      lineHeight: 1.4,
      letterSpacing: 0.5,
    },
  },
]

/**
 * Brand Kit Service
 */
export class BrandKitService {
  /**
   * Create a new brand kit
   */
  static async create(
    brandKit: Omit<BrandKit, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<BrandKit> {
    // TODO: Implement with Supabase
    const id = `brand-kit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const now = new Date().toISOString()

    return {
      ...brandKit,
      id,
      createdAt: now,
      updatedAt: now,
    }
  }

  /**
   * Get brand kit by ID
   */
  static async getById(id: string): Promise<BrandKit | null> {
    // TODO: Implement with Supabase
    return null
  }

  /**
   * List brand kits for a user
   */
  static async listForUser(userId: string): Promise<BrandKit[]> {
    // TODO: Implement with Supabase
    return []
  }

  /**
   * List brand kits for a workspace
   */
  static async listForWorkspace(workspaceId: string): Promise<BrandKit[]> {
    // TODO: Implement with Supabase
    return []
  }

  /**
   * Update brand kit
   */
  static async update(
    id: string,
    updates: Partial<Omit<BrandKit, 'id' | 'createdAt'>>
  ): Promise<BrandKit> {
    // TODO: Implement with Supabase
    const brandKit = await this.getById(id)
    if (!brandKit) {
      throw new Error(`Brand kit not found: ${id}`)
    }

    return {
      ...brandKit,
      ...updates,
      updatedAt: new Date().toISOString(),
    }
  }

  /**
   * Delete brand kit
   */
  static async delete(id: string): Promise<void> {
    // TODO: Implement with Supabase
  }

  /**
   * Set as default brand kit for user
   */
  static async setAsDefault(userId: string, brandKitId: string): Promise<void> {
    // Unset current default
    const currentKits = await this.listForUser(userId)
    for (const kit of currentKits) {
      if (kit.isDefault && kit.id !== brandKitId) {
        await this.update(kit.id, { isDefault: false })
      }
    }

    // Set new default
    await this.update(brandKitId, { isDefault: true })
  }

  /**
   * Get default brand kit for user
   */
  static async getDefault(userId: string): Promise<BrandKit | null> {
    const kits = await this.listForUser(userId)
    return kits.find(kit => kit.isDefault) || kits[0] || null
  }

  /**
   * Apply brand kit to photo book page
   */
  static applyToPage(
    brandKit: BrandKit,
    page: any, // Page data structure
    application: BrandKitApplication
  ): any {
    const updatedPage = { ...page }

    // Apply colors
    if (application.applyColors && brandKit.colors) {
      const colorMapping = application.colorMapping || {}

      // Map colors by role
      brandKit.colors.forEach(color => {
        if (colorMapping[color.role]) {
          // Apply specific mapping
          colorMapping[color.role] = color.hex
        }
      })

      // Update page text elements with new colors
      if (updatedPage.textOverlays) {
        updatedPage.textOverlays = updatedPage.textOverlays.map((overlay: any) => {
          const primaryColor = brandKit.colors.find(c => c.role === 'primary')
          const textColor = brandKit.colors.find(c => c.role === 'text')

          return {
            ...overlay,
            color: overlay.type === 'caption' ? textColor?.hex : primaryColor?.hex,
          }
        })
      }
    }

    // Apply fonts
    if (application.applyFonts && brandKit.fonts && brandKit.typography) {
      const fontMapping = application.fontMapping || {}

      if (updatedPage.textOverlays) {
        updatedPage.textOverlays = updatedPage.textOverlays.map((overlay: any) => {
          let fontFamily = overlay.fontFamily

          // Determine font based on text type
          if (overlay.type === 'caption' || overlay.type === 'quote') {
            fontFamily =
              fontMapping.body ||
              brandKit.typography?.bodyFont ||
              brandKit.fonts[0]?.family
          } else if (overlay.type === 'date') {
            fontFamily =
              fontMapping.caption ||
              brandKit.typography?.bodyFont ||
              brandKit.fonts[0]?.family
          }

          return {
            ...overlay,
            fontFamily,
            fontSize: overlay.fontSize || brandKit.typography?.defaultFontSize || 12,
          }
        })
      }
    }

    // Apply logo
    if (application.applyLogos && application.logoPlacement && brandKit.logos) {
      const logo = brandKit.logos.find(l => l.id === application.logoPlacement!.logoId)

      if (logo) {
        // Determine logo position based on placement setting
        let x = 0.5,
          y = 0.05,
          width = 0.2

        switch (application.logoPlacement.position) {
          case 'header':
            x = 0.5
            y = 0.05
            break
          case 'footer':
            x = 0.5
            y = 0.95
            break
          case 'corner':
            x = 0.9
            y = 0.05
            width = 0.1
            break
        }

        // Adjust size
        switch (application.logoPlacement.size) {
          case 'small':
            width *= 0.5
            break
          case 'large':
            width *= 1.5
            break
        }

        // Add logo as image overlay
        if (!updatedPage.imageOverlays) {
          updatedPage.imageOverlays = []
        }

        updatedPage.imageOverlays.push({
          id: `logo-${logo.id}`,
          url: logo.url,
          x,
          y,
          width,
          height: width * (logo.height / logo.width), // Maintain aspect ratio
          zIndex: 1000, // Logos on top
        })
      }
    }

    // Apply layout settings
    if (application.applyLayout && brandKit.layout) {
      updatedPage.layout = {
        ...updatedPage.layout,
        margin: brandKit.layout.defaultMargin,
        padding: brandKit.layout.defaultPadding,
        spacing: brandKit.layout.defaultSpacing,
      }

      // Update text alignment if specified
      if (updatedPage.textOverlays && brandKit.layout.preferredAlignment) {
        updatedPage.textOverlays = updatedPage.textOverlays.map((overlay: any) => ({
          ...overlay,
          textAlign: overlay.textAlign || brandKit.layout!.preferredAlignment,
        }))
      }
    }

    return updatedPage
  }

  /**
   * Extract brand kit from existing photo book
   * Useful for creating a brand kit based on a completed project
   */
  static extractFromPhotoBook(photoBook: any): Partial<BrandKit> {
    const colors = new Set<string>()
    const fonts = new Set<string>()

    // Analyze all pages
    if (photoBook.pages) {
      photoBook.pages.forEach((page: any) => {
        // Extract colors from text overlays
        if (page.textOverlays) {
          page.textOverlays.forEach((overlay: any) => {
            if (overlay.color) colors.add(overlay.color)
            if (overlay.backgroundColor) colors.add(overlay.backgroundColor)
            if (overlay.fontFamily) fonts.add(overlay.fontFamily)
          })
        }
      })
    }

    // Convert to brand kit format
    const brandColors: BrandColor[] = Array.from(colors).map((hex, index) => ({
      name: `Color ${index + 1}`,
      hex,
      role: index === 0 ? 'primary' : 'custom',
    }))

    const brandFonts: BrandFont[] = Array.from(fonts).map(family => ({
      name: family,
      family,
      variants: ['400', '700'],
      category: 'sans-serif' as const,
      source: 'system' as const,
    }))

    return {
      name: `${photoBook.title || 'Untitled'} Brand Kit`,
      colors: brandColors,
      fonts: brandFonts,
    }
  }

  /**
   * Validate brand kit
   */
  static validate(brandKit: Partial<BrandKit>): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!brandKit.name || brandKit.name.trim() === '') {
      errors.push('Brand kit name is required')
    }

    if (!brandKit.colors || brandKit.colors.length === 0) {
      errors.push('At least one color is required')
    }

    if (!brandKit.fonts || brandKit.fonts.length === 0) {
      errors.push('At least one font is required')
    }

    // Validate color hex codes
    if (brandKit.colors) {
      brandKit.colors.forEach(color => {
        if (!/^#[0-9A-F]{6}$/i.test(color.hex)) {
          errors.push(`Invalid hex color: ${color.hex}`)
        }
      })
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }
}

/**
 * Generate CSS variables from brand kit
 * Useful for applying brand kit to web pages
 */
export function brandKitToCSSVariables(brandKit: BrandKit): Record<string, string> {
  const cssVars: Record<string, string> = {}

  // Colors
  brandKit.colors.forEach(color => {
    const varName = `--brand-${color.role.replace('_', '-')}`
    cssVars[varName] = color.hex
  })

  // Fonts
  if (brandKit.typography) {
    cssVars['--brand-font-heading'] = brandKit.typography.headingFont
    cssVars['--brand-font-body'] = brandKit.typography.bodyFont
    cssVars['--brand-font-size'] = `${brandKit.typography.defaultFontSize}pt`
    cssVars['--brand-line-height'] = brandKit.typography.lineHeight.toString()

    if (brandKit.typography.letterSpacing) {
      cssVars['--brand-letter-spacing'] = `${brandKit.typography.letterSpacing}px`
    }
  }

  // Layout
  if (brandKit.layout) {
    cssVars['--brand-margin'] = `${brandKit.layout.defaultMargin}mm`
    cssVars['--brand-padding'] = `${brandKit.layout.defaultPadding}mm`
    cssVars['--brand-spacing'] = `${brandKit.layout.defaultSpacing}mm`
  }

  return cssVars
}

/**
 * Export brand kit to JSON
 */
export function exportBrandKit(brandKit: BrandKit): string {
  return JSON.stringify(brandKit, null, 2)
}

/**
 * Import brand kit from JSON
 */
export function importBrandKit(json: string): BrandKit {
  const brandKit = JSON.parse(json) as BrandKit

  // Validate
  const validation = BrandKitService.validate(brandKit)
  if (!validation.valid) {
    throw new Error(`Invalid brand kit: ${validation.errors.join(', ')}`)
  }

  return brandKit
}
