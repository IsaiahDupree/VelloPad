/**
 * Template Marketplace
 * Browse and purchase professional photo book templates
 * @see PB-035: Template Marketplace
 */

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Search, Star, Download, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface MarketplaceTemplate {
  id: string
  name: string
  description: string
  category: string
  type: 'free' | 'premium'
  price: number
  currency: string
  thumbnail: string
  rating: number
  reviewCount: number
  downloadCount: number
  isPurchased?: boolean
}

export default function TemplateMarketplacePage() {
  const [templates, setTemplates] = useState<MarketplaceTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('popular')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchTemplates()
  }, [category, sortBy])

  const fetchTemplates = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        category,
        sortBy,
        ...(searchQuery && { search: searchQuery })
      })

      const response = await fetch(`/api/photo-book/marketplace?${params}`)
      if (response.ok) {
        const data = await response.json()
        setTemplates(data.templates)
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    fetchTemplates()
  }

  const formatPrice = (price: number, currency: string) => {
    if (price === 0) return 'Free'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(price)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Template Marketplace</h1>
        <p className="text-muted-foreground">
          Browse and purchase professional photo book templates
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 flex gap-2">
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            data-testid="template-search"
          />
          <Button onClick={handleSearch} variant="outline">
            <Search className="h-4 w-4" />
          </Button>
        </div>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-48" data-testid="sort-selector">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="popular">Most Popular</SelectItem>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="rating">Highest Rated</SelectItem>
            <SelectItem value="price-low">Price: Low to High</SelectItem>
            <SelectItem value="price-high">Price: High to Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Category Tabs */}
      <Tabs value={category} onValueChange={setCategory}>
        <TabsList>
          <TabsTrigger value="all">All Templates</TabsTrigger>
          <TabsTrigger value="classic" data-testid="category-classic">Classic</TabsTrigger>
          <TabsTrigger value="collage">Collage</TabsTrigger>
          <TabsTrigger value="magazine">Magazine</TabsTrigger>
          <TabsTrigger value="minimalist">Minimalist</TabsTrigger>
          <TabsTrigger value="seasonal">Seasonal</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Template Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading templates...</div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" data-testid="template-grid">
          {templates.map((template) => (
            <Card
              key={template.id}
              className="overflow-hidden hover:shadow-lg transition-shadow"
              data-testid={`template-card-${template.category === category ? template.category : template.type}`}
            >
              <div className="aspect-video relative overflow-hidden bg-muted">
                {template.thumbnail && (
                  <img
                    src={template.thumbnail}
                    alt={template.name}
                    className="object-cover w-full h-full"
                  />
                )}
                <div className="absolute top-2 right-2">
                  <Badge variant={template.type === 'free' ? 'secondary' : 'default'}>
                    {template.type === 'free' ? 'Free' : 'Premium'}
                  </Badge>
                </div>
              </div>

              <CardHeader>
                <CardTitle className="text-lg">{template.name}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {template.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-2">
                {/* Rating */}
                <div className="flex items-center gap-2 text-sm">
                  <div className="flex items-center">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="ml-1 font-medium">{template.rating.toFixed(1)}</span>
                  </div>
                  <span className="text-muted-foreground">
                    ({template.reviewCount} reviews)
                  </span>
                </div>

                {/* Downloads */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Download className="h-4 w-4" />
                  <span>{template.downloadCount.toLocaleString()} downloads</span>
                </div>

                {/* Price */}
                <div className="flex items-center gap-2 text-lg font-bold">
                  {template.type === 'premium' && <DollarSign className="h-5 w-5" />}
                  {formatPrice(template.price, template.currency)}
                </div>
              </CardContent>

              <CardFooter className="flex gap-2">
                <Button asChild variant="outline" className="flex-1">
                  <Link href={`/photo-book/marketplace/${template.id}`}>
                    View Details
                  </Link>
                </Button>
                {template.isPurchased ? (
                  <Button asChild className="flex-1">
                    <Link href={`/photo-book/new?template=${template.id}`}>
                      Use Template
                    </Link>
                  </Button>
                ) : template.type === 'free' ? (
                  <Button asChild className="flex-1">
                    <Link href={`/photo-book/new?template=${template.id}`}>
                      Use Template
                    </Link>
                  </Button>
                ) : (
                  <Button asChild className="flex-1">
                    <Link href={`/photo-book/marketplace/${template.id}`}>
                      Purchase
                    </Link>
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {!loading && templates.length === 0 && (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">No templates found</p>
            <Button onClick={() => {
              setSearchQuery('')
              setCategory('all')
              fetchTemplates()
            }}>
              Clear Filters
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
