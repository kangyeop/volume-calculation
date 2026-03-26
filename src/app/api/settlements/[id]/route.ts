import { NextRequest, NextResponse } from 'next/server';
import { findSettlementDetail, assertSettlement } from '@/lib/services/settlement';
import * as shipmentService from '@/lib/services/shipment';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await findSettlementDetail(id);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch settlement' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await assertSettlement(id);
    await shipmentService.remove(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete settlement' }, { status: 500 });
  }
}
