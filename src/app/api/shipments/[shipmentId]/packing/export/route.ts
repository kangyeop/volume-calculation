import { NextRequest, NextResponse } from 'next/server';
import * as packingService from '@/lib/services/packing';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shipmentId: string }> },
) {
  try {
    const { shipmentId } = await params;
    const buffer = await packingService.exportPackingResults(shipmentId);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="packing_results_${shipmentId}.xlsx"`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to export packing results' }, { status: 500 });
  }
}
