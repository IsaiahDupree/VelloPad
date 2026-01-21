import { NextRequest, NextResponse } from 'next/server'
import { applyTemplateToBook } from '@/lib/templates'

/**
 * POST /api/books/[id]/template
 * Apply a template to a book
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { templateId } = body

    if (!templateId) {
      return NextResponse.json(
        { error: 'Missing required field: templateId' },
        { status: 400 }
      )
    }

    await applyTemplateToBook(id, templateId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to apply template:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to apply template' },
      { status: 500 }
    )
  }
}
