import { NextRequest, NextResponse } from 'next/server';
import * as packingService from '@/lib/services/packing';
import { handleApiError } from '@/lib/api-error';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const result = await packingService.getRecommendation(id);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'GET /settlements/[id]/packing/recommendation');
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const result = await packingService.updateBoxAssignment(
      id,
      body.items,
      body.newBoxId,
    );
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'PATCH /settlements/[id]/packing/recommendation');
  }
}
