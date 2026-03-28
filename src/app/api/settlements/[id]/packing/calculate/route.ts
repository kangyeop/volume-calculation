import { NextRequest, NextResponse } from 'next/server';
import * as settlementService from '@/lib/services/settlement';
import type { BoxSortStrategy } from '@/types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const strategy: BoxSortStrategy = body.strategy === 'longest-side' ? 'longest-side' : 'volume';
    const result = await settlementService.calculateSettlementPacking(id, strategy);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'SHIPMENT_CONFIRMED') {
      return NextResponse.json({ error: '확정된 정산건은 재계산할 수 없습니다.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to calculate packing' }, { status: 500 });
  }
}
