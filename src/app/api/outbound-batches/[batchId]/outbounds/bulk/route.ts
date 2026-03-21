import { NextRequest, NextResponse } from 'next/server';
import * as outboundService from '@/lib/services/outbound';

export async function POST(request: NextRequest, { params }: { params: Promise<{ batchId: string }> }) {
  try {
    const { batchId } = await params;
    const body = await request.json();
    await outboundService.createBulk(batchId, body);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to bulk create outbounds' }, { status: 500 });
  }
}
