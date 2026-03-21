import { NextRequest, NextResponse } from 'next/server';
import * as ordersService from '@/lib/services/orders';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string; orderId: string }> },
) {
  try {
    const { batchId, orderId } = await params;
    const volume = await ordersService.calculateVolume(batchId, orderId);
    return NextResponse.json({ success: true, data: { volume, unit: 'CBM' } });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to calculate volume' }, { status: 500 });
  }
}
