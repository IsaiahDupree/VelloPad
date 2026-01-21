'use client'

/**
 * Brand Kit Provider
 *
 * Applies tenant-specific branding (brand kit) to the application.
 * Uses CSS variables to style the app based on tenant configuration.
 */

import { useEffect } from 'react'
import { BrandKit } from '@/lib/tenant/resolver'
import { applyBrandKitToDocument } from '@/lib/tenant/brand-kit'

interface BrandKitProviderProps {
  brandKit: BrandKit
  children: React.ReactNode
}

/**
 * BrandKitProvider component
 * Wraps the app and applies tenant branding via CSS variables
 */
export function BrandKitProvider({ brandKit, children }: BrandKitProviderProps) {
  useEffect(() => {
    // Apply brand kit to document on mount and when brand kit changes
    applyBrandKitToDocument(brandKit)
  }, [brandKit])

  return <>{children}</>
}

/**
 * Hook to get brand kit colors in components
 * Useful for dynamic styling in React components
 */
export function useBrandKit(brandKit: BrandKit) {
  return {
    colors: {
      primary: brandKit.primary_color,
      secondary: brandKit.secondary_color,
      accent: brandKit.accent_color,
      background: brandKit.background_color,
      text: brandKit.text_color,
    },
    fonts: {
      heading: brandKit.heading_font,
      body: brandKit.body_font,
    },
    layout: {
      heroVariant: brandKit.hero_variant,
      sections: brandKit.homepage_sections,
    },
    assets: {
      logo: brandKit.logo_url,
      logoDark: brandKit.logo_dark_url,
      favicon: brandKit.favicon_url,
    },
    tone: brandKit.tone,
    testimonials: brandKit.testimonials || [],
  }
}
