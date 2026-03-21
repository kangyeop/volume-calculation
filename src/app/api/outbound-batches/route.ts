import { NextRequest, NextResponse } from 'next/server';
import * as outboundBatchService from '@/lib/services/outbound-batch';

export async function GET() {
  try {
    const result = await outboundBatchService.findAll();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch outbound batches' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await outboundBatchService.create(body.name);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create outbound batch' }, { status: 500 });
  }
}
