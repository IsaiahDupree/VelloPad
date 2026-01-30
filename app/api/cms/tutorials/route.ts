/**
 * GET /api/cms/tutorials
 * Fetch tutorials from CMS
 * Features: BS-801 - Headless CMS Integration
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCMSClient } from '@/lib/cms/client'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams

    // Parse query parameters
    const category = searchParams.get('category') || undefined
    const tags = searchParams.getAll('tags')
    const featured = searchParams.get('featured') === 'true'
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0
    const search = searchParams.get('search') || undefined

    const cms = getCMSClient()

    const tutorials = await cms.getTutorials({
      category,
      tags: tags.length > 0 ? tags : undefined,
      featured: featured || undefined,
      limit,
      offset,
      search,
    })

    return NextResponse.json({
      success: true,
      data: tutorials,
      pagination: {
        offset,
        limit,
        total: tutorials.length,
      },
    })
  } catch (error) {
    console.error('[API] Error fetching CMS tutorials:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tutorials' },
      { status: 500 }
    )
  }
}
