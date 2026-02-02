/**
 * Brand Kit Detail API
 * Feature: PB-038
 */

import { NextRequest, NextResponse } from 'next/server'
import { BrandKitService } from '@/lib/brand-kit'

/**
 * GET /api/brand-kits/[id]
 * Get brand kit by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const brandKit = await BrandKitService.getById(params.id)

    if (!brandKit) {
      return NextResponse.json(
        { success: false, error: 'Brand kit not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      brandKit,
    })
  } catch (error: any) {
    console.error('Error getting brand kit:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/brand-kits/[id]
 * Update brand kit
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()

    // Validate updates
    const validation = BrandKitService.validate({ ...body, id: params.id })
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, errors: validation.errors },
        { status: 400 }
      )
    }

    const brandKit = await BrandKitService.update(params.id, body)

    return NextResponse.json({
      success: true,
      brandKit,
    })
  } catch (error: any) {
    console.error('Error updating brand kit:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/brand-kits/[id]
 * Delete brand kit
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await BrandKitService.delete(params.id)

    return NextResponse.json({
      success: true,
      message: 'Brand kit deleted',
    })
  } catch (error: any) {
    console.error('Error deleting brand kit:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
