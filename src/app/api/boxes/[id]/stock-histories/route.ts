import { NextRequest, NextResponse } from 'next/server';
import * as boxStockHistoriesService from '@/lib/services/box-stock-histories';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const histories = await boxStockHistoriesService.findByBoxId(id);
    return NextResponse.json(histories);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch stock histories' }, { status: 500 });
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
    const status = message.includes('찾을 수 없') ? 404 : message.includes('부족') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
