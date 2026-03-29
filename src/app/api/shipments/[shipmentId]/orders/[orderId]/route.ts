import { NextRequest, NextResponse } from 'next/server';
import * as ordersService from '@/lib/services/orders';
import { handleApiError } from '@/lib/api-error';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shipmentId: string; orderId: string }> },
) {
  try {
    const { shipmentId, orderId } = await params;
    const order = await ordersService.findOne(shipmentId, orderId);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    return handleApiError(error, 'GET /shipments/[shipmentId]/orders/[orderId]');
  }
}
