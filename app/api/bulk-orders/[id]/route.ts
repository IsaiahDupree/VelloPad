/**
 * Bulk Order Detail API
 * Feature: PB-040
 */

import { NextRequest, NextResponse } from 'next/server'
import { BulkOrderService } from '@/lib/bulk-orders'

/**
 * GET /api/bulk-orders/[id]
 * Get bulk order by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const service = new BulkOrderService()
    const order = await service.getById(params.id)

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Bulk order not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      order,
    })
  } catch (error: any) {
    console.error('Error getting bulk order:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/bulk-orders/[id]
 * Update bulk order
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const service = new BulkOrderService()
    const order = await service.update(params.id, body)

    return NextResponse.json({
      success: true,
      order,
    })
  } catch (error: any) {
    console.error('Error updating bulk order:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/bulk-orders/[id]/submit
 * Submit bulk order for processing
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const service = new BulkOrderService()
    const order = await service.submit(params.id)

    return NextResponse.json({
      success: true,
      order,
    })
  } catch (error: any) {
    console.error('Error submitting bulk order:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/bulk-orders/[id]
 * Cancel bulk order
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const service = new BulkOrderService()
    const order = await service.cancel(params.id)

    return NextResponse.json({
      success: true,
      order,
    })
  } catch (error: any) {
    console.error('Error cancelling bulk order:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
