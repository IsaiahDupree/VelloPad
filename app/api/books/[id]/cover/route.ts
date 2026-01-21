import { NextRequest, NextResponse } from 'next/server'
import { getCoverDesign, updateCoverDesign, type CoverDesign } from '@/lib/cover'

/**
 * GET /api/books/[id]/cover
 * Get cover design for a book
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const design = await getCoverDesign(id)

    if (!design) {
      return NextResponse.json({ error: 'Cover design not found' }, { status: 404 })
    }

    return NextResponse.json({ design })
  } catch (error) {
    console.error('Failed to fetch cover design:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch cover design' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/books/[id]/cover
 * Update cover design for a book
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const design = body as Partial<CoverDesign>

    await updateCoverDesign(id, design)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to update cover design:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update cover design' },
      { status: 500 }
    )
  }
}
