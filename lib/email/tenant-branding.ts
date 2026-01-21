/**
 * Tenant Email Branding
 * Feature: MT-008
 *
 * Per-tenant email customization including:
 * - from_name and from_email
 * - Header/footer templates
 * - Typography and colors
 * - Logo and branding elements
 */

import { createClient } from '@/lib/supabase/server'
import { Tenant, BrandKit } from '@/lib/tenant/resolver'
import { getBrandKit, DEFAULT_BRAND_KIT } from '@/lib/tenant/brand-kit'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Email branding configuration for a tenant
 */
export interface EmailBranding {
  from_name: string
  from_email: string
  reply_to_email?: string
  header_html?: string
  footer_html?: string
  primary_color: string
  text_color: string
  background_color: string
  button_color: string
  button_text_color: string
  logo_url?: string
  custom_css?: string
}

/**
 * Email template with tenant branding applied
 */
export interface BrandedEmailTemplate {
  from_name: string
  from_email: string
  reply_to?: string
  subject: string
  html: string
  text?: string
}

// ============================================================================
// DEFAULT EMAIL BRANDING
// ============================================================================

/**
 * Default VelloPad email branding
 * Used as fallback when tenant has no custom email branding
 */
export const DEFAULT_EMAIL_BRANDING: EmailBranding = {
  from_name: 'VelloPad',
  from_email: 'hello@vellopad.com',
  reply_to_email: 'hello@vellopad.com',
  primary_color: '#8B5CF6', // Purple
  text_color: '#1F2937',
  background_color: '#FFFFFF',
  button_color: '#8B5CF6',
  button_text_color: '#FFFFFF',
  header_html: `
    <div style="text-align: center; padding: 20px 0;">
      <h1 style="color: #8B5CF6; font-size: 24px; margin: 0;">VelloPad</h1>
      <p style="color: #6B7280; font-size: 14px; margin: 5px 0;">Create. Print. Publish.</p>
    </div>
  `,
  footer_html: `
    <div style="text-align: center; padding: 20px; color: #6B7280; font-size: 12px; border-top: 1px solid #E5E7EB;">
      <p>© ${new Date().getFullYear()} VelloPad. All rights reserved.</p>
      <p>
        <a href="https://vellopad.com/help" style="color: #8B5CF6; text-decoration: none;">Help Center</a> •
        <a href="https://vellopad.com/privacy" style="color: #8B5CF6; text-decoration: none;">Privacy</a> •
        <a href="https://vellopad.com/unsubscribe" style="color: #8B5CF6; text-decoration: none;">Unsubscribe</a>
      </p>
    </div>
  `,
}

// ============================================================================
// EMAIL BRANDING SERVICE
// ============================================================================

/**
 * Get email branding for tenant
 * Merges tenant brand kit with email-specific overrides
 */
export async function getEmailBranding(
  tenantId: string | null
): Promise<EmailBranding> {
  if (!tenantId) {
    return DEFAULT_EMAIL_BRANDING
  }

  try {
    const supabase = await createClient()

    // Get tenant with brand kit
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single()

    if (error || !tenant) {
      console.warn(`Tenant ${tenantId} not found, using default branding`)
      return DEFAULT_EMAIL_BRANDING
    }

    // Get brand kit
    const brandKit = getBrandKit(tenant)

    // Build email branding from brand kit and tenant config
    const emailBranding: EmailBranding = {
      // Email addresses (with fallbacks)
      from_name: tenant.email_branding?.from_name || tenant.name || DEFAULT_EMAIL_BRANDING.from_name,
      from_email: tenant.email_branding?.from_email || DEFAULT_EMAIL_BRANDING.from_email,
      reply_to_email: tenant.email_branding?.reply_to_email || tenant.email_branding?.from_email || DEFAULT_EMAIL_BRANDING.reply_to_email,

      // Colors from brand kit
      primary_color: brandKit.primary_color,
      text_color: brandKit.text_color,
      background_color: brandKit.background_color,
      button_color: brandKit.primary_color,
      button_text_color: '#FFFFFF',

      // Logo
      logo_url: brandKit.logo_url,

      // Custom header/footer from tenant config
      header_html: tenant.email_branding?.header_html || generateDefaultHeader(tenant.name, brandKit),
      footer_html: tenant.email_branding?.footer_html || generateDefaultFooter(tenant.name, brandKit, tenant.domains?.[0]),

      // Custom CSS
      custom_css: tenant.email_branding?.custom_css,
    }

    return emailBranding
  } catch (error) {
    console.error('Error fetching email branding:', error)
    return DEFAULT_EMAIL_BRANDING
  }
}

/**
 * Generate default email header from tenant name and brand kit
 */
function generateDefaultHeader(tenantName: string, brandKit: BrandKit): string {
  const logoHtml = brandKit.logo_url
    ? `<img src="${brandKit.logo_url}" alt="${tenantName}" style="max-height: 48px; width: auto;" />`
    : `<h1 style="color: ${brandKit.primary_color}; font-size: 24px; margin: 0; font-family: ${brandKit.heading_font}, sans-serif;">${tenantName}</h1>`

  return `
    <div style="text-align: center; padding: 20px 0;">
      ${logoHtml}
    </div>
  `
}

/**
 * Generate default email footer from tenant info
 */
function generateDefaultFooter(
  tenantName: string,
  brandKit: BrandKit,
  domain?: string
): string {
  const year = new Date().getFullYear()
  const baseUrl = domain ? `https://${domain}` : 'https://vellopad.com'

  return `
    <div style="text-align: center; padding: 20px; color: #6B7280; font-size: 12px; border-top: 1px solid #E5E7EB; font-family: ${brandKit.body_font}, sans-serif;">
      <p style="margin: 5px 0;">© ${year} ${tenantName}. All rights reserved.</p>
      <p style="margin: 5px 0;">
        <a href="${baseUrl}/help" style="color: ${brandKit.primary_color}; text-decoration: none;">Help Center</a> •
        <a href="${baseUrl}/privacy" style="color: ${brandKit.primary_color}; text-decoration: none;">Privacy</a> •
        <a href="${baseUrl}/unsubscribe" style="color: ${brandKit.primary_color}; text-decoration: none;">Unsubscribe</a>
      </p>
    </div>
  `
}

/**
 * Wrap email content with tenant branding
 * Adds header, footer, and applies brand colors
 */
export function wrapEmailWithBranding(
  contentHtml: string,
  branding: EmailBranding
): string {
  const styles = branding.custom_css || ''

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #F9FAFB;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: ${branding.background_color};
    }
    .email-content {
      padding: 20px;
      color: ${branding.text_color};
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: ${branding.button_color};
      color: ${branding.button_text_color};
      text-decoration: none;
      border-radius: 6px;
      font-weight: 500;
    }
    .button:hover {
      opacity: 0.9;
    }
    a {
      color: ${branding.primary_color};
    }
    ${styles}
  </style>
</head>
<body>
  <div class="email-container">
    ${branding.header_html || ''}

    <div class="email-content">
      ${contentHtml}
    </div>

    ${branding.footer_html || ''}
  </div>
</body>
</html>
  `.trim()
}

/**
 * Apply tenant branding to email template
 * Returns ready-to-send email with all branding applied
 */
export async function applyBrandingToEmail(
  tenantId: string | null,
  subject: string,
  contentHtml: string,
  contentText?: string
): Promise<BrandedEmailTemplate> {
  const branding = await getEmailBranding(tenantId)

  return {
    from_name: branding.from_name,
    from_email: branding.from_email,
    reply_to: branding.reply_to_email,
    subject,
    html: wrapEmailWithBranding(contentHtml, branding),
    text: contentText,
  }
}

// ============================================================================
// EMAIL BRANDING VALIDATION
// ============================================================================

/**
 * Validate email branding configuration
 * Returns array of validation errors (empty if valid)
 */
export function validateEmailBranding(branding: Partial<EmailBranding>): string[] {
  const errors: string[] = []

  // Validate email addresses
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  if (branding.from_email && !emailRegex.test(branding.from_email)) {
    errors.push('from_email must be a valid email address')
  }

  if (branding.reply_to_email && !emailRegex.test(branding.reply_to_email)) {
    errors.push('reply_to_email must be a valid email address')
  }

  // Validate colors (hex format)
  const hexColorRegex = /^#[0-9A-Fa-f]{6}$/
  const colorFields = [
    'primary_color',
    'text_color',
    'background_color',
    'button_color',
    'button_text_color',
  ] as const

  for (const field of colorFields) {
    const value = branding[field]
    if (value && !hexColorRegex.test(value)) {
      errors.push(`${field} must be a valid hex color (e.g., #8B5CF6)`)
    }
  }

  // Validate logo URL
  if (branding.logo_url && !isValidURL(branding.logo_url)) {
    errors.push('logo_url must be a valid URL')
  }

  // Validate HTML (basic check - no script tags)
  if (branding.header_html && containsScript(branding.header_html)) {
    errors.push('header_html cannot contain script tags')
  }

  if (branding.footer_html && containsScript(branding.footer_html)) {
    errors.push('footer_html cannot contain script tags')
  }

  return errors
}

/**
 * Check if HTML contains script tags (basic security check)
 */
function containsScript(html: string): boolean {
  return /<script/i.test(html)
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

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get sending domain for tenant
 * Returns domain to use in from_email
 */
export function getSendingDomain(tenant: Tenant | null): string {
  // If tenant has custom sending domain configured
  if (tenant?.email_branding?.sending_domain) {
    return tenant.email_branding.sending_domain
  }

  // If tenant has custom domains, use first one with mail subdomain
  if (tenant?.domains && tenant.domains.length > 0) {
    const primaryDomain = tenant.domains[0]
    if (primaryDomain !== 'vellopad.com') {
      return `mail.${primaryDomain}`
    }
  }

  // Default VelloPad domain
  return 'vellopad.com'
}

/**
 * Format email address with name
 */
export function formatEmailAddress(name: string, email: string): string {
  return `${name} <${email}>`
}

/**
 * Preview email branding
 * Returns sample HTML to preview branding
 */
export function previewEmailBranding(branding: EmailBranding): string {
  const sampleContent = `
    <h2 style="color: ${branding.primary_color}; margin-top: 0;">Welcome to Your Platform!</h2>
    <p>This is a preview of how your emails will look with your custom branding.</p>
    <p>Here's a sample paragraph with some <a href="#">linked text</a> to show how links appear.</p>
    <p style="text-align: center; margin: 30px 0;">
      <a href="#" class="button">Sample Button</a>
    </p>
    <p>Your emails will include your logo, colors, and custom messaging to match your brand.</p>
  `

  return wrapEmailWithBranding(sampleContent, branding)
}
