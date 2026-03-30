import { NextRequest, NextResponse } from 'next/server';
import * as packingService from '@/lib/services/packing';
import { handleApiError } from '@/lib/api-error';

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await packingService.calculate(id, 'volume', { onlyPending: true });
    return NextResponse.json({ success: true, data: { packed: result.packed, failed: result.failed } });
  } catch (error) {
    return handleApiError(error, 'POST /settlements/[id]/auto-pack');
  }
}
