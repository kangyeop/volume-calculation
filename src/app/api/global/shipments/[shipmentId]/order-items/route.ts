import { NextRequest, NextResponse } from 'next/server';
import * as globalOrderItemService from '@/lib/services/global-order-item';
import { handleApiError } from '@/lib/api-error';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shipmentId: string }> },
) {
  try {
    const { shipmentId } = await params;
    const { searchParams } = new URL(request.url);
    const sku = searchParams.get('sku');

    if (sku) {
      const result = await globalOrderItemService.findBySku(shipmentId, sku);
      return NextResponse.json(result);
    }

    const result = await globalOrderItemService.findAll(shipmentId);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'GET /global/shipments/[shipmentId]/order-items');
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ shipmentId: string }> },
) {
  try {
    const { shipmentId } = await params;
    await globalOrderItemService.removeAll(shipmentId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error, 'DELETE /global/shipments/[shipmentId]/order-items');
  }
}
