import { NextRequest, NextResponse } from 'next/server'
import { getTemplates, createTemplate, type TemplateCategory, type TemplateConfig } from '@/lib/templates'

/**
 * GET /api/templates
 * Get all templates (global + workspace-specific)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const workspaceId = searchParams.get('workspaceId') || undefined
    const category = searchParams.get('category') as TemplateCategory | undefined
    const featuredOnly = searchParams.get('featured') === 'true'

    const templates = await getTemplates({
      workspaceId,
      category,
      featuredOnly
    })

    return NextResponse.json({ templates })
  } catch (error) {
    console.error('Failed to fetch templates:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch templates' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/templates
 * Create a new workspace-specific template
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { workspaceId, name, slug, description, category, config, previewImageUrl, thumbnailUrl } = body

    if (!workspaceId || !name || !slug || !category || !config) {
      return NextResponse.json(
        { error: 'Missing required fields: workspaceId, name, slug, category, config' },
        { status: 400 }
      )
    }

    const template = await createTemplate({
      workspaceId,
      name,
      slug,
      description,
      category,
      config: config as TemplateConfig,
      previewImageUrl,
      thumbnailUrl
    })

    return NextResponse.json({ template }, { status: 201 })
  } catch (error) {
    console.error('Failed to create template:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create template' },
      { status: 500 }
    )
  }
}
