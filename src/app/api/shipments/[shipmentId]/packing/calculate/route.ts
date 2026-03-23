import { NextRequest, NextResponse } from 'next/server';
import * as packingService from '@/lib/services/packing';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ shipmentId: string }> },
) {
  try {
    const { shipmentId } = await params;
    const result = await packingService.calculate(shipmentId);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'SHIPMENT_CONFIRMED') {
      return NextResponse.json({ error: '확정된 출고건은 재계산할 수 없습니다.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to calculate packing' }, { status: 500 });
  }
}
