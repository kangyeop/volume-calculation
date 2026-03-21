import { NextRequest, NextResponse } from 'next/server';
import * as productUploadService from '@/lib/services/product-upload';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.groupId) {
      return NextResponse.json({ error: 'groupId is required' }, { status: 400 });
    }
    if (!body.rows || body.rows.length === 0) {
      return NextResponse.json({ error: 'rows are required' }, { status: 400 });
    }
    if (!body.mapping) {
      return NextResponse.json({ error: 'mapping is required' }, { status: 400 });
    }

    const result = await productUploadService.confirmProductUpload(body.groupId, body.rows, body.mapping);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to confirm product upload' }, { status: 500 });
  }
}
