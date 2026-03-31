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
    return handleApiError(error, 'POST /settlements/[id]/packing/calculate');
  }
}
