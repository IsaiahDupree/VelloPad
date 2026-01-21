/**
 * Tenant-Specific Homepage Components
 *
 * Modular components for building tenant-specific homepages with different
 * hero variants, feature sections, and branding.
 */

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { BrandKit, Tenant } from '@/lib/tenant/resolver'
import { BookOpen, Sparkles, TrendingUp, Truck, Check, Star } from 'lucide-react'

interface TenantHomepageProps {
  tenant: Tenant
  brandKit: BrandKit
}

/**
 * Main tenant homepage component
 * Renders different layouts based on brand kit configuration
 */
export function TenantHomepage({ tenant, brandKit }: TenantHomepageProps) {
  // Get hero variant from brand kit
  const HeroComponent = getHeroComponent(brandKit.hero_variant)

  // Get homepage sections
  const sections = brandKit.homepage_sections || ['hero', 'features', 'cta']

  return (
    <div className="min-h-screen">
      {/* Header */}
      <TenantHeader tenant={tenant} brandKit={brandKit} />

      <main>
        {/* Render sections based on configuration */}
        {sections.includes('hero') && (
          <HeroComponent tenant={tenant} brandKit={brandKit} />
        )}

        {sections.includes('features') && (
          <FeaturesSection tenant={tenant} brandKit={brandKit} />
        )}

        {sections.includes('testimonials') && brandKit.testimonials && brandKit.testimonials.length > 0 && (
          <TestimonialsSection brandKit={brandKit} />
        )}

        {sections.includes('cta') && (
          <CTASection tenant={tenant} brandKit={brandKit} />
        )}
      </main>

      {/* Footer */}
      <TenantFooter tenant={tenant} brandKit={brandKit} />
    </div>
  )
}

/**
 * Tenant-aware header
 */
function TenantHeader({ tenant, brandKit }: TenantHomepageProps) {
  const logoUrl = brandKit.logo_url || null

  return (
    <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-50">
      <div className="container mx-auto flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          {logoUrl && (
            <img src={logoUrl} alt={tenant.name} className="h-8 w-auto" />
          )}
          <span className="text-xl font-semibold tracking-tight">{tenant.name}</span>
        </div>
        <nav className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Dashboard
          </Link>
          <Button asChild style={{ backgroundColor: brandKit.primary_color }}>
            <Link href="/dashboard">Get Started</Link>
          </Button>
        </nav>
      </div>
    </header>
  )
}

/**
 * Get hero component based on variant
 */
function getHeroComponent(variant: BrandKit['hero_variant']) {
  switch (variant) {
    case 'split':
      return HeroSplit
    case 'minimal':
      return HeroMinimal
    case 'bold':
      return HeroBold
    case 'centered':
    default:
      return HeroCentered
  }
}

/**
 * Centered hero (default)
 */
function HeroCentered({ tenant, brandKit }: TenantHomepageProps) {
  const copy = getHeroCopy(brandKit.tone, tenant.name)

  return (
    <section className="container mx-auto px-6 py-24 text-center">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          {copy.headline}
          <span className="block" style={{ color: brandKit.primary_color }}>
            {copy.subheadline}
          </span>
        </h1>
        <p className="mt-6 text-lg text-muted-foreground">{copy.description}</p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Button size="lg" asChild style={{ backgroundColor: brandKit.primary_color }}>
            <Link href="/dashboard">{copy.ctaPrimary}</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="#features">{copy.ctaSecondary}</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}

/**
 * Split hero (image + text)
 */
function HeroSplit({ tenant, brandKit }: TenantHomepageProps) {
  const copy = getHeroCopy(brandKit.tone, tenant.name)

  return (
    <section className="container mx-auto px-6 py-24">
      <div className="grid gap-12 md:grid-cols-2 items-center">
        <div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            {copy.headline}
            <span className="block mt-2" style={{ color: brandKit.primary_color }}>
              {copy.subheadline}
            </span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">{copy.description}</p>
          <div className="mt-8 flex items-center gap-4">
            <Button size="lg" asChild style={{ backgroundColor: brandKit.primary_color }}>
              <Link href="/dashboard">{copy.ctaPrimary}</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="#features">{copy.ctaSecondary}</Link>
            </Button>
          </div>
        </div>
        <div className="relative aspect-square rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
          <BookOpen className="h-32 w-32 text-primary opacity-50" />
        </div>
      </div>
    </section>
  )
}

/**
 * Minimal hero
 */
function HeroMinimal({ tenant, brandKit }: TenantHomepageProps) {
  const copy = getHeroCopy(brandKit.tone, tenant.name)

  return (
    <section className="container mx-auto px-6 py-32 text-center">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-5xl font-bold tracking-tight">
          {copy.headline}
        </h1>
        <p className="mt-6 text-xl text-muted-foreground">{copy.description}</p>
        <div className="mt-8">
          <Button size="lg" asChild style={{ backgroundColor: brandKit.primary_color }}>
            <Link href="/dashboard">{copy.ctaPrimary}</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}

/**
 * Bold hero (full-bleed background)
 */
function HeroBold({ tenant, brandKit }: TenantHomepageProps) {
  const copy = getHeroCopy(brandKit.tone, tenant.name)

  return (
    <section
      className="px-6 py-32 text-center text-white"
      style={{
        background: `linear-gradient(135deg, ${brandKit.primary_color} 0%, ${brandKit.accent_color} 100%)`,
      }}
    >
      <div className="mx-auto max-w-3xl">
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
          {copy.headline}
        </h1>
        <p className="mt-6 text-xl opacity-90">{copy.description}</p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Button
            size="lg"
            asChild
            className="bg-white text-gray-900 hover:bg-gray-100"
          >
            <Link href="/dashboard">{copy.ctaPrimary}</Link>
          </Button>
          <Button size="lg" variant="outline" asChild className="border-white text-white hover:bg-white/10">
            <Link href="#features">{copy.ctaSecondary}</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}

/**
 * Features section
 */
function FeaturesSection({ tenant, brandKit }: TenantHomepageProps) {
  const features = getFeatures(brandKit.tone)

  return (
    <section id="features" className="border-t bg-muted/30 py-24">
      <div className="container mx-auto px-6">
        <h2 className="text-center text-3xl font-bold tracking-tight">
          Everything you need to create your book
        </h2>
        <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              brandKit={brandKit}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

/**
 * Testimonials section
 */
function TestimonialsSection({ brandKit }: { brandKit: BrandKit }) {
  if (!brandKit.testimonials || brandKit.testimonials.length === 0) {
    return null
  }

  return (
    <section className="py-24">
      <div className="container mx-auto px-6">
        <h2 className="text-center text-3xl font-bold tracking-tight">
          What our authors say
        </h2>
        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {brandKit.testimonials.map((testimonial, index) => (
            <div key={index} className="rounded-xl border bg-card p-6">
              <div className="flex gap-1 text-amber-500">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <p className="mt-4 text-muted-foreground italic">"{testimonial.quote}"</p>
              <div className="mt-4 flex items-center gap-3">
                {testimonial.avatar_url && (
                  <img
                    src={testimonial.avatar_url}
                    alt={testimonial.name}
                    className="h-10 w-10 rounded-full"
                  />
                )}
                <div>
                  <p className="font-semibold">{testimonial.name}</p>
                  {testimonial.role && (
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/**
 * CTA section
 */
function CTASection({ tenant, brandKit }: TenantHomepageProps) {
  const copy = getCTACopy(brandKit.tone)

  return (
    <section className="py-24">
      <div className="container mx-auto px-6 text-center">
        <h2 className="text-3xl font-bold tracking-tight">{copy.headline}</h2>
        <p className="mt-4 text-muted-foreground">{copy.description}</p>
        <Button size="lg" className="mt-8" asChild style={{ backgroundColor: brandKit.primary_color }}>
          <Link href="/dashboard">{copy.cta}</Link>
        </Button>
      </div>
    </section>
  )
}

/**
 * Footer
 */
function TenantFooter({ tenant, brandKit }: TenantHomepageProps) {
  return (
    <footer className="border-t py-8">
      <div className="container mx-auto px-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} {tenant.name}. Powered by VelloPad.
      </div>
    </footer>
  )
}

/**
 * Feature card component
 */
function FeatureCard({
  icon,
  title,
  description,
  brandKit,
}: {
  icon: React.ReactNode
  title: string
  description: string
  brandKit: BrandKit
}) {
  return (
    <div className="rounded-xl border bg-card p-6">
      <div style={{ color: brandKit.primary_color }}>{icon}</div>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

/**
 * Get hero copy based on tone
 */
function getHeroCopy(tone: BrandKit['tone'], tenantName: string) {
  const copy = {
    professional: {
      headline: 'Professional Book Creation',
      subheadline: 'From Draft to Print.',
      description: `${tenantName} provides comprehensive tools for authors to write, design, and publish professional-quality books.`,
      ctaPrimary: 'Start Your Book',
      ctaSecondary: 'Learn More',
    },
    friendly: {
      headline: 'Write Your Story',
      subheadline: "We'll Help You Share It!",
      description: `Join ${tenantName} and turn your ideas into beautifully printed books. It's easier than you think!`,
      ctaPrimary: 'Get Started Free',
      ctaSecondary: 'See How It Works',
    },
    inspirational: {
      headline: 'Your Story Matters',
      subheadline: 'Make It Unforgettable.',
      description: `${tenantName} empowers you to bring your vision to life. Create books that inspire and transform readers.`,
      ctaPrimary: 'Begin Your Journey',
      ctaSecondary: 'Explore Features',
    },
    educational: {
      headline: 'Learn Book Creation',
      subheadline: 'Step by Step.',
      description: `${tenantName} guides you through every step of the book creation process, from first draft to finished product.`,
      ctaPrimary: 'Start Learning',
      ctaSecondary: 'View Tutorial',
    },
  }

  return copy[tone]
}

/**
 * Get features based on tone
 */
function getFeatures(tone: BrandKit['tone']) {
  return [
    {
      icon: <BookOpen className="h-8 w-8" />,
      title: 'Full Book Editor',
      description: 'Rich text editing with chapters, drag-drop reordering, and real-time preview.',
    },
    {
      icon: <Sparkles className="h-8 w-8" />,
      title: 'Professional Templates',
      description: 'Choose from beautifully designed templates for any genre or style.',
    },
    {
      icon: <Truck className="h-8 w-8" />,
      title: 'Print On Demand',
      description: 'Order proof copies or bulk prints with global shipping partners.',
    },
    {
      icon: <Check className="h-8 w-8" />,
      title: 'Quality Assurance',
      description: 'Automated preflight checks ensure your book is print-ready.',
    },
  ]
}

/**
 * Get CTA copy based on tone
 */
function getCTACopy(tone: BrandKit['tone']) {
  const copy = {
    professional: {
      headline: 'Ready to publish your book?',
      description: 'Join professional authors who trust our platform.',
      cta: 'Get Started Today',
    },
    friendly: {
      headline: "Let's create something amazing!",
      description: 'Join our community of writers and bring your book to life.',
      cta: 'Start Writing Free',
    },
    inspirational: {
      headline: 'Your masterpiece awaits',
      description: 'Take the first step toward sharing your gift with the world.',
      cta: 'Begin Your Story',
    },
    educational: {
      headline: 'Ready to learn book creation?',
      description: 'Get started with our guided workflow and expert tutorials.',
      cta: 'Start Free Course',
    },
  }

  return copy[tone]
}
