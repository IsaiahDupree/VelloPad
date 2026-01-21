/**
 * Reorder Button Component - BS-504
 *
 * Allows users to reorder from a previous order without regenerating PDFs.
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Package, Loader2, Check, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ReorderButtonProps {
  orderId: string
  className?: string
}

interface ReorderDetails {
  canReorder: boolean
  reason?: string
  renditionId?: string
  details?: {
    book: any
    originalOrder: {
      orderNumber: string
      quantity: number
      provider: string
      shippingMethod: string
      shippingAddress: any
      pricing: any
    }
  }
}

export function ReorderButton({ orderId, className }: ReorderButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(false)
  const [reorderDetails, setReorderDetails] = useState<ReorderDetails | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [shippingMethod, setShippingMethod] = useState<string>('')

  // Check if order can be reordered
  const checkReorder = async () => {
    setChecking(true)
    try {
      const response = await fetch(`/api/orders/${orderId}/reorder`)
      const data = await response.json()

      setReorderDetails(data)

      if (data.canReorder && data.details) {
        setQuantity(data.details.originalOrder.quantity)
        setShippingMethod(data.details.originalOrder.shippingMethod)
        setOpen(true)
      } else {
        alert(data.reason || 'Cannot reorder this item')
      }
    } catch (error) {
      console.error('Failed to check reorder:', error)
      alert('Failed to check reorder status')
    } finally {
      setChecking(false)
    }
  }

  // Create reorder
  const handleReorder = async () => {
    if (!reorderDetails?.canReorder) return

    setLoading(true)
    try {
      const response = await fetch(`/api/orders/${orderId}/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity,
          shippingMethod,
        }),
      })

      const data = await response.json()

      if (data.success && data.quoteId) {
        // Close dialog
        setOpen(false)

        // Redirect to checkout with quote
        router.push(`/books/${reorderDetails.details?.book.id}/order?quoteId=${data.quoteId}`)
      } else {
        alert(data.error || 'Failed to create reorder')
      }
    } catch (error) {
      console.error('Failed to create reorder:', error)
      alert('Failed to create reorder')
    } finally {
      setLoading(false)
    }
  }

  const estimatedTotal =
    reorderDetails?.details?.originalOrder.pricing.subtotal * quantity +
    reorderDetails?.details?.originalOrder.pricing.shipping

  return (
    <>
      <Button
        onClick={checkReorder}
        disabled={checking}
        variant="outline"
        className={className}
      >
        {checking ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Checking...
          </>
        ) : (
          <>
            <Package className="mr-2 h-4 w-4" />
            Reorder
          </>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Reorder</DialogTitle>
            <DialogDescription>
              Quickly reorder using your saved print files. No need to regenerate PDFs.
            </DialogDescription>
          </DialogHeader>

          {reorderDetails?.canReorder && reorderDetails.details && (
            <div className="space-y-4 py-4">
              {/* Book Info */}
              <div className="rounded-lg border p-3">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <div className="flex h-12 w-12 items-center justify-center rounded bg-muted">
                      <Package className="h-6 w-6 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold">{reorderDetails.details.book.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {reorderDetails.details.book.trim_size} • {reorderDetails.details.book.binding}
                    </p>
                  </div>
                </div>
              </div>

              {/* Original Order Info */}
              <div className="flex items-center gap-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
                <Check className="h-4 w-4" />
                <span>
                  Original order: <strong>{reorderDetails.details.originalOrder.orderNumber}</strong>
                </span>
              </div>

              {/* Quantity */}
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min={1}
                  max={100}
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                />
              </div>

              {/* Shipping Method */}
              <div className="space-y-2">
                <Label htmlFor="shipping">Shipping Method</Label>
                <Select value={shippingMethod} onValueChange={setShippingMethod}>
                  <SelectTrigger id="shipping">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="budget">Budget (7-14 days)</SelectItem>
                    <SelectItem value="standard">Standard (3-7 days)</SelectItem>
                    <SelectItem value="express">Express (1-3 days)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Shipping Address */}
              <div className="space-y-2">
                <Label>Shipping Address</Label>
                <div className="rounded-lg border p-3 text-sm">
                  <p className="font-medium">{reorderDetails.details.originalOrder.shippingAddress.name}</p>
                  <p className="text-muted-foreground">
                    {reorderDetails.details.originalOrder.shippingAddress.line1}
                  </p>
                  {reorderDetails.details.originalOrder.shippingAddress.line2 && (
                    <p className="text-muted-foreground">
                      {reorderDetails.details.originalOrder.shippingAddress.line2}
                    </p>
                  )}
                  <p className="text-muted-foreground">
                    {reorderDetails.details.originalOrder.shippingAddress.city},{' '}
                    {reorderDetails.details.originalOrder.shippingAddress.state}{' '}
                    {reorderDetails.details.originalOrder.shippingAddress.postalCode}
                  </p>
                  <p className="text-muted-foreground">
                    {reorderDetails.details.originalOrder.shippingAddress.country}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Using shipping address from original order. To change, create a new order.
                </p>
              </div>

              {/* Estimated Total */}
              <div className="rounded-lg border bg-muted/50 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Product ({quantity}x)</span>
                  <span className="font-medium">
                    {reorderDetails.details.originalOrder.pricing.currency}{' '}
                    {(reorderDetails.details.originalOrder.pricing.subtotal * quantity).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="font-medium">
                    {reorderDetails.details.originalOrder.pricing.currency}{' '}
                    {reorderDetails.details.originalOrder.pricing.shipping.toFixed(2)}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between border-t pt-2">
                  <span className="font-semibold">Estimated Total</span>
                  <span className="font-semibold">
                    {reorderDetails.details.originalOrder.pricing.currency}{' '}
                    {estimatedTotal.toFixed(2)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Final price will be confirmed at checkout
                </p>
              </div>

              {/* Benefits */}
              <div className="flex items-start gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-900">
                <Check className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <div>
                  <p className="font-medium">Faster checkout</p>
                  <p className="text-green-700">
                    Reuse your existing print files - no need to wait for PDF generation.
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleReorder} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Order...
                </>
              ) : (
                <>Continue to Checkout</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
