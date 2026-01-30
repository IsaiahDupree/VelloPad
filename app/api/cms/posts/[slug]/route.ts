/**
 * GET /api/cms/posts/[slug]
 * Fetch a specific blog post from CMS
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
    const post = await cms.getPost(slug)

    if (!post) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: post,
    })
  } catch (error) {
    console.error('[API] Error fetching CMS post:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch post' },
      { status: 500 }
    )
  }
}
