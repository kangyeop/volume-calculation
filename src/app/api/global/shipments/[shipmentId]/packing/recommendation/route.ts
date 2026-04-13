import { NextRequest, NextResponse } from 'next/server';
import * as globalPackingService from '@/lib/services/global-packing';
import { handleApiError } from '@/lib/api-error';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shipmentId: string }> },
) {
  try {
    const { shipmentId } = await params;
    const rows = await globalPackingService.getRecommendation(shipmentId);
    if (rows.length === 0) {
      return NextResponse.json(null);
    }
    const unpackableSkus = rows.filter((r) => r.unpackable);
    const totalPallets = rows.reduce((sum, r) => sum + (r.unpackable ? 0 : r.palletCount), 0);
    return NextResponse.json({ totalPallets, unpackableSkus, unmatched: [], rows });
  } catch (error) {
    return handleApiError(error, 'GET /global/shipments/[shipmentId]/packing/recommendation');
  }
}
