import { NextRequest, NextResponse } from 'next/server';
import * as shipmentService from '@/lib/services/shipment';
import { handleApiError } from '@/lib/api-error';

export async function GET(request: NextRequest, { params }: { params: Promise<{ shipmentId: string }> }) {
  try {
    const { shipmentId } = await params;
    const result = await shipmentService.findOne(shipmentId);
    if (!result) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'GET /shipments/[shipmentId]');
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ shipmentId: string }> }) {
  try {
    const { shipmentId } = await params;
    const body = await request.json();
    const { note } = body;
    if (note !== undefined && note !== null && typeof note !== 'string') {
      return NextResponse.json({ error: 'Invalid note value' }, { status: 400 });
    }
    const result = await shipmentService.updateNote(shipmentId, note ?? null);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'PATCH /shipments/[shipmentId]');
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ shipmentId: string }> }) {
  try {
    const { shipmentId } = await params;
    await shipmentService.remove(shipmentId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error, 'DELETE /shipments/[shipmentId]');
  }
}
