import { NextRequest, NextResponse } from 'next/server';
import * as packingService from '@/lib/services/packing';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shipmentId: string; orderId: string }> },
) {
  try {
    const { shipmentId, orderId } = await params;
    const result = await packingService.findByOrderId(shipmentId, orderId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch packing results for order' }, { status: 500 });
  }
}
