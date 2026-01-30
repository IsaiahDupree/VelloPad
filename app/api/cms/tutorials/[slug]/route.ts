/**
 * GET /api/cms/tutorials/[slug]
 * Fetch a specific tutorial from CMS
 * Features: BS-801 - Headless CMS Integration
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCMSClient } from '@/lib/cms/client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    if (!slug) {
      return NextResponse.json(
        { success: false, error: 'Missing slug parameter' },
        { status: 400 }
      )
    }

    const cms = getCMSClient()
    const tutorial = await cms.getTutorial(slug)

    if (!tutorial) {
      return NextResponse.json(
        { success: false, error: 'Tutorial not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: tutorial,
    })
  } catch (error) {
    console.error('[API] Error fetching CMS tutorial:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tutorial' },
      { status: 500 }
    )
  }
}
