/**
 * Photo Book Dashboard
 * User dashboard for project management, order history, and tracking
 *
 * @see PB-016: Photo Book Dashboard
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Book, Package, Clock, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'

/**
 * Photo book project
 */
interface PhotoBookProject {
  id: string
  title: string
  size: string
  binding: string
  pageCount: number
  status: 'draft' | 'ready' | 'ordered' | 'complete'
  coverImage?: string
  lastEdited: Date
  createdAt: Date
}

/**
 * Photo book order
 */
interface PhotoBookOrder {
  id: string
  projectId: string
  projectTitle: string
  orderNumber: string
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  total: number
  currency: string
  orderDate: Date
  estimatedDelivery?: Date
  trackingNumber?: string
  trackingUrl?: string
}

/**
 * Dashboard statistics
 */
interface DashboardStats {
  totalProjects: number
  activeProjects: number
  completedOrders: number
  pendingOrders: number
}

export default function PhotoBookDashboard() {
  // Mock data - in real app, fetch from API
  const [stats] = useState<DashboardStats>({
    totalProjects: 5,
    activeProjects: 2,
    completedOrders: 3,
    pendingOrders: 1
  })

  const [projects] = useState<PhotoBookProject[]>([
    {
      id: '1',
      title: 'Summer Vacation 2024',
      size: '10x10',
      binding: 'hardcover',
      pageCount: 48,
      status: 'ready',
      lastEdited: new Date('2024-01-15'),
      createdAt: new Date('2024-01-10')
    },
    {
      id: '2',
      title: 'Family Memories',
      size: '8x8',
      binding: 'softcover',
      pageCount: 32,
      status: 'draft',
      lastEdited: new Date('2024-01-14'),
      createdAt: new Date('2024-01-12')
    }
  ])

  const [orders] = useState<PhotoBookOrder[]>([
    {
      id: '1',
      projectId: '1',
      projectTitle: 'Summer Vacation 2024',
      orderNumber: 'PB-2024-001',
      status: 'shipped',
      total: 29.99,
      currency: 'USD',
      orderDate: new Date('2024-01-10'),
      estimatedDelivery: new Date('2024-01-20'),
      trackingNumber: 'TRACK123',
      trackingUrl: 'https://tracking.example.com/TRACK123'
    }
  ])

  const getStatusBadge = (status: PhotoBookProject['status']) => {
    const variants: Record<typeof status, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
      draft: { label: 'Draft', variant: 'secondary' },
      ready: { label: 'Ready to Order', variant: 'default' },
      ordered: { label: 'Ordered', variant: 'outline' },
      complete: { label: 'Complete', variant: 'outline' }
    }

    const config = variants[status]
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const getOrderStatusBadge = (status: PhotoBookOrder['status']) => {
    const variants: Record<typeof status, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
      pending: { label: 'Pending', variant: 'secondary' },
      processing: { label: 'Processing', variant: 'default' },
      shipped: { label: 'Shipped', variant: 'default' },
      delivered: { label: 'Delivered', variant: 'outline' },
      cancelled: { label: 'Cancelled', variant: 'destructive' }
    }

    const config = variants[status]
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Photo Book Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your photo book projects and orders
          </p>
        </div>
        <Button asChild>
          <Link href="/photo-book/new">
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <Book className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProjects}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeProjects}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingOrders}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Orders</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedOrders}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="projects" className="space-y-4">
        <TabsList>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
        </TabsList>

        {/* Projects Tab */}
        <TabsContent value="projects" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map(project => (
              <Card key={project.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{project.title}</CardTitle>
                    {getStatusBadge(project.status)}
                  </div>
                  <CardDescription>
                    {project.size} • {project.binding} • {project.pageCount} pages
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Last edited {project.lastEdited.toLocaleDateString()}</span>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button asChild variant="outline" className="flex-1">
                      <Link href={`/photo-book/${project.id}/edit`}>Edit</Link>
                    </Button>
                    {project.status === 'ready' && (
                      <Button asChild className="flex-1">
                        <Link href={`/photo-book/${project.id}/order`}>Order</Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders" className="space-y-4">
          <div className="space-y-4">
            {orders.map(order => (
              <Card key={order.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{order.projectTitle}</CardTitle>
                      <CardDescription>Order #{order.orderNumber}</CardDescription>
                    </div>
                    {getOrderStatusBadge(order.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <div className="text-sm">
                        <span className="text-muted-foreground">Order Date:</span>{' '}
                        {order.orderDate.toLocaleDateString()}
                      </div>
                      {order.estimatedDelivery && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Estimated Delivery:</span>{' '}
                          {order.estimatedDelivery.toLocaleDateString()}
                        </div>
                      )}
                      <div className="text-sm font-medium">
                        Total: {order.currency} {order.total.toFixed(2)}
                      </div>
                    </div>
                    {order.trackingNumber && (
                      <div className="space-y-2">
                        <div className="text-sm">
                          <span className="text-muted-foreground">Tracking:</span>{' '}
                          {order.trackingUrl ? (
                            <a
                              href={order.trackingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              {order.trackingNumber}
                            </a>
                          ) : (
                            order.trackingNumber
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="mt-4">
                    <Button asChild variant="outline">
                      <Link href={`/orders/${order.id}`}>View Details</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
