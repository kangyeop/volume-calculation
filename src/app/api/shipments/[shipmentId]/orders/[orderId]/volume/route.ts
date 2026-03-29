import { NextRequest, NextResponse } from 'next/server';
import * as ordersService from '@/lib/services/orders';
import { handleApiError } from '@/lib/api-error';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shipmentId: string; orderId: string }> },
) {
  try {
    const { shipmentId, orderId } = await params;
    const volume = await ordersService.calculateVolume(shipmentId, orderId);
    return NextResponse.json({ success: true, data: { volume, unit: 'CBM' } });
  } catch (error) {
    return handleApiError(error, 'GET /shipments/[shipmentId]/orders/[orderId]/volume');
  }
}
