import { NextRequest, NextResponse } from 'next/server';
import { assertSettlement } from '@/lib/services/settlement';
import * as shipmentService from '@/lib/services/shipment';

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await assertSettlement(id);
    const result = await shipmentService.confirm(id);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to confirm settlement' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await assertSettlement(id);
    const result = await shipmentService.unconfirm(id);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to unconfirm settlement' }, { status: 500 });
  }
}
