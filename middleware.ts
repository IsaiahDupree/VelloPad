import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { resolveTenant } from "@/lib/tenant/resolver";

export async function middleware(request: NextRequest) {
  // First, handle Supabase auth session
  const response = await updateSession(request);

  // Resolve tenant from hostname
  const hostname = request.headers.get('host') || '';
  const tenantContext = await resolveTenant(hostname);

  // Add tenant info to response headers for server components
  const newResponse = NextResponse.next({
    request: {
      headers: new Headers(response.headers),
    },
  });

  // Set tenant headers
  newResponse.headers.set('x-tenant-id', tenantContext.tenant?.id || '');
  newResponse.headers.set('x-tenant-slug', tenantContext.tenant?.slug || '');
  newResponse.headers.set('x-tenant-name', tenantContext.tenant?.name || '');
  newResponse.headers.set('x-hostname', tenantContext.hostname);
  newResponse.headers.set('x-is-custom-domain', String(tenantContext.isCustomDomain));
  newResponse.headers.set('x-is-subdomain', String(tenantContext.isSubdomain));
  newResponse.headers.set('x-is-main-domain', String(tenantContext.isMainDomain));

  // If tenant not found and not main domain, redirect to main domain
  if (!tenantContext.tenant && !tenantContext.isMainDomain) {
    const mainDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || 'vellopad.com';
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const redirectUrl = `${protocol}://${mainDomain}${request.nextUrl.pathname}${request.nextUrl.search}`;

    return NextResponse.redirect(redirectUrl);
  }

  return newResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
