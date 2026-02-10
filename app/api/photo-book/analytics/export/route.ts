/**
 * Photo Book Analytics Export API
 * @see PB-045: Photo Book Analytics
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { exportAnalytics, type DateRange } from '@/lib/photo-book/analytics-service'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get workspace ID and date range
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

    // Export analytics
    const csv = await exportAnalytics(workspaceId, dateRange)

    // Return CSV file
    const filename = `photo-book-analytics-${dateRange}-${Date.now()}.csv`

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })
  } catch (error) {
    console.error('Error exporting analytics:', error)
    return NextResponse.json(
      { error: 'Failed to export analytics' },
      { status: 500 }
    )
  }
}
