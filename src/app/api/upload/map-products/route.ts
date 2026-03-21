import { NextRequest, NextResponse } from 'next/server';
import * as uploadService from '@/lib/services/upload';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await uploadService.mapProducts(body.columnMapping, body.rows);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to map products' }, { status: 500 });
  }
}
