/**
 * Photo Book Analytics Dashboard
 * Dashboard showing conversions, popular templates, order metrics
 * @see PB-045: Photo Book Analytics
 */

'use client'

import { useEffect, useState } from 'react'
import { Download, TrendingUp, DollarSign, ShoppingCart, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'

interface AnalyticsData {
  metrics: {
    totalProjects: number
    totalOrders: number
    totalRevenue: number
    conversionRate: number
    averageOrderValue: number
    projectsCreated: number
    coversDesigned: number
    pdfsGenerated: number
    ordersPlaced: number
  }
  templates: Array<{
    templateId: string
    templateName: string
    usage: number
    orders: number
    revenue: number
  }>
  ordersOverTime: Array<{
    date: string
    orders: number
    revenue: number
  }>
  revenueByProduct: Array<{
    size: string
    binding: string
    count: number
    revenue: number
  }>
  dateRange: string
}

export default function PhotoBookAnalyticsPage() {
  const [dateRange, setDateRange] = useState<string>('30d')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [workspaceId, setWorkspaceId] = useState<string>('mock-workspace-id')

  useEffect(() => {
    fetchAnalytics()
  }, [dateRange])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/photo-book/analytics?workspaceId=${workspaceId}&dateRange=${dateRange}`
      )
      if (response.ok) {
        const result = await response.json()
        setData(result)
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    try {
      const response = await fetch(
        `/api/photo-book/analytics/export?workspaceId=${workspaceId}&dateRange=${dateRange}`
      )
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `photo-book-analytics-${dateRange}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Failed to export analytics:', error)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading analytics...</div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">No analytics data available</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Photo Book Analytics</h1>
          <p className="text-muted-foreground">
            Track performance, conversions, and revenue
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40" data-testid="date-range-selector">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
              <SelectItem value="1y">Last Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleExport} variant="outline" data-testid="export-button">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="metric-total-projects">
              {data.metrics.totalProjects}
            </div>
            <p className="text-xs text-muted-foreground">
              Photo book projects created
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="metric-total-orders">
              {data.metrics.totalOrders}
            </div>
            <p className="text-xs text-muted-foreground">
              Orders placed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="metric-revenue">
              {formatCurrency(data.metrics.totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total revenue generated
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="metric-conversion-rate">
              {data.metrics.conversionRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Projects to orders
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="revenue" data-testid="tab-revenue">Revenue</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Conversion Funnel */}
          <Card>
            <CardHeader>
              <CardTitle>Conversion Funnel</CardTitle>
              <CardDescription>Track users from project creation to order placement</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Projects Created</span>
                  <span className="font-medium">{data.metrics.projectsCreated}</span>
                </div>
                <Progress value={100} className="h-2" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Covers Designed</span>
                  <span className="font-medium">{data.metrics.coversDesigned}</span>
                </div>
                <Progress
                  value={(data.metrics.coversDesigned / data.metrics.projectsCreated) * 100}
                  className="h-2"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>PDFs Generated</span>
                  <span className="font-medium">{data.metrics.pdfsGenerated}</span>
                </div>
                <Progress
                  value={(data.metrics.pdfsGenerated / data.metrics.projectsCreated) * 100}
                  className="h-2"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Orders Placed</span>
                  <span className="font-medium">{data.metrics.ordersPlaced}</span>
                </div>
                <Progress
                  value={(data.metrics.ordersPlaced / data.metrics.projectsCreated) * 100}
                  className="h-2"
                />
              </div>
            </CardContent>
          </Card>

          {/* Orders Over Time */}
          <Card>
            <CardHeader>
              <CardTitle>Orders Over Time</CardTitle>
              <CardDescription>Daily order volume and revenue</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2" data-testid="period-selector">
                {data.ordersOverTime.slice(-14).map(day => (
                  <div key={day.date} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {new Date(day.date).toLocaleDateString()}
                    </span>
                    <div className="flex items-center gap-4">
                      <span>{day.orders} orders</span>
                      <span className="font-medium">{formatCurrency(day.revenue)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(data.metrics.totalRevenue)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Average Order Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(data.metrics.averageOrderValue)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.metrics.totalOrders}</div>
              </CardContent>
            </Card>
          </div>

          {/* Revenue by Product */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue by Product</CardTitle>
              <CardDescription>Performance by size and binding type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.revenueByProduct.map((product, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>
                        {product.size} • {product.binding}
                      </span>
                      <div className="flex items-center gap-4">
                        <span className="text-muted-foreground">{product.count} orders</span>
                        <span className="font-medium">{formatCurrency(product.revenue)}</span>
                      </div>
                    </div>
                    <Progress
                      value={(product.revenue / data.metrics.totalRevenue) * 100}
                      className="h-2"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Popular Templates</CardTitle>
              <CardDescription>Most used templates and their performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.templates.map((template) => (
                  <div
                    key={template.templateId}
                    className="flex items-center justify-between p-4 border rounded-lg"
                    data-testid={`template-${template.templateName.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <div>
                      <div className="font-medium">{template.templateName}</div>
                      <div className="text-sm text-muted-foreground">
                        {template.usage} uses • {template.orders} orders
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(template.revenue)}</div>
                      <div className="text-sm text-muted-foreground">revenue</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
