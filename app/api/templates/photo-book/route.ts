/**
 * Photo Book Templates API
 * Endpoints for retrieving photo book templates
 *
 * @see PB-007: Photo Book Templates
 */

import { NextResponse } from 'next/server'
import {
  getAllTemplates,
  getTemplateById,
  getPopularTemplates,
  getTemplatesForPhotoCount,
  getRecommendedTemplate,
  TEMPLATE_METADATA
} from '@/src/templates/photo-book'

/**
 * GET /api/templates/photo-book
 * Get all templates or filter by criteria
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const photoCount = searchParams.get('photoCount')
    const templateId = searchParams.get('id')
    const popular = searchParams.get('popular')

    // Get specific template by ID
    if (templateId) {
      const template = getTemplateById(templateId)
      if (!template) {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        )
      }
      return NextResponse.json({ template })
    }

    // Get popular templates
    if (popular) {
      const limit = parseInt(popular) || 4
      const templates = getPopularTemplates(limit)
      return NextResponse.json({ templates })
    }

    // Get templates for photo count
    if (photoCount) {
      const count = parseInt(photoCount)
      if (isNaN(count) || count < 1) {
        return NextResponse.json(
          { error: 'Invalid photo count' },
          { status: 400 }
        )
      }

      const templates = getTemplatesForPhotoCount(count)
      const recommended = getRecommendedTemplate(count)

      return NextResponse.json({
        templates,
        recommended,
        photoCount: count
      })
    }

    // Get all templates
    const templates = getAllTemplates()
    return NextResponse.json({
      templates,
      metadata: TEMPLATE_METADATA
    })
  } catch (error) {
    console.error('Error fetching templates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    )
  }
}
