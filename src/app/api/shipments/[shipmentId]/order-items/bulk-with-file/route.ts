import { NextRequest, NextResponse } from 'next/server';
import * as orderItemService from '@/lib/services/order-item';
import { handleApiError } from '@/lib/api-error';

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
    return handleApiError(error, 'POST /shipments/[shipmentId]/order-items/bulk-with-file');
  }
}
