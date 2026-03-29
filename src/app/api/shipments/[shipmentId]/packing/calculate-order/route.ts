import { NextRequest, NextResponse } from 'next/server';
import * as packingService from '@/lib/services/packing';
import { handleApiError } from '@/lib/api-error';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ shipmentId: string }> },
) {
  try {
    const { shipmentId } = await params;
    const body = await request.json();
    const result = await packingService.calculateOrderPacking(shipmentId, body.orderId, body.groupLabel);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'POST /shipments/[shipmentId]/packing/calculate-order');
  }
}
