import { NextRequest, NextResponse } from 'next/server';
import * as outboundService from '@/lib/services/outbound';

export async function GET(request: NextRequest, { params }: { params: Promise<{ batchId: string }> }) {
  try {
    const { batchId } = await params;
    const result = await outboundService.getConfigurationSummary(batchId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch configuration summary' }, { status: 500 });
  }
}
