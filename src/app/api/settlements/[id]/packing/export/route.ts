import { NextRequest, NextResponse } from 'next/server';
import * as packingService from '@/lib/services/packing';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const buffer = await packingService.exportPackingResults(id);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="settlement_packing_${id}.xlsx"`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to export packing results' }, { status: 500 });
  }
}
