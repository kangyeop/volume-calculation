import { NextRequest, NextResponse } from 'next/server';
import * as orderItemService from '@/lib/services/order-item';

export async function POST(request: NextRequest, { params }: { params: Promise<{ shipmentId: string }> }) {
  try {
    const { shipmentId } = await params;
    const formData = await request.formData();
    const rawDtos = formData.get('createOutboundDtos');
    const createOutboundDtos = rawDtos
      ? typeof rawDtos === 'string'
        ? JSON.parse(rawDtos)
        : rawDtos
      : [];

    await orderItemService.createBulk(shipmentId, createOutboundDtos);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to bulk create order items with file' }, { status: 500 });
  }
}
