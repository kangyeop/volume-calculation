import { NextRequest, NextResponse } from 'next/server';
import * as globalPackingService from '@/lib/services/global-packing';
import { getUserId } from '@/lib/auth';
import { handleApiError } from '@/lib/api-error';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ shipmentId: string }> },
) {
  try {
    const { shipmentId } = await params;
    const userId = await getUserId();
    const result = await globalPackingService.calculate(userId, shipmentId);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'POST /global/shipments/[shipmentId]/packing/calculate');
  }
}
