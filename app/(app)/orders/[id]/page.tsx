/**
 * Order Detail Page - BS-503
 *
 * Displays order details, status timeline, and tracking information.
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  getOrder,
  getOrderStatusHistory,
  getOrderShipments,
  getStatusDisplayName,
  getStatusColor,
  formatPrice,
} from '@/lib/commerce/orders'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Package, Truck, MapPin, CreditCard, Clock, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { ReorderButton } from '@/components/commerce/ReorderButton'

interface OrderPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ session_id?: string }>
}

export default async function OrderPage({ params, searchParams }: OrderPageProps) {
  const { id: orderId } = await params
  const { session_id } = await searchParams

  const supabase = await createClient()

  // Verify authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Get order
  const order = await getOrder(orderId)

  if (!order) {
    redirect('/dashboard')
  }

  // Verify user has access to this order
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', order.workspaceId)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    redirect('/dashboard')
  }

  // Get order history and shipments
  const [statusHistory, shipments] = await Promise.all([
    getOrderStatusHistory(orderId),
    getOrderShipments(orderId),
  ])

  // Show success message if coming from Stripe checkout
  const showSuccessMessage = !!session_id

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">Order {order.orderNumber}</h1>
            <p className="text-muted-foreground mt-1">
              Placed on {order.createdAt.toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={getStatusColor(order.status)} className="text-sm">
              {getStatusDisplayName(order.status)}
            </Badge>
            {/* Show reorder button for delivered orders */}
            {order.status === 'delivered' && <ReorderButton orderId={orderId} />}
          </div>
        </div>
      </div>

      {/* Success Message */}
      {showSuccessMessage && (
        <Card className="mb-6 border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <Package className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-green-900">Order Confirmed!</h3>
                <p className="text-sm text-green-700">
                  Your payment was successful. We'll start processing your order shortly.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Status Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Order Status</CardTitle>
              <CardDescription>Track your order progress</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {statusHistory.map((update, index) => (
                  <div key={update.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={`h-8 w-8 rounded-full flex items-center justify-center ${
                          index === 0
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        <Clock className="h-4 w-4" />
                      </div>
                      {index < statusHistory.length - 1 && (
                        <div className="w-0.5 h-12 bg-border mt-2" />
                      )}
                    </div>
                    <div className="flex-1 pb-8">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">
                            {getStatusDisplayName(update.status)}
                          </p>
                          {update.message && (
                            <p className="text-sm text-muted-foreground">
                              {update.message}
                            </p>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {update.createdAt.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Shipping Information */}
          {shipments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Shipping Information</CardTitle>
                <CardDescription>Track your shipment</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {shipments.map((shipment) => (
                    <div key={shipment.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{shipment.carrier}</span>
                        </div>
                        {shipment.trackingUrl && (
                          <Link
                            href={shipment.trackingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button variant="outline" size="sm">
                              Track Package
                              <ExternalLink className="ml-2 h-3 w-3" />
                            </Button>
                          </Link>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Tracking: {shipment.trackingNumber}
                      </p>
                      <div className="flex gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Shipped: </span>
                          <span>{shipment.shippedAt.toLocaleDateString()}</span>
                        </div>
                        {shipment.estimatedDelivery && (
                          <div>
                            <span className="text-muted-foreground">Est. Delivery: </span>
                            <span>
                              {shipment.estimatedDelivery.toLocaleDateString()}
                            </span>
                          </div>
                        )}
                        {shipment.deliveredAt && (
                          <div>
                            <span className="text-muted-foreground">Delivered: </span>
                            <span className="font-medium text-green-600">
                              {shipment.deliveredAt.toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Quantity</span>
                  <span>{order.quantity} {order.quantity === 1 ? 'copy' : 'copies'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Product</span>
                  <span>{formatPrice(order.productPrice, order.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>{formatPrice(order.shippingPrice, order.currency)}</span>
                </div>
                {order.taxAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax</span>
                    <span>{formatPrice(order.taxAmount, order.currency)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-base">
                  <span>Total</span>
                  <span>{formatPrice(order.totalAmount, order.currency)}</span>
                </div>
              </div>

              {order.paidAt && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CreditCard className="h-4 w-4" />
                  <span>Paid on {order.paidAt.toLocaleDateString()}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Shipping Address */}
          <Card>
            <CardHeader>
              <CardTitle>Shipping Address</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="text-sm space-y-1">
                  <p className="font-medium">{order.shippingAddress.name}</p>
                  <p className="text-muted-foreground">
                    {order.shippingAddress.line1}
                  </p>
                  {order.shippingAddress.line2 && (
                    <p className="text-muted-foreground">
                      {order.shippingAddress.line2}
                    </p>
                  )}
                  <p className="text-muted-foreground">
                    {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                    {order.shippingAddress.postalCode}
                  </p>
                  <p className="text-muted-foreground">
                    {order.shippingAddress.country}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Provider Info */}
          <Card>
            <CardHeader>
              <CardTitle>Print Provider</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Provider</span>
                  <span className="font-medium capitalize">{order.provider}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping Method</span>
                  <span>{order.shippingMethod}</span>
                </div>
                {order.providerOrderId && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Provider Order ID</span>
                    <span className="font-mono text-xs">
                      {order.providerOrderId}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
