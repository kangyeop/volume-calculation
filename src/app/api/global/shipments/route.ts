import { NextRequest, NextResponse } from 'next/server';
import * as globalShipmentService from '@/lib/services/global-shipment';
import { handleApiError } from '@/lib/api-error';

export async function GET() {
  try {
    const result = await globalShipmentService.findAll();
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'GET /global/shipments');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body?.name || typeof body.name !== 'string') {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    const result = await globalShipmentService.create(body.name);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'POST /global/shipments');
  }
}
