import { NextRequest, NextResponse } from 'next/server';
import * as boxStockHistoriesService from '@/lib/services/box-stock-histories';
import { handleApiError } from '@/lib/api-error';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const histories = await boxStockHistoriesService.findByBoxId(id);
    return NextResponse.json(histories);
  } catch (error) {
    return handleApiError(error, 'GET /boxes/[id]/stock-histories');
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const result = await boxStockHistoriesService.create({
      boxId: id,
      type: body.type,
      quantity: body.quantity,
      note: body.note,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create stock history';
    console.error('[API] POST /boxes/[id]/stock-histories:', message);
    const status = message.includes('찾을 수 없') ? 404 : message.includes('부족') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
