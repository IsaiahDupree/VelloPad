'use client'

/**
 * QuoteForm Component - BS-501
 *
 * Form for requesting price quotes from print providers.
 * Shows quantity selector, shipping address input, and shipping method.
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Package, Truck, Zap } from 'lucide-react'

interface ShippingAddress {
  name: string
  line1: string
  line2?: string
  city: string
  state: string
  postalCode: string
  country: string
}

interface QuoteFormProps {
  bookId: string
  onQuoteReceived?: (comparison: any) => void
}

export function QuoteForm({ bookId, onQuoteReceived }: QuoteFormProps) {
  const [quantity, setQuantity] = useState<number>(1)
  const [shippingMethod, setShippingMethod] = useState<string>('Standard')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [address, setAddress] = useState<ShippingAddress>({
    name: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId,
          quantity,
          shippingAddress: address,
          shippingMethod,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get quotes')
      }

      if (onQuoteReceived) {
        onQuoteReceived(data.data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get quotes')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Quantity */}
      <div className="space-y-2">
        <Label htmlFor="quantity">Quantity</Label>
        <Input
          id="quantity"
          type="number"
          min={1}
          max={10000}
          value={quantity}
          onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
          required
        />
        <p className="text-sm text-muted-foreground">
          Number of copies to print
        </p>
      </div>

      {/* Shipping Method */}
      <div className="space-y-2">
        <Label htmlFor="shipping-method">Shipping Method</Label>
        <Select value={shippingMethod} onValueChange={setShippingMethod}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Budget">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                <div>
                  <div className="font-medium">Budget</div>
                  <div className="text-xs text-muted-foreground">
                    10-15 business days
                  </div>
                </div>
              </div>
            </SelectItem>
            <SelectItem value="Standard">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4" />
                <div>
                  <div className="font-medium">Standard</div>
                  <div className="text-xs text-muted-foreground">
                    5-7 business days
                  </div>
                </div>
              </div>
            </SelectItem>
            <SelectItem value="Express">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                <div>
                  <div className="font-medium">Express</div>
                  <div className="text-xs text-muted-foreground">
                    2-3 business days
                  </div>
                </div>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Shipping Address */}
      <div className="space-y-4">
        <h3 className="font-semibold">Shipping Address</h3>

        <div className="space-y-2">
          <Label htmlFor="name">Full Name</Label>
          <Input
            id="name"
            value={address.name}
            onChange={(e) => setAddress({ ...address, name: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="line1">Address Line 1</Label>
          <Input
            id="line1"
            value={address.line1}
            onChange={(e) => setAddress({ ...address, line1: e.target.value })}
            placeholder="Street address, P.O. box"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="line2">Address Line 2 (Optional)</Label>
          <Input
            id="line2"
            value={address.line2 || ''}
            onChange={(e) => setAddress({ ...address, line2: e.target.value })}
            placeholder="Apartment, suite, unit, building, floor, etc."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              value={address.city}
              onChange={(e) => setAddress({ ...address, city: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="state">State / Province</Label>
            <Input
              id="state"
              value={address.state}
              onChange={(e) => setAddress({ ...address, state: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="postalCode">Postal Code</Label>
            <Input
              id="postalCode"
              value={address.postalCode}
              onChange={(e) =>
                setAddress({ ...address, postalCode: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Select
              value={address.country}
              onValueChange={(value) => setAddress({ ...address, country: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="US">United States</SelectItem>
                <SelectItem value="CA">Canada</SelectItem>
                <SelectItem value="GB">United Kingdom</SelectItem>
                <SelectItem value="AU">Australia</SelectItem>
                <SelectItem value="DE">Germany</SelectItem>
                <SelectItem value="FR">France</SelectItem>
                <SelectItem value="IT">Italy</SelectItem>
                <SelectItem value="ES">Spain</SelectItem>
                <SelectItem value="NL">Netherlands</SelectItem>
                <SelectItem value="JP">Japan</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-md">
          {error}
        </div>
      )}

      {/* Submit Button */}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Getting Quotes...
          </>
        ) : (
          'Get Quotes'
        )}
      </Button>
    </form>
  )
}
