import { headers } from 'next/headers'
import { getTenantById } from '@/lib/tenant/resolver'
import { getBrandKit } from '@/lib/tenant/brand-kit'
import { TenantHomepage } from '@/components/storefront/TenantHomepage'
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BookOpen, Sparkles, TrendingUp, Truck } from "lucide-react";

/**
 * Homepage - Tenant-aware
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

  // Default VelloPad homepage (when no tenant or no brand kit)
  return renderDefaultHomepage()
}

function renderDefaultHomepage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="text-xl font-semibold tracking-tight">vellopad</div>
          <nav className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
              Dashboard
            </Link>
            <Button asChild>
              <Link href="/dashboard">Get Started</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="container mx-auto px-6 py-24 text-center">
          <div className="mx-auto max-w-3xl">
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
              Write. Design. Print.
              <span className="block text-primary">Your Book, Your Way.</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground">
              VelloPad is the modern book creation studio. Write with AI-powered prompts, 
              design with professional templates, and order print copies—all in one place.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Button size="lg" asChild>
                <Link href="/dashboard">Start Your Book</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="#features">Learn More</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="border-t bg-muted/30 py-24">
          <div className="container mx-auto px-6">
            <h2 className="text-center text-3xl font-bold tracking-tight">
              Everything you need to create your book
            </h2>
            <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              <FeatureCard
                icon={<BookOpen className="h-8 w-8" />}
                title="Full Book Editor"
                description="Rich text editing with chapters, drag-drop reordering, and real-time preview."
              />
              <FeatureCard
                icon={<Sparkles className="h-8 w-8" />}
                title="AI Prompt Sidekick"
                description="Get unstuck with AI-powered suggestions, outlines, and rewrites."
              />
              <FeatureCard
                icon={<Truck className="h-8 w-8" />}
                title="Print On Demand"
                description="Order proof copies or bulk prints with global shipping partners."
              />
              <FeatureCard
                icon={<TrendingUp className="h-8 w-8" />}
                title="Marketing Hub"
                description="Daily tasks and playbooks to help you sell more books."
              />
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24">
          <div className="container mx-auto px-6 text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              Ready to write your book?
            </h2>
            <p className="mt-4 text-muted-foreground">
              Join creators who have published their ideas with VelloPad.
            </p>
            <Button size="lg" className="mt-8" asChild>
              <Link href="/dashboard">Get Started Free</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container mx-auto px-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} VelloPad. Master Builder (33) Energy.
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="text-primary">{icon}</div>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
