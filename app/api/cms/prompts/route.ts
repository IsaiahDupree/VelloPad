/**
 * GET /api/cms/prompts
 * Fetch prompt library from CMS
 * Features: BS-801 - Headless CMS Integration
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCMSClient } from '@/lib/cms/client'

export async function GET(request: NextRequest) {
  try {
    const cms = getCMSClient()
    const prompts = await cms.getPromptLibrary()

    return NextResponse.json({
      success: true,
      data: prompts,
      total: prompts.length,
    })
  } catch (error) {
    console.error('[API] Error fetching CMS prompts:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch prompts' },
      { status: 500 }
    )
  }
}
