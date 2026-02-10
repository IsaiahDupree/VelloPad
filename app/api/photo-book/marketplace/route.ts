/**
 * Template Marketplace API
 * @see PB-035: Template Marketplace
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getMarketplaceTemplates,
  type TemplateCategory,
  type TemplateSortOption
} from '@/lib/photo-book/template-marketplace-service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = (searchParams.get('category') as TemplateCategory) ?? 'all'
    const sortBy = (searchParams.get('sortBy') as TemplateSortOption) ?? 'popular'
    const searchQuery = searchParams.get('search') ?? undefined

    const templates = await getMarketplaceTemplates(category, sortBy, searchQuery)

    return NextResponse.json({ templates })
  } catch (error) {
    console.error('Error fetching marketplace templates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    )
  }
}
