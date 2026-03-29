import { NextRequest, NextResponse } from 'next/server';
import * as orderItemService from '@/lib/services/order-item';
import { handleApiError } from '@/lib/api-error';

export async function GET(request: NextRequest, { params }: { params: Promise<{ shipmentId: string }> }) {
  try {
    const { shipmentId } = await params;
    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page');
    const limit = searchParams.get('limit');

    if (page !== undefined && page !== null) {
      const result = await orderItemService.findPaginated(
        shipmentId,
        parseInt(page, 10) || 1,
        parseInt(limit ?? '50', 10),
      );
      return NextResponse.json(result);
    }

    const result = await orderItemService.findAll(shipmentId);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'GET /shipments/[shipmentId]/order-items');
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ shipmentId: string }> }) {
  try {
    const { shipmentId } = await params;
    const body = await request.json();
    const result = await orderItemService.create(shipmentId, body);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'POST /shipments/[shipmentId]/order-items');
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ shipmentId: string }> }) {
  try {
    const { shipmentId } = await params;
    await orderItemService.removeAll(shipmentId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error, 'DELETE /shipments/[shipmentId]/order-items');
  }
}
