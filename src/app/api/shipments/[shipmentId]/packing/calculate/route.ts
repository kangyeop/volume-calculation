import { NextRequest, NextResponse } from 'next/server';
import * as packingService from '@/lib/services/packing';
import { handleApiError } from '@/lib/api-error';
import type { BoxSortStrategy } from '@/types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ shipmentId: string }> },
) {
  try {
    const { shipmentId } = await params;
    const body = await request.json().catch(() => ({}));
    const strategy: BoxSortStrategy = body.strategy === 'longest-side' ? 'longest-side' : 'volume';
    const result = await packingService.calculate(shipmentId, strategy);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'POST /shipments/[shipmentId]/packing/calculate');
  }
}
