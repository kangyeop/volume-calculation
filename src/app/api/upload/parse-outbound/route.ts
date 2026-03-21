import { NextRequest, NextResponse } from 'next/server';
import * as uploadService from '@/lib/services/upload';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadService.parseForPreview(buffer, file.name);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to parse outbound file' }, { status: 500 });
  }
}
