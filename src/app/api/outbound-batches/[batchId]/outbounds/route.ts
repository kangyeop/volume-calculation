import { NextRequest, NextResponse } from 'next/server';
import * as outboundService from '@/lib/services/outbound';

export async function GET(request: NextRequest, { params }: { params: Promise<{ batchId: string }> }) {
  try {
    const { batchId } = await params;
    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page');
    const limit = searchParams.get('limit');

    if (page !== undefined && page !== null) {
      const result = await outboundService.findPaginated(
        batchId,
        parseInt(page, 10) || 1,
        parseInt(limit ?? '50', 10),
      );
      return NextResponse.json(result);
    }

    const result = await outboundService.findAll(batchId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch outbounds' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ batchId: string }> }) {
  try {
    const { batchId } = await params;
    const body = await request.json();
    const result = await outboundService.create(batchId, body);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create outbound' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ batchId: string }> }) {
  try {
    const { batchId } = await params;
    await outboundService.removeAll(batchId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete outbounds' }, { status: 500 });
  }
}
