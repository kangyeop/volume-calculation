import { NextRequest, NextResponse } from 'next/server';
import * as globalShipmentService from '@/lib/services/global-shipment';
import { handleApiError } from '@/lib/api-error';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ shipmentId: string }> },
) {
  try {
    const { shipmentId } = await params;
    await globalShipmentService.confirm(shipmentId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, 'POST /global/shipments/[shipmentId]/confirm');
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ shipmentId: string }> },
) {
  try {
    const { shipmentId } = await params;
    await globalShipmentService.unconfirm(shipmentId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, 'DELETE /global/shipments/[shipmentId]/confirm');
  }
}
