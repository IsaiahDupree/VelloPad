'use client'

/**
 * Order Page - BS-501
 *
 * Page for requesting quotes and placing orders for a book.
 */

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { QuoteForm } from '@/components/commerce/QuoteForm'
import { QuoteComparison } from '@/components/commerce/QuoteComparison'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Book } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function OrderPage() {
  const params = useParams()
  const router = useRouter()
  const bookId = params.id as string

  const [quoteComparison, setQuoteComparison] = useState<any>(null)

  const handleQuoteReceived = (comparison: any) => {
    setQuoteComparison(comparison)
  }

  const handleSelectQuote = async (quote: any) => {
    try {
      // Create Stripe checkout session
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteId: quote.id }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session')
      }

      // Redirect to Stripe checkout
      window.location.href = data.data.url
    } catch (error) {
      console.error('Checkout error:', error)
      alert(error instanceof Error ? error.message : 'Failed to proceed to checkout')
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <Link href={`/books/${bookId}`}>
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Book
          </Button>
        </Link>

        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Book className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Order Your Book</h1>
            <p className="text-muted-foreground">
              Get quotes from multiple print providers and place your order
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Quote Form */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Request Quote</CardTitle>
              <CardDescription>
                Enter your details to get pricing quotes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <QuoteForm
                bookId={bookId}
                onQuoteReceived={handleQuoteReceived}
              />
            </CardContent>
          </Card>
        </div>

        {/* Quote Results */}
        <div className="lg:col-span-2">
          {quoteComparison ? (
            <QuoteComparison
              quotes={quoteComparison.quotes}
              cheapest={quoteComparison.cheapest}
              fastest={quoteComparison.fastest}
              recommended={quoteComparison.recommended}
              onSelectQuote={handleSelectQuote}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Quote Results</CardTitle>
                <CardDescription>
                  Your quote comparison will appear here
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Book className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    No Quotes Yet
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Fill out the form on the left to request quotes from print
                    providers. We'll compare prices and delivery times to help
                    you choose the best option.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Information Cards */}
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Multiple Providers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              We compare quotes from multiple print-on-demand providers to get
              you the best price and delivery time.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">No Upfront Costs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Only pay when you place an order. Get quotes for free to see
              pricing before committing.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quality Guaranteed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              All our print providers use professional equipment and quality
              materials to ensure your book looks great.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
