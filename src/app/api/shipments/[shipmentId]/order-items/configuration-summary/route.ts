import { NextRequest, NextResponse } from 'next/server';
import * as orderItemService from '@/lib/services/order-item';
import { handleApiError } from '@/lib/api-error';

export async function GET(request: NextRequest, { params }: { params: Promise<{ shipmentId: string }> }) {
  try {
    const { shipmentId } = await params;
    const result = await orderItemService.getConfigurationSummary(shipmentId);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'GET /shipments/[shipmentId]/order-items/configuration-summary');
  }
}
