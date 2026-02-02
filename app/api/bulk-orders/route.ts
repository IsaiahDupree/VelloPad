/**
 * Bulk Orders API
 * Feature: PB-040
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  BulkOrderService,
  VolumeDiscountCalculator,
  generateVolumePricingChart,
  type CreateBulkOrderRequest,
} from '@/lib/bulk-orders'

/**
 * GET /api/bulk-orders
 * List bulk orders for user or get volume pricing
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const userId = searchParams.get('userId')

    // Get volume pricing chart
    if (action === 'pricing') {
      const unitPrice = parseFloat(searchParams.get('unitPrice') || '10')
      const quantities = searchParams.get('quantities')?.split(',').map(Number) || undefined

      const pricingChart = generateVolumePricingChart(unitPrice, quantities)

      return NextResponse.json({
        success: true,
        pricingChart,
      })
    }

    // List orders
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      )
    }

    const service = new BulkOrderService()
    const orders = await service.listForUser(userId)

    return NextResponse.json({
      success: true,
      orders,
    })
  } catch (error: any) {
    console.error('Error in bulk orders API:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/bulk-orders
 * Create a new bulk order
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateBulkOrderRequest = await request.json()

    const service = new BulkOrderService()
    const order = await service.create(body)

    return NextResponse.json({
      success: true,
      order,
    })
  } catch (error: any) {
    console.error('Error creating bulk order:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
