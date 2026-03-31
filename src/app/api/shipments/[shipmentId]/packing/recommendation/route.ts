import { NextRequest, NextResponse } from 'next/server';
import * as packingService from '@/lib/services/packing';
import { handleApiError } from '@/lib/api-error';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shipmentId: string }> },
) {
  try {
    const { shipmentId } = await params;
    const result = await packingService.getRecommendation(shipmentId);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'GET /shipments/[shipmentId]/packing/recommendation');
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ shipmentId: string }> },
) {
  try {
    const { shipmentId } = await params;
    const body = await request.json();
    const result = await packingService.updateBoxAssignment(
      shipmentId,
      body.items,
      body.newBoxId,
    );
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'PATCH /shipments/[shipmentId]/packing/recommendation');
  }
}
