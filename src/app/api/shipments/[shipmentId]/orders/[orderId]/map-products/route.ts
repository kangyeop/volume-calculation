import { NextRequest, NextResponse } from 'next/server';
import * as ordersService from '@/lib/services/orders';
import { handleApiError } from '@/lib/api-error';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ shipmentId: string; orderId: string }> },
) {
  try {
    const { shipmentId, orderId } = await params;
    const count = await ordersService.mapProducts(shipmentId, orderId);
    return NextResponse.json({ success: true, data: { mappedCount: count } });
  } catch (error) {
    return handleApiError(error, 'POST /shipments/[shipmentId]/orders/[orderId]/map-products');
  }
}
