import { NextRequest, NextResponse } from 'next/server';
import { assertSettlement } from '@/lib/services/settlement';
import * as shipmentService from '@/lib/services/shipment';
import { handleApiError } from '@/lib/api-error';

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await assertSettlement(id);
    const result = await shipmentService.confirm(id);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return handleApiError(error, 'POST /settlements/[id]/confirm');
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await assertSettlement(id);
    const result = await shipmentService.unconfirm(id);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return handleApiError(error, 'DELETE /settlements/[id]/confirm');
  }
}
