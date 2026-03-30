import { NextRequest, NextResponse } from 'next/server';
import * as packingService from '@/lib/services/packing';
import type { BoxSortStrategy } from '@/types';
import { handleApiError } from '@/lib/api-error';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const strategy: BoxSortStrategy = body.strategy === 'longest-side' ? 'longest-side' : 'volume';
    const result = await packingService.calculate(id, strategy, { onlyPending: true });
    return NextResponse.json({ packed: result.packed, failed: result.failed });
  } catch (error) {
    if (error instanceof Error && error.message === 'SHIPMENT_CONFIRMED') {
      return NextResponse.json({ error: '확정된 정산건은 재계산할 수 없습니다.' }, { status: 409 });
    }
    return handleApiError(error, 'POST /settlements/[id]/packing/calculate');
  }
}
