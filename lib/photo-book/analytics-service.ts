/**
 * Photo Book Analytics Service
 * Business logic for photo book metrics and analytics
 * @see PB-045: Photo Book Analytics
 */

import { createClient } from '@/lib/supabase/server'

/**
 * Analytics metrics
 */
export interface AnalyticsMetrics {
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

/**
 * Template popularity data
 */
export interface TemplatePopularity {
  templateId: string
  templateName: string
  usage: number
  orders: number
  revenue: number
}

/**
 * Orders over time data point
 */
export interface OrdersOverTime {
  date: string
  orders: number
  revenue: number
}

/**
 * Revenue by product
 */
export interface RevenueByProduct {
  size: string
  binding: string
  count: number
  revenue: number
}

/**
 * Date range options
 */
export type DateRange = '7d' | '30d' | '90d' | '1y' | 'all'

/**
 * Get analytics metrics for photo books
 */
export async function getAnalyticsMetrics(
  workspaceId: string,
  dateRange: DateRange = '30d'
): Promise<AnalyticsMetrics> {
  const supabase = await createClient()
  const startDate = getStartDate(dateRange)

  // Get total projects
  const { count: totalProjects } = await supabase
    .from('photo_book_projects')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .gte('created_at', startDate.toISOString())

  // Get total orders
  const { data: orders } = await supabase
    .from('orders')
    .select('id, total_price, status')
    .eq('workspace_id', workspaceId)
    .eq('order_type', 'photo_book')
    .gte('created_at', startDate.toISOString())

  const totalOrders = orders?.length ?? 0
  const totalRevenue = orders?.reduce((sum, order) => sum + (order.total_price ?? 0), 0) ?? 0
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

  // Get funnel metrics
  const { count: coversDesigned } = await supabase
    .from('photo_book_projects')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .not('cover_design', 'is', null)
    .gte('created_at', startDate.toISOString())

  const { count: pdfsGenerated } = await supabase
    .from('renditions')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .eq('rendition_type', 'photo_book')
    .eq('status', 'completed')
    .gte('created_at', startDate.toISOString())

  const conversionRate = totalProjects ? (totalOrders / totalProjects) * 100 : 0

  return {
    totalProjects: totalProjects ?? 0,
    totalOrders,
    totalRevenue,
    conversionRate,
    averageOrderValue,
    projectsCreated: totalProjects ?? 0,
    coversDesigned: coversDesigned ?? 0,
    pdfsGenerated: pdfsGenerated ?? 0,
    ordersPlaced: totalOrders
  }
}

/**
 * Get popular templates
 */
export async function getPopularTemplates(
  workspaceId: string,
  dateRange: DateRange = '30d',
  limit: number = 10
): Promise<TemplatePopularity[]> {
  const supabase = await createClient()
  const startDate = getStartDate(dateRange)

  const { data: projects } = await supabase
    .from('photo_book_projects')
    .select('template_id, template_name, orders(id, total_price)')
    .eq('workspace_id', workspaceId)
    .not('template_id', 'is', null)
    .gte('created_at', startDate.toISOString())

  if (!projects) return []

  // Aggregate by template
  const templateMap = new Map<string, TemplatePopularity>()

  for (const project of projects) {
    const templateId = project.template_id
    const templateName = project.template_name ?? 'Unknown Template'

    if (!templateMap.has(templateId)) {
      templateMap.set(templateId, {
        templateId,
        templateName,
        usage: 0,
        orders: 0,
        revenue: 0
      })
    }

    const template = templateMap.get(templateId)!
    template.usage++

    if (project.orders && Array.isArray(project.orders)) {
      template.orders += project.orders.length
      template.revenue += project.orders.reduce((sum: number, order: any) =>
        sum + (order.total_price ?? 0), 0)
    }
  }

  return Array.from(templateMap.values())
    .sort((a, b) => b.usage - a.usage)
    .slice(0, limit)
}

/**
 * Get orders over time
 */
export async function getOrdersOverTime(
  workspaceId: string,
  dateRange: DateRange = '30d'
): Promise<OrdersOverTime[]> {
  const supabase = await createClient()
  const startDate = getStartDate(dateRange)

  const { data: orders } = await supabase
    .from('orders')
    .select('created_at, total_price')
    .eq('workspace_id', workspaceId)
    .eq('order_type', 'photo_book')
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: true })

  if (!orders) return []

  // Group by date
  const dateMap = new Map<string, { orders: number; revenue: number }>()

  for (const order of orders) {
    const date = new Date(order.created_at).toISOString().split('T')[0]

    if (!dateMap.has(date)) {
      dateMap.set(date, { orders: 0, revenue: 0 })
    }

    const dayData = dateMap.get(date)!
    dayData.orders++
    dayData.revenue += order.total_price ?? 0
  }

  return Array.from(dateMap.entries())
    .map(([date, data]) => ({
      date,
      orders: data.orders,
      revenue: data.revenue
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Get revenue by product (size + binding)
 */
export async function getRevenueByProduct(
  workspaceId: string,
  dateRange: DateRange = '30d'
): Promise<RevenueByProduct[]> {
  const supabase = await createClient()
  const startDate = getStartDate(dateRange)

  const { data: orders } = await supabase
    .from('orders')
    .select('product_config, total_price')
    .eq('workspace_id', workspaceId)
    .eq('order_type', 'photo_book')
    .gte('created_at', startDate.toISOString())

  if (!orders) return []

  // Group by product config
  const productMap = new Map<string, RevenueByProduct>()

  for (const order of orders) {
    const config = order.product_config ?? {}
    const size = config.size ?? 'Unknown'
    const binding = config.binding ?? 'Unknown'
    const key = `${size}-${binding}`

    if (!productMap.has(key)) {
      productMap.set(key, {
        size,
        binding,
        count: 0,
        revenue: 0
      })
    }

    const product = productMap.get(key)!
    product.count++
    product.revenue += order.total_price ?? 0
  }

  return Array.from(productMap.values())
    .sort((a, b) => b.revenue - a.revenue)
}

/**
 * Export analytics data to CSV
 */
export async function exportAnalytics(
  workspaceId: string,
  dateRange: DateRange = '30d'
): Promise<string> {
  const metrics = await getAnalyticsMetrics(workspaceId, dateRange)
  const templates = await getPopularTemplates(workspaceId, dateRange)
  const ordersOverTime = await getOrdersOverTime(workspaceId, dateRange)
  const revenueByProduct = await getRevenueByProduct(workspaceId, dateRange)

  let csv = 'Photo Book Analytics Export\n\n'

  // Metrics section
  csv += 'Metrics\n'
  csv += 'Metric,Value\n'
  csv += `Total Projects,${metrics.totalProjects}\n`
  csv += `Total Orders,${metrics.totalOrders}\n`
  csv += `Total Revenue,$${metrics.totalRevenue.toFixed(2)}\n`
  csv += `Conversion Rate,${metrics.conversionRate.toFixed(2)}%\n`
  csv += `Average Order Value,$${metrics.averageOrderValue.toFixed(2)}\n\n`

  // Popular templates
  csv += 'Popular Templates\n'
  csv += 'Template,Usage,Orders,Revenue\n'
  templates.forEach(t => {
    csv += `${t.templateName},${t.usage},${t.orders},$${t.revenue.toFixed(2)}\n`
  })
  csv += '\n'

  // Orders over time
  csv += 'Orders Over Time\n'
  csv += 'Date,Orders,Revenue\n'
  ordersOverTime.forEach(o => {
    csv += `${o.date},${o.orders},$${o.revenue.toFixed(2)}\n`
  })
  csv += '\n'

  // Revenue by product
  csv += 'Revenue by Product\n'
  csv += 'Size,Binding,Count,Revenue\n'
  revenueByProduct.forEach(p => {
    csv += `${p.size},${p.binding},${p.count},$${p.revenue.toFixed(2)}\n`
  })

  return csv
}

/**
 * Helper: Get start date for date range
 */
function getStartDate(dateRange: DateRange): Date {
  const now = new Date()

  switch (dateRange) {
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    case '90d':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    case '1y':
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
    case 'all':
      return new Date(0)
    default:
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  }
}
