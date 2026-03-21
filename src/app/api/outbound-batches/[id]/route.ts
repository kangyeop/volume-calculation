import { NextRequest, NextResponse } from 'next/server';
import * as outboundBatchService from '@/lib/services/outbound-batch';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await outboundBatchService.findOne(id);
    if (!result) {
      return NextResponse.json({ error: 'Outbound batch not found' }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch outbound batch' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await outboundBatchService.deleteBatch(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete outbound batch' }, { status: 500 });
  }
}
