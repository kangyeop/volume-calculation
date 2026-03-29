import { NextRequest, NextResponse } from 'next/server';
import * as shipmentService from '@/lib/services/shipment';
import { handleApiError } from '@/lib/api-error';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ shipmentId: string }> },
) {
  try {
    const { shipmentId } = await params;
    await shipmentService.confirm(shipmentId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, 'POST /shipments/[shipmentId]/confirm');
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ shipmentId: string }> },
) {
  try {
    const { shipmentId } = await params;
    await shipmentService.unconfirm(shipmentId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, 'DELETE /shipments/[shipmentId]/confirm');
  }
}
