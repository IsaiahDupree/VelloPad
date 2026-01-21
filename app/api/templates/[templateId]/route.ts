import { NextRequest, NextResponse } from 'next/server'
import { getTemplate, updateTemplate, deleteTemplate, type TemplateConfig } from '@/lib/templates'

/**
 * GET /api/templates/[templateId]
 * Get a single template by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const { templateId } = await params
    const template = await getTemplate(templateId)

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    return NextResponse.json({ template })
  } catch (error) {
    console.error('Failed to fetch template:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch template' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/templates/[templateId]
 * Update a template
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const { templateId } = await params
    const body = await request.json()
    const { name, description, config, previewImageUrl, thumbnailUrl } = body

    const template = await updateTemplate(templateId, {
      name,
      description,
      config: config as TemplateConfig | undefined,
      previewImageUrl,
      thumbnailUrl
    })

    return NextResponse.json({ template })
  } catch (error) {
    console.error('Failed to update template:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update template' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/templates/[templateId]
 * Delete a template
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const { templateId } = await params
    await deleteTemplate(templateId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete template:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete template' },
      { status: 500 }
    )
  }
}
