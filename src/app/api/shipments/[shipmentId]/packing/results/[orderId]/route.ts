import { NextRequest, NextResponse } from 'next/server';
import * as packingService from '@/lib/services/packing';
import { handleApiError } from '@/lib/api-error';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shipmentId: string; orderId: string }> },
) {
  try {
    const { shipmentId, orderId } = await params;
    const result = await packingService.findByOrderId(shipmentId, orderId);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'GET /shipments/[shipmentId]/packing/results/[orderId]');
  }
}
