/**
 * Brand Kits API
 * Feature: PB-038
 */

import { NextRequest, NextResponse } from 'next/server'
import { BrandKitService, type BrandKit } from '@/lib/brand-kit'

/**
 * GET /api/brand-kits
 * List brand kits for current user
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const workspaceId = searchParams.get('workspaceId')

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      )
    }

    let brandKits: BrandKit[]

    if (workspaceId) {
      brandKits = await BrandKitService.listForWorkspace(workspaceId)
    } else {
      brandKits = await BrandKitService.listForUser(userId)
    }

    return NextResponse.json({
      success: true,
      brandKits,
    })
  } catch (error: any) {
    console.error('Error listing brand kits:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/brand-kits
 * Create a new brand kit
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate brand kit
    const validation = BrandKitService.validate(body)
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, errors: validation.errors },
        { status: 400 }
      )
    }

    const brandKit = await BrandKitService.create(body)

    return NextResponse.json({
      success: true,
      brandKit,
    })
  } catch (error: any) {
    console.error('Error creating brand kit:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
