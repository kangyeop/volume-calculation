import { NextRequest, NextResponse } from 'next/server';
import * as shipmentService from '@/lib/services/shipment';

export async function GET() {
  try {
    const result = await shipmentService.findAll('SHIPMENT');
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch shipments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await shipmentService.create(body.name);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create shipment' }, { status: 500 });
  }
}
