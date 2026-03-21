import { NextRequest, NextResponse } from 'next/server';
import * as packingService from '@/lib/services/packing';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> },
) {
  try {
    const { batchId } = await params;
    const result = await packingService.getRecommendation(batchId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch recommendation' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> },
) {
  try {
    const { batchId } = await params;
    const body = await request.json();
    const result = await packingService.updateBoxAssignment(
      batchId,
      body.groupIndex,
      body.boxIndex,
      body.newBoxId,
    );
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update box assignment' }, { status: 500 });
  }
}
