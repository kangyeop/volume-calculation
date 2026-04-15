import { NextRequest, NextResponse } from 'next/server';
import * as globalPackingService from '@/lib/services/global-packing';
import { handleApiError } from '@/lib/api-error';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shipmentId: string }> },
) {
  try {
    const { shipmentId } = await params;
    const result = await globalPackingService.getRecommendation(shipmentId);
    if (result.rows.length === 0 && result.mixedPallets.length === 0) {
      return NextResponse.json(null);
    }
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'GET /global/shipments/[shipmentId]/packing/recommendation');
  }
}
