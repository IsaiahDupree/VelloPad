/**
 * Quote Flow - BS-501
 *
 * Manages quote requests and pricing calculations for book orders.
 * Integrates with print orchestrator to get quotes from multiple providers.
 */

import { createClient } from '@/lib/supabase/server'
import { PrintOrchestrator } from '@/lib/print/orchestrator'
import { ProdigiAdapter } from '@/lib/print/adapters/prodigi'
import type { PrintSpec, QuoteRequest, QuoteResult, ShippingMethod } from '@/lib/print/orchestrator'

export interface QuoteRequestInput {
  bookId: string
  quantity: number
  shippingAddress: {
    name: string
    line1: string
    line2?: string
    city: string
    state: string
    postalCode: string
    country: string
  }
  shippingMethod: ShippingMethod
  provider?: string // Optional: specific provider, otherwise compare all
}

export interface Quote {
  id: string
  bookId: string
  workspaceId: string
  provider: string
  quantity: number
  productPrice: number
  shippingPrice: number
  taxAmount: number
  totalPrice: number
  currency: string
  shippingMethod: ShippingMethod
  shippingAddress: QuoteRequestInput['shippingAddress']
  estimatedDeliveryDays: number
  expiresAt: Date
  productSku?: string
  printSpec: PrintSpec
  createdAt: Date
}

export interface QuoteComparison {
  quotes: Quote[]
  cheapest: Quote
  fastest: Quote
  recommended: Quote
}

/**
 * Request quotes from one or more print providers
 */
export async function requestQuote(input: QuoteRequestInput): Promise<QuoteComparison> {
  const supabase = await createClient()

  // Get book details
  const { data: book, error: bookError } = await supabase
    .from('books')
    .select('*, renditions(interior_pdf_url, cover_pdf_url)')
    .eq('id', input.bookId)
    .single()

  if (bookError || !book) {
    throw new Error(`Book not found: ${input.bookId}`)
  }

  // Verify book has completed rendition
  if (!book.renditions || book.renditions.length === 0) {
    throw new Error('Book must have a completed rendition before requesting quotes')
  }

  const latestRendition = book.renditions[0]
  if (!latestRendition.interior_pdf_url || !latestRendition.cover_pdf_url) {
    throw new Error('Book rendition must be complete (interior + cover PDFs)')
  }

  // Build print spec from book
  const printSpec: PrintSpec = {
    productType: 'book',
    trimSize: book.trim_size,
    binding: book.binding,
    pageCount: book.page_count || 100, // TODO: Calculate from chapters
    paperType: 'standard', // TODO: From book settings
    colorSpace: 'CMYK', // TODO: Detect from book settings
    coverFinish: 'glossy', // TODO: From book cover settings
    interiorPdfUrl: latestRendition.interior_pdf_url,
    coverPdfUrl: latestRendition.cover_pdf_url,
  }

  // Initialize print orchestrator with available providers
  const orchestrator = new PrintOrchestrator()

  // Add Prodigi adapter
  const prodigiApiKey = process.env.PRODIGI_API_KEY
  const prodigiEnv = process.env.PRODIGI_ENVIRONMENT as 'sandbox' | 'live' || 'sandbox'
  if (prodigiApiKey) {
    orchestrator.registerAdapter(new ProdigiAdapter({ apiKey: prodigiApiKey, environment: prodigiEnv }))
  }

  // TODO: Add more providers (Gelato, Lulu, etc.)

  // Build quote request
  const quoteRequest: QuoteRequest = {
    spec: printSpec,
    quantity: input.quantity,
    destinationCountry: input.shippingAddress.country,
    shippingMethod: input.shippingMethod,
  }

  // Get quotes from providers
  let quotes: QuoteResult[]

  if (input.provider) {
    // Request from specific provider
    quotes = await orchestrator.getQuotes(quoteRequest, [input.provider])
  } else {
    // Request from all available providers
    quotes = await orchestrator.getQuotes(quoteRequest)
  }

  // Filter out failed quotes
  const successfulQuotes = quotes.filter(q => q.available)

  if (successfulQuotes.length === 0) {
    throw new Error('No quotes available from any provider. Please try again later.')
  }

  // Store quotes in database
  const quotesToStore = successfulQuotes.map(q => ({
    book_id: input.bookId,
    workspace_id: book.workspace_id,
    provider: q.providerId,
    quantity: input.quantity,
    product_price: q.unitCost * input.quantity,
    shipping_price: q.shippingCost,
    tax_amount: q.taxCost || 0,
    total_price: q.totalCost,
    currency: q.currency,
    shipping_method: input.shippingMethod,
    shipping_address: input.shippingAddress,
    estimated_delivery_days: q.estimatedTotalDays,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    product_sku: '',  // Not available in QuoteResult
    print_spec: printSpec,
  }))

  const { data: storedQuotes, error: quoteError } = await supabase
    .from('quotes')
    .insert(quotesToStore)
    .select()

  if (quoteError || !storedQuotes) {
    throw new Error(`Failed to store quotes: ${quoteError?.message}`)
  }

  // Transform to Quote format
  const transformedQuotes: Quote[] = storedQuotes.map(q => ({
    id: q.id,
    bookId: q.book_id,
    workspaceId: q.workspace_id,
    provider: q.provider,
    quantity: q.quantity,
    productPrice: q.product_price,
    shippingPrice: q.shipping_price,
    taxAmount: q.tax_amount,
    totalPrice: q.total_price,
    currency: q.currency,
    shippingMethod: q.shipping_method,
    shippingAddress: q.shipping_address,
    estimatedDeliveryDays: q.estimated_delivery_days,
    expiresAt: new Date(q.expires_at),
    productSku: q.product_sku,
    printSpec: q.print_spec,
    createdAt: new Date(q.created_at),
  }))

  // Find cheapest and fastest
  const cheapest = transformedQuotes.reduce((prev, curr) =>
    curr.totalPrice < prev.totalPrice ? curr : prev
  )

  const fastest = transformedQuotes.reduce((prev, curr) =>
    curr.estimatedDeliveryDays < prev.estimatedDeliveryDays ? curr : prev
  )

  // Recommended: balance of price and speed
  // Score = normalized_price * 0.7 + normalized_speed * 0.3
  const maxPrice = Math.max(...transformedQuotes.map(q => q.totalPrice))
  const maxDays = Math.max(...transformedQuotes.map(q => q.estimatedDeliveryDays))

  const recommended = transformedQuotes.reduce((prev, curr) => {
    const prevScore = (prev.totalPrice / maxPrice) * 0.7 + (prev.estimatedDeliveryDays / maxDays) * 0.3
    const currScore = (curr.totalPrice / maxPrice) * 0.7 + (curr.estimatedDeliveryDays / maxDays) * 0.3
    return currScore < prevScore ? curr : prev
  })

  return {
    quotes: transformedQuotes,
    cheapest,
    fastest,
    recommended,
  }
}

/**
 * Get a specific quote by ID
 */
export async function getQuote(quoteId: string): Promise<Quote | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('quotes')
    .select()
    .eq('id', quoteId)
    .single()

  if (error || !data) {
    return null
  }

  return {
    id: data.id,
    bookId: data.book_id,
    workspaceId: data.workspace_id,
    provider: data.provider,
    quantity: data.quantity,
    productPrice: data.product_price,
    shippingPrice: data.shipping_price,
    taxAmount: data.tax_amount,
    totalPrice: data.total_price,
    currency: data.currency,
    shippingMethod: data.shipping_method,
    shippingAddress: data.shipping_address,
    estimatedDeliveryDays: data.estimated_delivery_days,
    expiresAt: new Date(data.expires_at),
    productSku: data.product_sku,
    printSpec: data.print_spec,
    createdAt: new Date(data.created_at),
  }
}

/**
 * Get recent quotes for a book
 */
export async function getBookQuotes(bookId: string): Promise<Quote[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('quotes')
    .select()
    .eq('book_id', bookId)
    .order('created_at', { ascending: false })
    .limit(10)

  if (error || !data) {
    return []
  }

  return data.map(q => ({
    id: q.id,
    bookId: q.book_id,
    workspaceId: q.workspace_id,
    provider: q.provider,
    quantity: q.quantity,
    productPrice: q.product_price,
    shippingPrice: q.shipping_price,
    taxAmount: q.tax_amount,
    totalPrice: q.total_price,
    currency: q.currency,
    shippingMethod: q.shipping_method,
    shippingAddress: q.shipping_address,
    estimatedDeliveryDays: q.estimated_delivery_days,
    expiresAt: new Date(q.expires_at),
    productSku: q.product_sku,
    printSpec: q.print_spec,
    createdAt: new Date(q.created_at),
  }))
}

/**
 * Check if a quote is still valid (not expired)
 */
export function isQuoteValid(quote: Quote): boolean {
  return new Date() < quote.expiresAt
}

/**
 * Calculate tax amount (placeholder - integrate with real tax API)
 */
export function calculateTax(
  subtotal: number,
  shippingAddress: QuoteRequestInput['shippingAddress']
): number {
  // TODO: Integrate with TaxJar, Avalara, or similar
  // For now, simple US sales tax estimation
  if (shippingAddress.country === 'US') {
    // Average US sales tax ~7%
    return subtotal * 0.07
  }

  // No tax for international orders (handled by customs)
  return 0
}

/**
 * Format price for display
 */
export function formatPrice(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount)
}
