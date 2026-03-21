import { NextRequest, NextResponse } from 'next/server';
import * as outboundService from '@/lib/services/outbound';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await outboundService.remove(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete outbound' }, { status: 500 });
  }
}
