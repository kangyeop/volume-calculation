import { NextResponse } from 'next/server';
import * as shipmentService from '@/lib/services/shipment';

export async function GET() {
  try {
    const result = await shipmentService.findAll('SETTLEMENT');
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch settlements' }, { status: 500 });
  }
}
