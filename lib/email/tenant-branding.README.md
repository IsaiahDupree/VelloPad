# Tenant Email Branding (MT-008)

## Overview

The tenant email branding system allows each tenant to customize their email communications with:

- **From Address**: Custom from_name and from_email
- **Reply-To**: Custom reply-to address
- **Header/Footer**: Branded email header and footer templates
- **Colors**: Brand colors applied to emails (primary, button, text, background)
- **Logo**: Tenant logo in email header
- **Custom CSS**: Additional styling for emails

## Architecture

### Data Structure

Email branding configuration is stored in two places:

1. **Tenant table** (`tenants.brand_kit`): Visual brand kit including colors, fonts, logo
2. **Tenant table** (`tenants.email_branding`): Email-specific overrides (JSONB column)

```typescript
interface EmailBranding {
  from_name: string          // "Faith Publishing"
  from_email: string         // "hello@faith.vellopad.com"
  reply_to_email?: string    // "support@faith.vellopad.com"
  sending_domain?: string    // "mail.faith.vellopad.com"
  header_html?: string       // Custom email header
  footer_html?: string       // Custom email footer
  custom_css?: string        // Additional CSS styles
}
```

### Branding Precedence

Email branding is determined by this hierarchy:

1. **Tenant email_branding overrides** (if set)
2. **Tenant brand_kit** (colors, logo, fonts)
3. **Default VelloPad branding** (fallback)

## Usage

### Basic Email Sending with Branding

```typescript
import { applyBrandingToEmail } from '@/lib/email/tenant-branding'

// Apply tenant branding to email
const brandedEmail = await applyBrandingToEmail(
  tenantId,
  'Welcome to Your Platform!',
  '<p>Email content here...</p>'
)

// Send via email provider
await resend.emails.send({
  from: `${brandedEmail.from_name} <${brandedEmail.from_email}>`,
  to: 'user@example.com',
  subject: brandedEmail.subject,
  html: brandedEmail.html,
  text: brandedEmail.text,
  reply_to: brandedEmail.reply_to
})
```

### Integration with Lifecycle Emails

The `LifecycleEmailService` automatically applies tenant branding:

```typescript
import { lifecycleEmailService } from '@/lib/email/lifecycle'

await lifecycleEmailService.sendEmail({
  userId: 'user-123',
  workspaceId: 'workspace-456',
  templateKey: 'activation_nudge',
  toEmail: 'user@example.com',
  variables: { first_name: 'John' },
  tenantId: 'tenant-789' // Tenant branding will be applied
})
```

### Get Email Branding for Preview

```typescript
import { getEmailBranding, previewEmailBranding } from '@/lib/email/tenant-branding'

// Get branding config
const branding = await getEmailBranding(tenantId)

// Generate preview HTML
const previewHtml = previewEmailBranding(branding)
```

## Email Templates

### Header Template

Headers can be customized per tenant. Default behavior:

- Shows tenant logo (if available)
- Falls back to tenant name in brand color
- Centered layout

```html
<div style="text-align: center; padding: 20px 0;">
  <img src="{{logo_url}}" alt="{{tenant_name}}" style="max-height: 48px;" />
</div>
```

### Footer Template

Footers include:

- Copyright notice
- Help/Privacy/Unsubscribe links
- Styled with tenant brand colors

```html
<div style="text-align: center; padding: 20px; color: #6B7280; font-size: 12px;">
  <p>© 2026 {{tenant_name}}. All rights reserved.</p>
  <p>
    <a href="{{base_url}}/help" style="color: {{primary_color}};">Help</a> •
    <a href="{{base_url}}/privacy" style="color: {{primary_color}};">Privacy</a> •
    <a href="{{base_url}}/unsubscribe" style="color: {{primary_color}};">Unsubscribe</a>
  </p>
</div>
```

## Sending Domains

### Default VelloPad Domain

All emails default to `vellopad.com`:

```
from: "VelloPad <hello@vellopad.com>"
```

### Tenant Subdomain

For tenant subdomains (e.g., `faith.vellopad.com`):

```
from: "Faith Publishing <hello@mail.faith.vellopad.com>"
```

### Custom Domain (Future: MT-009)

For custom domains with DNS configuration:

```
from: "Faith Publishing <hello@faithpublishing.com>"
```

**Note**: Feature MT-009 (Subdomain Sending Domains) handles SPF/DKIM/DMARC setup for custom sending domains.

## Database Schema

### Tenants Table Extension

```sql
-- email_branding column (JSONB)
ALTER TABLE tenants
ADD COLUMN email_branding JSONB DEFAULT NULL;

-- Example data
{
  "from_name": "Faith Publishing",
  "from_email": "hello@faith.vellopad.com",
  "reply_to_email": "support@faith.vellopad.com",
  "sending_domain": "mail.faith.vellopad.com",
  "header_html": "<div>...</div>",
  "footer_html": "<div>...</div>",
  "custom_css": ".email-content { font-family: serif; }"
}
```

## Validation

Email branding is validated before saving:

```typescript
import { validateEmailBranding } from '@/lib/email/tenant-branding'

const errors = validateEmailBranding(branding)
// Returns: ["from_email must be a valid email address"]
```

**Validation rules:**
- ✅ Email addresses must be valid format
- ✅ Colors must be hex format (#RRGGBB)
- ✅ URLs must be valid
- ✅ HTML cannot contain `<script>` tags (security)

## CSS Styles

### Email Container

```css
.email-container {
  max-width: 600px;
  margin: 0 auto;
  background-color: {{background_color}};
}
```

### Buttons

```css
.button {
  display: inline-block;
  padding: 12px 24px;
  background-color: {{button_color}};
  color: {{button_text_color}};
  text-decoration: none;
  border-radius: 6px;
}
```

### Links

```css
a {
  color: {{primary_color}};
}
```

## Security

### XSS Prevention

All HTML content is sanitized:

- Custom header/footer HTML cannot contain `<script>` tags
- Variables are escaped when rendering
- Custom CSS is allowed but isolated to email container

### Email Spoofing Prevention

- Sending domains must be verified via DNS (MT-009)
- SPF/DKIM/DMARC records required for custom domains
- Default to verified VelloPad domain until tenant verifies their domain

## Testing

### Preview Email Branding

```typescript
// Generate preview HTML for testing
const previewHtml = previewEmailBranding({
  from_name: 'Test Tenant',
  from_email: 'test@tenant.com',
  primary_color: '#8B5CF6',
  // ... other branding config
})

// View in browser or send test email
```

### Unit Tests

```typescript
// Test email branding application
test('applies tenant branding to email', async () => {
  const branded = await applyBrandingToEmail(
    'tenant-123',
    'Test Subject',
    '<p>Content</p>'
  )

  expect(branded.from_name).toBe('Faith Publishing')
  expect(branded.html).toContain('#8B5CF6') // Brand color
  expect(branded.html).toContain('<img src="logo.png"') // Logo
})
```

## Examples

### Example 1: Default Branding

```typescript
// No tenant specified - uses VelloPad branding
const email = await applyBrandingToEmail(
  null,
  'Welcome!',
  '<p>Welcome to VelloPad</p>'
)
// from: "VelloPad <hello@vellopad.com>"
// Colors: Purple #8B5CF6
```

### Example 2: Faith Publishing Tenant

```typescript
// Faith tenant with custom branding
const email = await applyBrandingToEmail(
  'faith-tenant-id',
  'Your Prayer Journal is Ready',
  '<p>Download your journal PDF</p>'
)
// from: "Faith Publishing <hello@mail.faith.vellopad.com>"
// Colors: Faith brand colors
// Logo: Faith Publishing logo
```

### Example 3: Custom Header/Footer

```typescript
// Tenant with custom email templates
const branding = {
  from_name: 'Christian Books',
  from_email: 'team@christianbooks.com',
  header_html: `
    <div style="background: #003366; padding: 20px; text-align: center;">
      <img src="logo.png" style="height: 40px;" />
      <p style="color: white; margin: 5px 0;">Spreading God's Word</p>
    </div>
  `,
  footer_html: `
    <div style="background: #003366; color: white; padding: 20px; text-align: center;">
      <p>Blessed to serve you!</p>
    </div>
  `
}
```

## Future Enhancements

### MT-009: Subdomain Sending Domains
- DNS configuration for custom sending domains
- SPF/DKIM/DMARC setup automation
- Domain verification workflow

### MT-010: Tenant-Aware Email Sequences
- Different email templates per tenant
- Tenant-specific content and messaging
- A/B testing per tenant

## API Reference

### `getEmailBranding(tenantId)`
Get email branding configuration for tenant.

**Returns**: `Promise<EmailBranding>`

### `applyBrandingToEmail(tenantId, subject, html, text?)`
Apply tenant branding to email content.

**Returns**: `Promise<BrandedEmailTemplate>`

### `wrapEmailWithBranding(html, branding)`
Wrap content HTML with branded header/footer.

**Returns**: `string` (full HTML email)

### `validateEmailBranding(branding)`
Validate email branding configuration.

**Returns**: `string[]` (validation errors)

### `previewEmailBranding(branding)`
Generate preview HTML for testing.

**Returns**: `string` (preview HTML)

### `getSendingDomain(tenant)`
Get appropriate sending domain for tenant.

**Returns**: `string` (domain name)

---

**Feature ID**: MT-008
**Status**: ✅ Complete
**Phase**: 10 (Multi-Tenant Architecture)
**Priority**: P0
**Dependencies**: MT-002 (Tenants Schema), BS-702 (Lifecycle Emails)
