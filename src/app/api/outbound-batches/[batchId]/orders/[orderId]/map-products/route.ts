import { NextRequest, NextResponse } from 'next/server';
import * as ordersService from '@/lib/services/orders';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string; orderId: string }> },
) {
  try {
    const { batchId, orderId } = await params;
    const count = await ordersService.mapProducts(batchId, orderId);
    return NextResponse.json({ success: true, data: { mappedCount: count } });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to map products' }, { status: 500 });
  }
}
