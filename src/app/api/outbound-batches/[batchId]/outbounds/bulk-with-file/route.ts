import { NextRequest, NextResponse } from 'next/server';
import * as outboundService from '@/lib/services/outbound';

export async function POST(request: NextRequest, { params }: { params: Promise<{ batchId: string }> }) {
  try {
    const { batchId } = await params;
    const formData = await request.formData();
    const rawDtos = formData.get('createOutboundDtos');
    const createOutboundDtos = rawDtos
      ? typeof rawDtos === 'string'
        ? JSON.parse(rawDtos)
        : rawDtos
      : [];

    await outboundService.createBulk(batchId, createOutboundDtos);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to bulk create outbounds with file' }, { status: 500 });
  }
}
