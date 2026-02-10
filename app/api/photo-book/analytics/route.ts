/**
 * Photo Book Analytics API
 * @see PB-045: Photo Book Analytics
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getAnalyticsMetrics,
  getPopularTemplates,
  getOrdersOverTime,
  getRevenueByProduct,
  type DateRange
} from '@/lib/photo-book/analytics-service'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get workspace ID from query or user's default workspace
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')
    const dateRange = (searchParams.get('dateRange') as DateRange) ?? '30d'

    if (!workspaceId) {
      return NextResponse.json({ error: 'Missing workspaceId' }, { status: 400 })
    }

    // Verify workspace access
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('id')
      .eq('id', workspaceId)
      .single()

    if (workspaceError || !workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    // Get all analytics data
    const [metrics, templates, ordersOverTime, revenueByProduct] = await Promise.all([
      getAnalyticsMetrics(workspaceId, dateRange),
      getPopularTemplates(workspaceId, dateRange),
      getOrdersOverTime(workspaceId, dateRange),
      getRevenueByProduct(workspaceId, dateRange)
    ])

    return NextResponse.json({
      metrics,
      templates,
      ordersOverTime,
      revenueByProduct,
      dateRange
    })
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}
