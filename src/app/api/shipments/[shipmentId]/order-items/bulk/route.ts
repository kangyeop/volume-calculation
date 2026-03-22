import { NextRequest, NextResponse } from 'next/server';
import * as orderItemService from '@/lib/services/order-item';

export async function POST(request: NextRequest, { params }: { params: Promise<{ shipmentId: string }> }) {
  try {
    const { shipmentId } = await params;
    const body = await request.json();
    await orderItemService.createBulk(shipmentId, body);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to bulk create order items' }, { status: 500 });
  }
}
