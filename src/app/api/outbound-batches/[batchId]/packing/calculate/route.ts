import { NextRequest, NextResponse } from 'next/server';
import * as packingService from '@/lib/services/packing';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> },
) {
  try {
    const { batchId } = await params;
    const body = await request.json();
    const result = await packingService.calculate(batchId, body.groupingOption, body.boxGroupId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to calculate packing' }, { status: 500 });
  }
}
