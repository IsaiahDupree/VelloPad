/**
 * Template Detail Page
 * View template details, previews, reviews, and purchase/use
 * @see PB-035: Template Marketplace
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Star, Download, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface Template {
  id: string
  name: string
  description: string
  category: string
  type: 'free' | 'premium'
  price: number
  currency: string
  thumbnail: string
  previewImages: string[]
  rating: number
  reviewCount: number
  downloadCount: number
  isPurchased?: boolean
}

interface Review {
  id: string
  userName: string
  rating: number
  comment: string
  createdAt: string
}

export default function TemplateDetailPage({ params }: { params: { templateId: string } }) {
  const router = useRouter()
  const [template, setTemplate] = useState<Template | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [showPreview, setShowPreview] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)

  useEffect(() => {
    fetchTemplate()
  }, [params.templateId])

  const fetchTemplate = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/photo-book/marketplace/${params.templateId}`)
      if (response.ok) {
        const data = await response.json()
        setTemplate(data.template)
        setReviews(data.reviews)
      }
    } catch (error) {
      console.error('Failed to fetch template:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUseTemplate = () => {
    router.push(`/photo-book/new?template=${params.templateId}`)
  }

  const handlePurchase = () => {
    setShowCheckout(true)
  }

  const formatPrice = (price: number, currency: string) => {
    if (price === 0) return 'Free'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(price)
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading template...</div>
        </div>
      </div>
    )
  }

  if (!template) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">Template not found</p>
            <Button asChild>
              <Link href="/photo-book/marketplace">
                Back to Marketplace
              </Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="template-detail">
      {/* Back Button */}
      <Button asChild variant="ghost">
        <Link href="/photo-book/marketplace">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Marketplace
        </Link>
      </Button>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Template Preview */}
          <Card data-testid="template-preview">
            <CardContent className="p-0">
              <div className="aspect-video relative overflow-hidden bg-muted">
                {template.thumbnail && (
                  <img
                    src={template.thumbnail}
                    alt={template.name}
                    className="object-cover w-full h-full cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => setShowPreview(true)}
                  />
                )}
              </div>

              {/* Preview Gallery */}
              {template.previewImages.length > 0 && (
                <div className="grid grid-cols-4 gap-2 p-4">
                  {template.previewImages.map((image, index) => (
                    <div
                      key={index}
                      className="aspect-square relative overflow-hidden bg-muted rounded cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setShowPreview(true)}
                    >
                      <img
                        src={image}
                        alt={`Preview ${index + 1}`}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Template Info */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl">{template.name}</CardTitle>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge>{template.category}</Badge>
                    <Badge variant={template.type === 'free' ? 'secondary' : 'default'}>
                      {template.type === 'free' ? 'Free' : 'Premium'}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">{template.description}</p>

              <div className="flex items-center gap-6 text-sm">
                {/* Rating */}
                <div className="flex items-center gap-2" data-testid="template-rating">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{template.rating.toFixed(1)}</span>
                  <span className="text-muted-foreground">
                    ({template.reviewCount} reviews)
                  </span>
                </div>

                {/* Downloads */}
                <div className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  <span>{template.downloadCount.toLocaleString()} downloads</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reviews */}
          <Card>
            <CardHeader>
              <CardTitle>Reviews</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4" data-testid="template-reviews">
              {reviews.length > 0 ? (
                reviews.map((review) => (
                  <div key={review.id} className="border-b last:border-0 pb-4 last:pb-0">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <User className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{review.userName}</span>
                          <div className="flex">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < review.rating
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-muted-foreground'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{review.comment}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No reviews yet
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Purchase Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl" data-testid="template-price">
                {formatPrice(template.price, template.currency)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {template.isPurchased ? (
                <Button
                  onClick={handleUseTemplate}
                  className="w-full"
                  data-testid="use-template-button"
                >
                  Use Template
                </Button>
              ) : template.type === 'free' ? (
                <Button
                  onClick={handleUseTemplate}
                  className="w-full"
                  data-testid="use-template-button"
                >
                  Use Template
                </Button>
              ) : (
                <>
                  <Button
                    onClick={handlePurchase}
                    className="w-full"
                    data-testid="purchase-button"
                  >
                    Purchase Template
                  </Button>
                  <Button
                    onClick={() => setShowPreview(true)}
                    variant="outline"
                    className="w-full"
                    data-testid="preview-button"
                  >
                    Preview
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Features Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">What's Included</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                  ✓
                </div>
                <span>Professional layout design</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                  ✓
                </div>
                <span>Print-ready PDF export</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                  ✓
                </div>
                <span>Fully customizable</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                  ✓
                </div>
                <span>Commercial use allowed</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Preview Modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl" data-testid="template-preview-modal">
          <DialogHeader>
            <DialogTitle>Template Preview</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {[template.thumbnail, ...template.previewImages].map((image, index) => (
              <img
                key={index}
                src={image}
                alt={`Preview ${index}`}
                className="w-full rounded-lg"
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Checkout Modal */}
      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent data-testid="checkout-modal">
          <DialogHeader>
            <DialogTitle>Purchase Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span>{template.name}</span>
              <span className="font-bold">
                {formatPrice(template.price, template.currency)}
              </span>
            </div>
            <Button className="w-full">
              Complete Purchase
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
