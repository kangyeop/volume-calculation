import { NextRequest, NextResponse } from 'next/server';
import * as shipmentService from '@/lib/services/shipment';
import { handleApiError } from '@/lib/api-error';

export async function GET() {
  try {
    const result = await shipmentService.findAll('SHIPMENT');
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'GET /shipments');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await shipmentService.create(body.name);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'POST /shipments');
  }
}
