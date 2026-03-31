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
    return handleApiError(error, 'POST /boxes/[id]/stock-histories');
  }
}
