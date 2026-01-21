'use client'

/**
 * QuoteComparison Component - BS-501
 *
 * Displays quote results from multiple print providers.
 * Shows pricing comparison with recommendations.
 */

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, Clock, DollarSign, Package } from 'lucide-react'

interface Quote {
  id: string
  provider: string
  quantity: number
  productPrice: number
  shippingPrice: number
  taxAmount: number
  totalPrice: number
  currency: string
  estimatedDeliveryDays: number
}

interface QuoteComparisonProps {
  quotes: Quote[]
  cheapest: Quote
  fastest: Quote
  recommended: Quote
  onSelectQuote?: (quote: Quote) => void
}

export function QuoteComparison({
  quotes,
  cheapest,
  fastest,
  recommended,
  onSelectQuote,
}: QuoteComparisonProps) {
  const formatPrice = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount)
  }

  const getProviderName = (provider: string) => {
    const names: Record<string, string> = {
      prodigi: 'Prodigi',
      gelato: 'Gelato',
      lulu: 'Lulu',
      peecho: 'Peecho',
    }
    return names[provider] || provider
  }

  const getBadges = (quote: Quote) => {
    const badges = []

    if (quote.id === recommended.id) {
      badges.push(
        <Badge key="recommended" variant="default" className="bg-green-600">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Recommended
        </Badge>
      )
    }

    if (quote.id === cheapest.id) {
      badges.push(
        <Badge key="cheapest" variant="secondary">
          <DollarSign className="mr-1 h-3 w-3" />
          Lowest Price
        </Badge>
      )
    }

    if (quote.id === fastest.id) {
      badges.push(
        <Badge key="fastest" variant="secondary">
          <Clock className="mr-1 h-3 w-3" />
          Fastest
        </Badge>
      )
    }

    return badges
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Quote Comparison</h2>
          <p className="text-muted-foreground">
            {quotes.length} {quotes.length === 1 ? 'quote' : 'quotes'} available
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {quotes.map((quote) => (
          <Card
            key={quote.id}
            className={
              quote.id === recommended.id
                ? 'border-2 border-green-600 shadow-lg'
                : ''
            }
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">
                    {getProviderName(quote.provider)}
                  </CardTitle>
                  <CardDescription>
                    {quote.quantity} {quote.quantity === 1 ? 'copy' : 'copies'}
                  </CardDescription>
                </div>
                <Package className="h-5 w-5 text-muted-foreground" />
              </div>

              <div className="flex flex-wrap gap-1 mt-2">
                {getBadges(quote)}
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Price Breakdown */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Product</span>
                  <span>{formatPrice(quote.productPrice, quote.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>{formatPrice(quote.shippingPrice, quote.currency)}</span>
                </div>
                {quote.taxAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax</span>
                    <span>{formatPrice(quote.taxAmount, quote.currency)}</span>
                  </div>
                )}
                <div className="border-t pt-2 flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>{formatPrice(quote.totalPrice, quote.currency)}</span>
                </div>
              </div>

              {/* Delivery Estimate */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  Estimated delivery: {quote.estimatedDeliveryDays}{' '}
                  {quote.estimatedDeliveryDays === 1 ? 'day' : 'days'}
                </span>
              </div>

              {/* Select Button */}
              {onSelectQuote && (
                <Button
                  className="w-full"
                  variant={quote.id === recommended.id ? 'default' : 'outline'}
                  onClick={() => onSelectQuote(quote)}
                >
                  {quote.id === recommended.id ? 'Continue with Recommended' : 'Select This Quote'}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Lowest Price</div>
              <div className="text-2xl font-bold">
                {formatPrice(cheapest.totalPrice, cheapest.currency)}
              </div>
              <div className="text-xs text-muted-foreground">
                {getProviderName(cheapest.provider)}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Fastest Delivery</div>
              <div className="text-2xl font-bold">
                {fastest.estimatedDeliveryDays} days
              </div>
              <div className="text-xs text-muted-foreground">
                {getProviderName(fastest.provider)}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Recommended</div>
              <div className="text-2xl font-bold">
                {formatPrice(recommended.totalPrice, recommended.currency)}
              </div>
              <div className="text-xs text-muted-foreground">
                {getProviderName(recommended.provider)} • {recommended.estimatedDeliveryDays} days
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
