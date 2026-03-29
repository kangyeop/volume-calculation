import { NextResponse } from 'next/server';
import * as shipmentService from '@/lib/services/shipment';
import { handleApiError } from '@/lib/api-error';

export async function GET() {
  try {
    const result = await shipmentService.findAll('SETTLEMENT');
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'GET /settlements');
  }
}
