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

    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim().length === 0) {
        return NextResponse.json({ error: 'Invalid name value' }, { status: 400 });
      }
      const result = await shipmentService.updateName(shipmentId, body.name);
      return NextResponse.json(result);
    }

    if (body.note !== undefined) {
      if (body.note !== null && typeof body.note !== 'string') {
        return NextResponse.json({ error: 'Invalid note value' }, { status: 400 });
      }
      const result = await shipmentService.updateNote(shipmentId, body.note ?? null);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
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
