/**
 * Template Detail API
 * @see PB-035: Template Marketplace
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTemplateById, getTemplateReviews } from '@/lib/photo-book/template-marketplace-service'

export async function GET(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  try {
    const supabase = await createClient()

    // Get user if authenticated
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id

    const [template, reviews] = await Promise.all([
      getTemplateById(params.templateId, userId),
      getTemplateReviews(params.templateId)
    ])

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ template, reviews })
  } catch (error) {
    console.error('Error fetching template:', error)
    return NextResponse.json(
      { error: 'Failed to fetch template' },
      { status: 500 }
    )
  }
}
