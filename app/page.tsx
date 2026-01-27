import { headers } from 'next/headers'
import { getTenantById } from '@/lib/tenant/resolver'
import { getBrandKit } from '@/lib/tenant/brand-kit'
import { TenantHomepage } from '@/components/storefront/TenantHomepage'
import { LandingPage } from '@/components/homepage/LandingPage'

/**
 * Homepage - Tenant-aware with Acquisition Tracking
 * Feature: TRACK-002 - Acquisition Event Tracking
 *
 * Shows different content based on the tenant (subdomain or custom domain)
 */
export default async function HomePage() {
  // Get tenant from middleware headers
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')

  // If we have a tenant ID, fetch the full tenant data
  let tenant = null
  if (tenantId) {
    tenant = await getTenantById(tenantId)
  }

  // If tenant exists and has brand kit, use tenant-specific homepage
  if (tenant && tenant.brand_kit) {
    const brandKit = getBrandKit(tenant)
    return <TenantHomepage tenant={tenant} brandKit={brandKit} />
  }

  // Default VelloPad homepage with acquisition tracking
  return <LandingPage />
}
